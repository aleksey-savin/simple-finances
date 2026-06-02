import { createServerFn } from '@tanstack/react-start'

import { and, gte, inArray, isNull } from 'drizzle-orm'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { z } from 'zod'

import { db } from '#/db/index.server'
import { bankTransaction, currentAccount, invoice } from '#/db/schema'
import { fromMoneyCents, toMoneyCents } from '#/lib/invoice-payment'
import { resolveScopedAccountIds } from '#/lib/company-scope'
import type { ProfitabilityMonthPoint, ProfitabilityReportData } from '#/types'
import { getRequest, requireSession } from '#/utils/session.server'

export const profitabilityReportQueryKey = ['profitability-report'] as const

export const profitabilityMonthsOptions = [6, 12, 24] as const
export type ProfitabilityMonths = (typeof profitabilityMonthsOptions)[number]

const profitabilityInputSchema = z.object({
  months: z.union([z.literal(6), z.literal(12), z.literal(24)]).default(12),
})

/** Local 'YYYY-MM' key for a date (groups by calendar month in server-local time). */
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

type MonthBucket = {
  incomeAccrualCents: number
  expenseAccrualCents: number
  incomeCashCents: number
  expenseCashCents: number
  bankNetCents: number
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
        currentBalance: 0,
        hasAccounts: false,
      } satisfies ProfitabilityReportData
    }

    const [accountRows, accrualInvoices, cashInvoices, bankRows] =
      await Promise.all([
        db.query.currentAccount.findMany({
          where: inArray(currentAccount.id, accountIds),
          columns: { balance: true },
        }),

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
        // even when the invoice was created earlier.
        db.query.invoice.findMany({
          where: and(
            inArray(invoice.currentAccountId, accountIds),
            isNull(invoice.archivedAt),
          ),
          columns: { kind: true, amount: true, paidAt: true },
          with: {
            settlements: { columns: { amount: true, settledAt: true } },
          },
        }),

        // Real cash movement for balance reconstruction.
        db.query.bankTransaction.findMany({
          where: and(
            inArray(bankTransaction.currentAccountId, accountIds),
            gte(bankTransaction.bookedAt, windowStart),
          ),
          columns: { direction: true, amount: true, bookedAt: true },
        }),
      ])

    const currentBalance = accountRows.reduce(
      (sum, account) => sum + Number(account.balance),
      0,
    )

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
        bankNetCents: 0,
      })
    }

    const addTo = (key: string, field: keyof MonthBucket, cents: number) => {
      const bucket = buckets.get(key)
      if (bucket) bucket[field] += cents
    }

    // ── Accrual ──────────────────────────────────────────────────────────────

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

    // ── Cash (settlements by settledAt + manual paidAt remainder) ─────────────

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

    // ── Bank net flow ──────────────────────────────────────────────────────────

    for (const tx of bankRows) {
      const cents = toMoneyCents(tx.amount)
      const signed = tx.direction === 'credit' ? cents : -cents
      addTo(monthKey(new Date(tx.bookedAt)), 'bankNetCents', signed)
    }

    // ── Reconstruct balance at the 1st of each month ─────────────────────────
    // balanceAtStart(m) = currentBalance − Σ(bank net flow from m onward)

    const balanceStartByKey = new Map<string, number>()
    let suffixCents = 0
    for (let i = order.length - 1; i >= 0; i--) {
      const bucket = buckets.get(order[i].key)!
      suffixCents += bucket.bankNetCents
      balanceStartByKey.set(
        order[i].key,
        currentBalance - fromMoneyCents(suffixCents),
      )
    }

    const points: ProfitabilityMonthPoint[] = order.map(({ key, date }) => {
      const b = buckets.get(key)!
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
        balanceAtStart: balanceStartByKey.get(key) ?? 0,
      }
    })

    return {
      points,
      currentBalance,
      hasAccounts: true,
    } satisfies ProfitabilityReportData
  })
