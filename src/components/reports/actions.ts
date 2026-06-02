import { createServerFn } from '@tanstack/react-start'

import { and, eq, gte, inArray, isNull } from 'drizzle-orm'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { z } from 'zod'

import { db } from '#/db/index.server'
import { invoice, recurringRule } from '#/db/schema'
import {
  fromMoneyCents,
  getPaymentState,
  toMoneyCents,
} from '#/lib/invoice-payment'
import { ruleOccurrencesInMonth } from '#/components/recurring/utils'
import { resolveScopedAccountIds } from '#/lib/company-scope'
import type { ProfitabilityMonthPoint, ProfitabilityReportData } from '#/types'
import { getRequest, requireSession } from '#/utils/session.server'

export const profitabilityReportQueryKey = ['profitability-report'] as const

export const profitabilityMonthsOptions = [6, 12, 24] as const
export type ProfitabilityMonths = (typeof profitabilityMonthsOptions)[number]

const profitabilityInputSchema = z.object({
  months: z.union([z.literal(6), z.literal(12), z.literal(24)]).default(6),
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Local 'YYYY-MM' key for a date (groups by calendar month in server-local time). */
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function endOfMonth(monthStart: Date) {
  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
}

type MonthBucket = {
  incomeAccrualCents: number
  expenseAccrualCents: number
  incomeCashCents: number
  expenseCashCents: number
}

export const fetchProfitabilityReport = createServerFn()
  .inputValidator(profitabilityInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { accountIds } = await resolveScopedAccountIds(
      session.user.id,
      request.headers,
    )

    const months = data.months
    const now = new Date()
    const windowStart = startOfMonth(subMonths(now, months - 1))

    if (accountIds.length === 0) {
      return {
        points: [],
        hasAccounts: false,
      } satisfies ProfitabilityReportData
    }

    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(currentMonthStart)
    const currentKey = monthKey(currentMonthStart)

    const [accrualInvoices, cashInvoices, activeRules] = await Promise.all([
      // Accrual basis: invoices created within the window.
      db.query.invoice.findMany({
        where: and(
          inArray(invoice.currentAccountId, accountIds),
          isNull(invoice.archivedAt),
          gte(invoice.createdAt, windowStart),
        ),
        columns: { kind: true, amount: true, createdAt: true },
      }),

      // Cash basis: any non-archived invoice — payment may fall in the window
      // even when the invoice was created earlier. Also used for the cash
      // forecast (outstanding amounts due by the end of the current month).
      db.query.invoice.findMany({
        where: and(
          inArray(invoice.currentAccountId, accountIds),
          isNull(invoice.archivedAt),
        ),
        columns: {
          kind: true,
          amount: true,
          paidAt: true,
          dueDate: true,
          createdAt: true,
        },
        with: {
          settlements: { columns: { amount: true, settledAt: true } },
        },
      }),

      // Active recurring rules — projected (not-yet-created) occurrences feed
      // the current-month forecast.
      db.query.recurringRule.findMany({
        where: and(
          inArray(recurringRule.currentAccountId, accountIds),
          eq(recurringRule.isActive, true),
        ),
        columns: {
          type: true,
          amount: true,
          cronExpression: true,
          dueDaysFromCreation: true,
          nextRunAt: true,
        },
      }),
    ])

    // ── Build ordered month buckets (oldest → current) ───────────────────────

    const order: { key: string; date: Date }[] = []
    const buckets = new Map<string, MonthBucket>()

    for (let i = 0; i < months; i++) {
      const date = startOfMonth(subMonths(now, months - 1 - i))
      const key = monthKey(date)
      order.push({ key, date })
      buckets.set(key, {
        incomeAccrualCents: 0,
        expenseAccrualCents: 0,
        incomeCashCents: 0,
        expenseCashCents: 0,
      })
    }

    const addTo = (key: string, field: keyof MonthBucket, cents: number) => {
      const bucket = buckets.get(key)
      if (bucket) bucket[field] += cents
    }

    // ── Accrual (realized) ─────────────────────────────────────────────────────

    for (const inv of accrualInvoices) {
      const key = monthKey(new Date(inv.createdAt))
      const cents = toMoneyCents(inv.amount)
      addTo(
        key,
        inv.kind === 'receivable'
          ? 'incomeAccrualCents'
          : 'expenseAccrualCents',
        cents,
      )
    }

    // ── Cash (realized): settlements by settledAt + manual paidAt remainder ───

    for (const inv of cashInvoices) {
      const field =
        inv.kind === 'receivable' ? 'incomeCashCents' : 'expenseCashCents'

      let settledCents = 0
      for (const s of inv.settlements) {
        const cents = toMoneyCents(s.amount)
        settledCents += cents
        addTo(monthKey(new Date(s.settledAt)), field, cents)
      }

      // Manually-marked-paid invoices: attribute any remainder at paidAt.
      if (inv.paidAt) {
        const remainder = toMoneyCents(inv.amount) - settledCents
        if (remainder > 0)
          addTo(monthKey(new Date(inv.paidAt)), field, remainder)
      }
    }

    // ── Current-month forecast ───────────────────────────────────────────────
    // Accrual: recurring occurrences still to be created this month.
    // Cash: amounts expected by their due date (≤ end of current month) that are
    //       not yet realized — outstanding on existing invoices plus projected
    //       recurring occurrences due this month.

    let plannedIncomeAccrualCents = 0
    let plannedExpenseAccrualCents = 0
    let plannedIncomeCashCents = 0
    let plannedExpenseCashCents = 0

    for (const rule of activeRules) {
      const occurrences = ruleOccurrencesInMonth(
        rule.cronExpression,
        rule.nextRunAt,
        currentMonthStart,
        currentMonthEnd,
      )
      if (occurrences.length === 0) continue

      const amountCents = toMoneyCents(rule.amount)
      const accrualCents = amountCents * occurrences.length

      let cashCount = 0
      for (const occ of occurrences) {
        const due =
          rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0
            ? new Date(occ.getTime() + rule.dueDaysFromCreation * DAY_MS)
            : occ
        if (due >= currentMonthStart && due <= currentMonthEnd) cashCount += 1
      }
      const cashCents = amountCents * cashCount

      if (rule.type === 'receivable') {
        plannedIncomeAccrualCents += accrualCents
        plannedIncomeCashCents += cashCents
      } else if (rule.type === 'payable') {
        plannedExpenseAccrualCents += accrualCents
        plannedExpenseCashCents += cashCents
      }
    }

    // Existing unpaid invoices expected by end of current month (incl. overdue).
    for (const inv of cashInvoices) {
      if (!inv.dueDate) continue
      if (new Date(inv.dueDate) > currentMonthEnd) continue

      const state = getPaymentState({
        amount: inv.amount,
        paidAt: inv.paidAt,
        settlements: inv.settlements,
      })
      if (state.status === 'paid') continue

      const outstandingCents = toMoneyCents(state.outstandingAmount)
      if (outstandingCents <= 0) continue

      if (inv.kind === 'receivable') plannedIncomeCashCents += outstandingCents
      else plannedExpenseCashCents += outstandingCents
    }

    // ── Carried debt at the 1st of each month ────────────────────────────────
    // Outstanding payable obligations as of `at`, reconstructed from when each
    // settlement / manual payment actually happened.

    const payableInvoices = cashInvoices.filter((inv) => inv.kind === 'payable')

    const debtAt = (at: Date) => {
      let cents = 0
      for (const inv of payableInvoices) {
        if (new Date(inv.createdAt) >= at) continue
        if (inv.paidAt && new Date(inv.paidAt) < at) continue

        let settledBefore = 0
        for (const s of inv.settlements) {
          if (new Date(s.settledAt) < at)
            settledBefore += toMoneyCents(s.amount)
        }
        const outstanding = toMoneyCents(inv.amount) - settledBefore
        if (outstanding > 0) cents += outstanding
      }
      return fromMoneyCents(cents)
    }

    const points: ProfitabilityMonthPoint[] = order.map(({ key, date }) => {
      const b = buckets.get(key)!
      const isForecast = key === currentKey
      return {
        month: key,
        label: format(date, 'LLL yyyy', { locale: ru }),
        incomeAccrual: fromMoneyCents(b.incomeAccrualCents),
        expenseAccrual: fromMoneyCents(b.expenseAccrualCents),
        netAccrual: fromMoneyCents(
          b.incomeAccrualCents - b.expenseAccrualCents,
        ),
        incomeCash: fromMoneyCents(b.incomeCashCents),
        expenseCash: fromMoneyCents(b.expenseCashCents),
        netCash: fromMoneyCents(b.incomeCashCents - b.expenseCashCents),
        debt: debtAt(date),
        isForecast,
        plannedIncomeAccrual: isForecast
          ? fromMoneyCents(plannedIncomeAccrualCents)
          : 0,
        plannedExpenseAccrual: isForecast
          ? fromMoneyCents(plannedExpenseAccrualCents)
          : 0,
        plannedIncomeCash: isForecast
          ? fromMoneyCents(plannedIncomeCashCents)
          : 0,
        plannedExpenseCash: isForecast
          ? fromMoneyCents(plannedExpenseCashCents)
          : 0,
      }
    })

    return {
      points,
      hasAccounts: true,
    } satisfies ProfitabilityReportData
  })
