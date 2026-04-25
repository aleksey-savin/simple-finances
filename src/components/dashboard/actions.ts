import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { Cron } from 'croner'
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm'

import { db } from '#/db'
import {
  bankTransaction,
  currentAccount,
  invoice,
  settlement,
} from '#/db/schema'
import { getBlockedServicesByContractIds } from '#/lib/blocked-services'
import { getPaymentState } from '#/lib/invoice-payment'
import { getDueMeta } from '#/components/payables/utils'
import { resolveScopedAccountIds } from '#/lib/company-scope'
import type { DashboardLoaderData } from '#/types'
import { auth } from 'utils/auth'

export const fetchDashboardData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session.user.id) throw new Error('Не авторизован')

  const { accountIds } = await resolveScopedAccountIds(
    session.user.id,
    request.headers,
  )

  const empty = {
    accounts: [],
    totalBalance: 0,
    bankSummary: {
      totalCount: 0,
      totalRemaining: 0,
      incomingRemaining: 0,
      outgoingRemaining: 0,
    },
    monthlyOutlook: {
      receivablesAmount: 0,
      receivablesCount: 0,
      overdueReceivablesAmount: 0,
      overdueReceivablesCount: 0,
      currentReceivablesAmount: 0,
      currentReceivablesCount: 0,
      unissuedInvoicesAmount: 0,
      unissuedInvoicesCount: 0,
      currentMonthIncoming: 0,
      previousPeriodDebt: 0,
      previousPeriodDebtCount: 0,
      overduePreviousPeriodDebt: 0,
      overduePreviousPeriodDebtCount: 0,
      plannedPreviousPeriodRepayment: 0,
      plannedPreviousPeriodRepaymentCount: 0,
      plannedExpenses: 0,
      plannedExpensesCount: 0,
      expensesWithDebt: 0,
      expensesWithDebtCount: 0,
      netWithoutPreviousPeriodDebt: 0,
      netWithPreviousPeriodDebt: 0,
    },
    blockedServices: [],
  } satisfies DashboardLoaderData

  if (accountIds.length === 0) return empty

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )

  const latestImportedAtSql = sql<
    Date | string | null
  >`max(${bankTransaction.bookedAt})`

  const [
    accountsData,
    latestImportedAtRows,
    receivableRows,
    currentMonthPayableRows,
    previousUnpaidPayableRows,
    contractIdsInScopeRows,
  ] = await Promise.all([
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
      columns: {
        id: true,
        name: true,
        bankNameInitials: true,
        balance: true,
      },
    }),

    db
      .select({ id: currentAccount.id, lastImportedAt: latestImportedAtSql })
      .from(currentAccount)
      .leftJoin(
        bankTransaction,
        eq(bankTransaction.currentAccountId, currentAccount.id),
      )
      .where(inArray(currentAccount.id, accountIds))
      .groupBy(currentAccount.id),

    db.query.invoice.findMany({
      where: and(
        inArray(invoice.currentAccountId, accountIds),
        eq(invoice.kind, 'receivable'),
        isNull(invoice.paidAt),
        isNull(invoice.archivedAt),
      ),
      columns: {
        id: true,
        amount: true,
        currentAccountId: true,
        dueDate: true,
        paidAt: true,
      },
      with: {
        settlements: { columns: { amount: true, settledAt: true } },
      },
    }),

    db.query.invoice.findMany({
      where: and(
        inArray(invoice.currentAccountId, accountIds),
        eq(invoice.kind, 'payable'),
        gte(invoice.createdAt, monthStart),
        lte(invoice.createdAt, monthEnd),
        isNull(invoice.archivedAt),
      ),
      columns: {
        id: true,
        amount: true,
        currentAccountId: true,
        dueDate: true,
        paidAt: true,
      },
      with: {
        settlements: { columns: { amount: true, settledAt: true } },
      },
    }),

    db.query.invoice.findMany({
      where: and(
        inArray(invoice.currentAccountId, accountIds),
        eq(invoice.kind, 'payable'),
        lt(invoice.createdAt, monthStart),
        isNull(invoice.archivedAt),
      ),
      columns: {
        id: true,
        amount: true,
        currentAccountId: true,
        dueDate: true,
        paidAt: true,
      },
      with: {
        settlements: { columns: { amount: true, settledAt: true } },
      },
    }),

    db
      .selectDistinct({ contractId: invoice.contractId })
      .from(invoice)
      .where(
        and(
          inArray(invoice.currentAccountId, accountIds),
          isNotNull(invoice.contractId),
        ),
      ),
  ])

  const lastImportedAtByAccountId = new Map(
    latestImportedAtRows.map((row) => [
      row.id,
      serializeDateValue(row.lastImportedAt),
    ]),
  )

  const accounts = accountsData.map((account) => ({
    id: account.id,
    name: account.name,
    bankNameInitials: account.bankNameInitials,
    balance: Number(account.balance),
    lastImportedAt: lastImportedAtByAccountId.get(account.id) ?? null,
  }))

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  // ── Receivables ────────────────────────────────────────────────────────────

  const unpaidReceivables = receivableRows
    .map((row) => ({
      ...row,
      paymentState: getPaymentState({
        amount: row.amount,
        paidAt: row.paidAt,
        settlements: row.settlements,
      }),
    }))
    .filter((row) => row.paymentState.status !== 'paid')

  const receivablesAmount = unpaidReceivables.reduce(
    (sum, row) => sum + row.paymentState.outstandingAmount,
    0,
  )
  const receivablesCount = unpaidReceivables.length
  const overdueReceivableRows = unpaidReceivables.filter((row) =>
    getDueMeta(row.dueDate ? new Date(row.dueDate).toISOString() : null)
      .isOverdue,
  )
  const currentReceivableRows = unpaidReceivables.filter(
    (row) =>
      !getDueMeta(row.dueDate ? new Date(row.dueDate).toISOString() : null)
        .isOverdue,
  )
  const overdueReceivablesAmount = overdueReceivableRows.reduce(
    (sum, row) => sum + row.paymentState.outstandingAmount,
    0,
  )
  const currentReceivablesAmount = currentReceivableRows.reduce(
    (sum, row) => sum + row.paymentState.outstandingAmount,
    0,
  )

  // ── Projected (unissued) receivables from recurring rules ─────────────────

  const projectedIncoming = await buildProjectedReceivablesSummary(
    accountIds,
    monthStart,
    monthEnd,
  )

  const currentMonthIncoming = receivablesAmount + projectedIncoming.amount

  // ── Payables ───────────────────────────────────────────────────────────────

  const currentMonthPayables = currentMonthPayableRows.map((row) => ({
    ...row,
    paymentState: getPaymentState({
      amount: row.amount,
      paidAt: row.paidAt,
      settlements: row.settlements,
    }),
  }))

  const previousUnpaidPayables = previousUnpaidPayableRows
    .map((row) => ({
      ...row,
      paymentState: getPaymentState({
        amount: row.amount,
        paidAt: row.paidAt,
        settlements: row.settlements,
      }),
    }))
    .filter((row) => row.paymentState.status !== 'paid')

  const plannedExpenseRows = currentMonthPayables.filter(
    (row) => row.paymentState.status !== 'paid',
  )
  const plannedExpenses = plannedExpenseRows.reduce(
    (sum, row) => sum + row.paymentState.outstandingAmount,
    0,
  )
  const overduePreviousPeriodDebtRows = previousUnpaidPayables.filter((row) =>
    getDueMeta(row.dueDate ? new Date(row.dueDate).toISOString() : null)
      .isOverdue,
  )
  const plannedPreviousPeriodRepaymentRows = previousUnpaidPayables.filter(
    (row) =>
      !getDueMeta(row.dueDate ? new Date(row.dueDate).toISOString() : null)
        .isOverdue,
  )
  const overduePreviousPeriodDebt = overduePreviousPeriodDebtRows.reduce(
    (sum, row) => sum + row.paymentState.outstandingAmount,
    0,
  )
  const plannedPreviousPeriodRepayment =
    plannedPreviousPeriodRepaymentRows.reduce(
      (sum, row) => sum + row.paymentState.outstandingAmount,
      0,
    )
  const previousPeriodDebt = previousUnpaidPayables.reduce(
    (sum, row) => sum + row.paymentState.outstandingAmount,
    0,
  )
  const expensesWithDebt = plannedExpenses + previousPeriodDebt

  // ── Bank summary ───────────────────────────────────────────────────────────

  const bankSummary = await buildBankSummary(accountIds)
  const blockedServices = await getBlockedServicesByContractIds(
    contractIdsInScopeRows.map((row) => row.contractId),
  )

  return {
    accounts,
    totalBalance,
    bankSummary,
    monthlyOutlook: {
      receivablesAmount,
      receivablesCount,
      overdueReceivablesAmount,
      overdueReceivablesCount: overdueReceivableRows.length,
      currentReceivablesAmount,
      currentReceivablesCount: currentReceivableRows.length,
      unissuedInvoicesAmount: projectedIncoming.amount,
      unissuedInvoicesCount: projectedIncoming.count,
      currentMonthIncoming,
      previousPeriodDebt,
      previousPeriodDebtCount: previousUnpaidPayables.length,
      overduePreviousPeriodDebt,
      overduePreviousPeriodDebtCount: overduePreviousPeriodDebtRows.length,
      plannedPreviousPeriodRepayment,
      plannedPreviousPeriodRepaymentCount:
        plannedPreviousPeriodRepaymentRows.length,
      plannedExpenses,
      plannedExpensesCount: plannedExpenseRows.length,
      expensesWithDebt,
      expensesWithDebtCount:
        plannedExpenseRows.length + previousUnpaidPayables.length,
      netWithoutPreviousPeriodDebt: currentMonthIncoming - plannedExpenses,
      netWithPreviousPeriodDebt:
        currentMonthIncoming - plannedExpenses - previousPeriodDebt,
    },
    blockedServices,
  } satisfies DashboardLoaderData
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function serializeDateValue(value: Date | string | null) {
  if (!value) return null
  return typeof value === 'string' ? value : value.toISOString()
}

async function buildBankSummary(accountIds: string[]) {
  if (accountIds.length === 0) {
    return {
      totalCount: 0,
      totalRemaining: 0,
      incomingRemaining: 0,
      outgoingRemaining: 0,
    }
  }

  const settledAmountSql = sql<string>`
    coalesce(
      (
        select sum(${settlement.amount})
        from ${settlement}
        where ${settlement.bankTransactionId} = ${bankTransaction.id}
      ),
      0
    )
  `

  const rows = await db
    .select({
      id: bankTransaction.id,
      direction: bankTransaction.direction,
      amount: bankTransaction.amount,
      settledAmount: settledAmountSql,
    })
    .from(bankTransaction)
    .innerJoin(
      currentAccount,
      eq(currentAccount.id, bankTransaction.currentAccountId),
    )
    .where(inArray(bankTransaction.currentAccountId, accountIds))
    .orderBy(desc(bankTransaction.bookedAt), desc(bankTransaction.createdAt))

  const unresolvedRows = rows
    .map((row) => ({
      ...row,
      remainingAmount: Math.max(
        Number(row.amount) - Number(row.settledAmount),
        0,
      ),
    }))
    .filter((row) => row.remainingAmount > 0)

  return {
    totalCount: unresolvedRows.length,
    totalRemaining: unresolvedRows.reduce(
      (sum, row) => sum + row.remainingAmount,
      0,
    ),
    incomingRemaining: unresolvedRows
      .filter((row) => row.direction === 'credit')
      .reduce((sum, row) => sum + row.remainingAmount, 0),
    outgoingRemaining: unresolvedRows
      .filter((row) => row.direction === 'debit')
      .reduce((sum, row) => sum + row.remainingAmount, 0),
  }
}

async function buildProjectedReceivablesSummary(
  accountIds: string[],
  monthStart: Date,
  monthEnd: Date,
) {
  if (accountIds.length === 0) return { amount: 0, count: 0 }

  const now = new Date()

  const rules = await db.query.recurringRule.findMany({
    where: (table, { and: andWhere }) =>
      andWhere(
        inArray(table.currentAccountId, accountIds),
        eq(table.type, 'receivable'),
        eq(table.isActive, true),
      ),
    columns: {
      id: true,
      amount: true,
      cronExpression: true,
      dueDaysFromCreation: true,
    },
  })

  let amount = 0
  let count = 0

  for (const rule of rules) {
    try {
      const job = new Cron(rule.cronExpression, { paused: true })
      let after = now > monthStart ? now : monthStart

      for (let guard = 0; guard < 200; guard++) {
        const next = job.nextRun(after)
        if (!next || next > monthEnd) break

        const dueDate =
          rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0
            ? new Date(
                next.getTime() + rule.dueDaysFromCreation * 24 * 60 * 60 * 1000,
              )
            : null

        if (!dueDate || (dueDate >= monthStart && dueDate <= monthEnd)) {
          amount += Number(rule.amount)
          count += 1
        }

        after = new Date(next.getTime() + 1)
      }
    } catch {
      // skip rules with invalid cron expressions
    }
  }

  return { amount, count }
}
