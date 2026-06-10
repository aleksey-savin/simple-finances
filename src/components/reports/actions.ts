import { createServerFn } from '@tanstack/react-start'

import { and, eq, gte, inArray, isNotNull, isNull, or } from 'drizzle-orm'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { z } from 'zod'

import { db } from '#/db/index.server'
import {
  accountTransfer,
  bankTransaction,
  currentAccount,
  invoice,
  recurringRule,
} from '#/db/schema'
import {
  fromMoneyCents,
  getPaymentState,
  invoiceBalanceSign,
  toMoneyCents,
} from '#/lib/invoice-payment'
import { ruleOccurrencesInMonth } from '#/components/recurring/utils'
import { resolveScopedAccountIds } from '#/lib/company-scope'
import type {
  ProfitabilityMonthPoint,
  ProfitabilityReportData,
  ReportBreakdownData,
  ReportBreakdownRow,
} from '#/types'
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

    const [
      accrualInvoices,
      cashInvoices,
      activeRules,
      scopedAccounts,
      balanceBankTxs,
      balancePaidInvoices,
      balanceTransfers,
    ] = await Promise.all([
      // Accrual basis: invoices created within the window.
      // Exclude mirror invoices (linkedInvoiceId set) — they are the
      // "Зачислить доход контрагенту" receivable twin of a payable, i.e. an
      // internal money movement, not real income/expense.
      db.query.invoice.findMany({
        where: and(
          inArray(invoice.currentAccountId, accountIds),
          isNull(invoice.archivedAt),
          isNull(invoice.linkedInvoiceId),
          gte(invoice.createdAt, windowStart),
        ),
        columns: { kind: true, amount: true, createdAt: true },
      }),

      // Cash basis: any non-archived invoice — payment may fall in the window
      // even when the invoice was created earlier. Also used for the cash
      // forecast (outstanding amounts due by the end of the current month).
      // Mirror invoices (linkedInvoiceId set) are excluded for the same reason
      // as the accrual query — they double-count internal transfers.
      db.query.invoice.findMany({
        where: and(
          inArray(invoice.currentAccountId, accountIds),
          isNull(invoice.archivedAt),
          isNull(invoice.linkedInvoiceId),
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

      // ── Balance reconstruction inputs ────────────────────────────────────
      // Current stored balances of the scoped accounts, plus every balance
      // movement since the window start (bank transactions, manual paid
      // invoices, transfers), used to walk the balance back to each month's 1st.
      db.query.currentAccount.findMany({
        where: inArray(currentAccount.id, accountIds),
        columns: { balance: true },
      }),
      db.query.bankTransaction.findMany({
        where: and(
          inArray(bankTransaction.currentAccountId, accountIds),
          gte(bankTransaction.bookedAt, windowStart),
        ),
        columns: { direction: true, amount: true, bookedAt: true },
      }),
      db.query.invoice.findMany({
        where: and(
          inArray(invoice.currentAccountId, accountIds),
          isNotNull(invoice.paidAt),
          gte(invoice.paidAt, windowStart),
        ),
        columns: { kind: true, amount: true, paidAt: true },
        with: { settlements: { columns: { id: true } } },
      }),
      db.query.accountTransfer.findMany({
        where: and(
          or(
            inArray(accountTransfer.fromAccountId, accountIds),
            inArray(accountTransfer.toAccountId, accountIds),
          ),
          isNotNull(accountTransfer.paidAt),
          gte(accountTransfer.paidAt, windowStart),
        ),
        columns: {
          amount: true,
          paidAt: true,
          fromAccountId: true,
          toAccountId: true,
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

    // ── Account balance at the 1st of each month ─────────────────────────────
    // The stored balance is the value as of now; reconstruct each month's
    // opening balance by reversing every balance movement dated on/after the
    // 1st. Mirrors balance maintenance on write: bank transactions (credit +,
    // debit −), manual paid invoices without a settlement (signed by kind, since
    // bank-settled ones were moved by the bank transaction), and transfers
    // (from −, to +).
    const scopedSet = new Set(accountIds)
    const currentBalanceCents = scopedAccounts.reduce(
      (sum, account) => sum + toMoneyCents(account.balance),
      0,
    )

    const balanceAt = (at: Date) => {
      let cents = currentBalanceCents

      for (const tx of balanceBankTxs) {
        if (new Date(tx.bookedAt) < at) continue
        cents -=
          tx.direction === 'credit'
            ? toMoneyCents(tx.amount)
            : -toMoneyCents(tx.amount)
      }

      for (const inv of balancePaidInvoices) {
        if (inv.settlements.length > 0) continue
        if (!inv.paidAt || new Date(inv.paidAt) < at) continue
        cents -= invoiceBalanceSign(inv.kind) * toMoneyCents(inv.amount)
      }

      for (const tr of balanceTransfers) {
        if (!tr.paidAt || new Date(tr.paidAt) < at) continue
        const amount = toMoneyCents(tr.amount)
        if (scopedSet.has(tr.toAccountId)) cents -= amount
        if (scopedSet.has(tr.fromAccountId)) cents += amount
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
        balanceStart: balanceAt(date),
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

// ── Drill-down: the invoices composing a clicked report figure ───────────────

export const reportBreakdownQueryKey = ['report-breakdown'] as const

const reportBreakdownInputSchema = z.object({
  basis: z.enum(['cash', 'accrual']),
  kind: z.enum(['income', 'expense', 'net']),
  // 'YYYY-MM' for a single month, or 'all' for the whole period (stat cards).
  month: z.string(),
  months: z.union([z.literal(6), z.literal(12), z.literal(24)]).default(6),
})

export const fetchReportBreakdown = createServerFn()
  .inputValidator(reportBreakdownInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { accountIds } = await resolveScopedAccountIds(
      session.user.id,
      request.headers,
    )

    if (accountIds.length === 0) {
      return { rows: [] } satisfies ReportBreakdownData
    }

    const now = new Date()
    const windowStart = startOfMonth(subMonths(now, data.months - 1))
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(currentMonthStart)
    const currentKey = monthKey(currentMonthStart)

    const kinds =
      data.kind === 'income'
        ? (['receivable'] as const)
        : data.kind === 'expense'
          ? (['payable'] as const)
          : (['receivable', 'payable'] as const)

    const isAll = data.month === 'all'
    const rangeStart = isAll
      ? windowStart
      : (() => {
          const [year, month] = data.month.split('-').map(Number)
          return new Date(year, month - 1, 1)
        })()
    const rangeEnd = isAll ? currentMonthEnd : endOfMonth(rangeStart)
    const includesCurrentMonth = isAll || data.month === currentKey

    const invoices = await db.query.invoice.findMany({
      where: and(
        inArray(invoice.currentAccountId, accountIds),
        isNull(invoice.archivedAt),
        inArray(invoice.kind, [...kinds]),
      ),
      columns: {
        id: true,
        kind: true,
        amount: true,
        description: true,
        createdAt: true,
        paidAt: true,
        dueDate: true,
      },
      with: {
        category: { columns: { id: true, name: true } },
        counterparty: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        settlements: { columns: { amount: true, settledAt: true } },
      },
    })

    const inRange = (date: Date) => date >= rangeStart && date <= rangeEnd
    const rows: ReportBreakdownRow[] = []

    for (const inv of invoices) {
      const base = {
        id: inv.id,
        kind: inv.kind,
        description: inv.description,
        account: inv.currentAccount,
        category: inv.category,
        counterparty: inv.counterparty,
      }

      if (data.basis === 'accrual') {
        // Accrual: attribute by creation date.
        const created = new Date(inv.createdAt)
        if (inRange(created)) {
          rows.push({
            ...base,
            date: created.toISOString(),
            amount: Number(inv.amount),
            isForecast: false,
          })
        }
        continue
      }

      // Cash: attribute the portion settled / manually paid within the range.
      let totalSettledCents = 0
      let contributedCents = 0
      let paymentDate: Date | null = null
      for (const s of inv.settlements) {
        const cents = toMoneyCents(s.amount)
        totalSettledCents += cents
        const settledAt = new Date(s.settledAt)
        if (inRange(settledAt)) {
          contributedCents += cents
          paymentDate = settledAt
        }
      }
      if (inv.paidAt) {
        const paid = new Date(inv.paidAt)
        if (inRange(paid)) {
          const remainder = toMoneyCents(inv.amount) - totalSettledCents
          if (remainder > 0) {
            contributedCents += remainder
            paymentDate = paid
          }
        }
      }
      if (contributedCents > 0) {
        rows.push({
          ...base,
          date: (paymentDate ?? new Date(inv.createdAt)).toISOString(),
          amount: fromMoneyCents(contributedCents),
          isForecast: false,
        })
      }
    }

    // Cash forecast: outstanding unpaid invoices expected by the end of the
    // current month (matches the report's planned-cash bucket). Accrual's
    // forecast is recurring-only and has no invoice to itemize.
    if (data.basis === 'cash' && includesCurrentMonth) {
      for (const inv of invoices) {
        if (!inv.dueDate) continue
        if (new Date(inv.dueDate) > currentMonthEnd) continue
        const state = getPaymentState({
          amount: inv.amount,
          paidAt: inv.paidAt,
          settlements: inv.settlements,
        })
        if (state.status === 'paid') continue
        if (state.outstandingAmount <= 0) continue
        rows.push({
          id: inv.id,
          kind: inv.kind,
          description: inv.description,
          account: inv.currentAccount,
          category: inv.category,
          counterparty: inv.counterparty,
          date: new Date(inv.dueDate).toISOString(),
          amount: state.outstandingAmount,
          isForecast: true,
        })
      }
    }

    return { rows } satisfies ReportBreakdownData
  })
