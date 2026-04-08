import { createServerFn } from '@tanstack/react-start'
import { Cron } from 'croner'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import { fetchAccounts } from '#/components/accounts/actions'
import { fetchCompanies } from '#/components/companies/actions'
import { fetchPayables } from '#/components/payables/actions'
import { fetchReceivables } from '#/components/receivables/actions'
import { db } from '#/db'
import {
  bankTransaction,
  currentAccount,
  settlement,
} from '#/db/schema'
import type { DashboardLoaderData } from '#/types'

const dashboardScopeSchema = z.object({
  scope: z.string().optional(),
})

export const fetchDashboardData = createServerFn()
  .inputValidator(dashboardScopeSchema)
  .handler(async ({ data }) => {
  const accountsData = await fetchAccounts()
  const accounts = accountsData.map((account) => ({
    id: account.id,
    name: account.name,
    bankNameInitials: account.bankNameInitials,
    balance: Number(account.balance),
  }))
  const accountIds = accounts.map((account) => account.id)

  if (accountIds.length === 0) {
    return {
      scopes: [
        {
          id: 'personal',
          name: 'Личные',
          kind: 'personal',
          accountCount: 0,
          totalBalance: 0,
        },
      ],
      selectedScopeId: 'personal',
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
        unissuedInvoicesAmount: 0,
        unissuedInvoicesCount: 0,
        currentMonthIncoming: 0,
        previousPeriodDebt: 0,
        previousPeriodDebtCount: 0,
        plannedExpenses: 0,
        plannedExpensesCount: 0,
        expensesWithDebt: 0,
        expensesWithDebtCount: 0,
        netWithoutPreviousPeriodDebt: 0,
        netWithPreviousPeriodDebt: 0,
      },
    } satisfies DashboardLoaderData
  }

  const [companies, payablesData, receivablesData] = await Promise.all([
    fetchCompanies(),
    fetchPayables(),
    fetchReceivables(),
  ])

  const companyAccountIds = new Set(
    companies.flatMap((company) => company.accounts.map((account) => account.id)),
  )
  const personalAccounts = accounts.filter(
    (account) => !companyAccountIds.has(account.id),
  )
  const companyScopes = companies.map((company) => {
    const companyAccounts = accounts.filter((account) =>
      company.accounts.some((item) => item.id === account.id),
    )

    return {
      id: company.id,
      name: company.name,
      kind: 'company' as const,
      accountCount: companyAccounts.length,
      totalBalance: companyAccounts.reduce(
        (sum, account) => sum + account.balance,
        0,
      ),
      accountIds: companyAccounts.map((account) => account.id),
    }
  })
  const scopes = [
    ...companyScopes,
    ...(personalAccounts.length > 0 || companyScopes.length === 0
      ? [
          {
            id: 'personal',
            name: 'Личные',
            kind: 'personal' as const,
            accountCount: personalAccounts.length,
            totalBalance: personalAccounts.reduce(
              (sum, account) => sum + account.balance,
              0,
            ),
            accountIds: personalAccounts.map((account) => account.id),
          },
        ]
      : []),
  ]

  const selectedScope =
    scopes.find((scope) => scope.id === data.scope) ??
    scopes[0]

  const selectedAccountIds = selectedScope?.accountIds ?? []
  const selectedAccountIdSet = new Set(selectedAccountIds)
  const scopedAccounts = accounts.filter((account) =>
    selectedAccountIdSet.has(account.id),
  )
  const scopedReceivables = receivablesData.rows.filter((row) =>
    selectedAccountIdSet.has(row.currentAccountId),
  )
  const scopedCurrentMonthPayables = payablesData.currentMonth.filter((row) =>
    selectedAccountIdSet.has(row.currentAccountId),
  )
  const scopedPreviousUnpaid = payablesData.previousUnpaid.filter((row) =>
    selectedAccountIdSet.has(row.currentAccountId),
  )

  const bankSummary = await buildBankSummary(selectedAccountIds)

  const totalBalance = scopedAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  )

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date()
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)

  const projectedIncoming = await buildProjectedReceivablesSummary(
    selectedAccountIds,
    monthStart,
    monthEnd,
  )

  const currentReceivables = scopedReceivables.reduce(
    (sum, row) => sum + row.outstandingAmount,
    0,
  )
  const receivablesCount = scopedReceivables.length
  const unissuedInvoicesAmount = projectedIncoming.amount
  const unissuedInvoicesCount = projectedIncoming.count
  const currentMonthIncoming = currentReceivables + projectedIncoming.amount

  const previousPeriodDebtRows = scopedPreviousUnpaid
  const previousPeriodDebt = previousPeriodDebtRows.reduce(
    (sum, row) => sum + row.outstandingAmount,
    0,
  )

  const plannedExpenseRows = scopedCurrentMonthPayables.filter(
    (row) => row.paymentStatus !== 'paid',
  )
  const plannedExpenses = plannedExpenseRows.reduce(
    (sum, row) => sum + row.outstandingAmount,
    0,
  )
  const expensesWithDebt = plannedExpenses + previousPeriodDebt

  return {
    scopes: scopes.map(({ accountIds: _, ...scope }) => scope),
    selectedScopeId: selectedScope?.id ?? 'personal',
    accounts: scopedAccounts,
    totalBalance,
    bankSummary,
    monthlyOutlook: {
      receivablesAmount: currentReceivables,
      receivablesCount,
      unissuedInvoicesAmount,
      unissuedInvoicesCount,
      currentMonthIncoming,
      previousPeriodDebt,
      previousPeriodDebtCount: previousPeriodDebtRows.length,
      plannedExpenses,
      plannedExpensesCount: plannedExpenseRows.length,
      expensesWithDebt,
      expensesWithDebtCount:
        plannedExpenseRows.length + previousPeriodDebtRows.length,
      netWithoutPreviousPeriodDebt: currentMonthIncoming - plannedExpenses,
      netWithPreviousPeriodDebt:
        currentMonthIncoming - plannedExpenses - previousPeriodDebt,
    },
  } satisfies DashboardLoaderData
  })

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
      currentAccountId: bankTransaction.currentAccountId,
      currentAccountName: currentAccount.name,
      direction: bankTransaction.direction,
      bookedAt: bankTransaction.bookedAt,
      description: bankTransaction.description,
      counterpartyName: bankTransaction.counterpartyNameRaw,
      amount: bankTransaction.amount,
      settledAmount: settledAmountSql,
    })
    .from(bankTransaction)
    .innerJoin(currentAccount, eq(currentAccount.id, bankTransaction.currentAccountId))
    .where(inArray(bankTransaction.currentAccountId, accountIds))
    .orderBy(desc(bankTransaction.bookedAt), desc(bankTransaction.createdAt))

  const unresolvedRows = rows
    .map((row) => {
      const remainingAmount = Math.max(
        Number(row.amount) - Number(row.settledAmount),
        0,
      )

      return {
        id: row.id,
        currentAccountId: row.currentAccountId,
        currentAccountName: row.currentAccountName,
        direction: row.direction,
        bookedAt: row.bookedAt.toISOString(),
        description: row.description,
        counterpartyName: row.counterpartyName,
        remainingAmount,
      }
    })
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
  if (accountIds.length === 0) {
    return { amount: 0, count: 0 }
  }

  const now = new Date()
  const rules = await db.query.recurringRule.findMany({
    where: (table, { and }) =>
      and(
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

        if (dueDate && dueDate >= monthStart && dueDate <= monthEnd) {
          amount += Number(rule.amount)
          count += 1
        }

        after = new Date(next.getTime() + 1)
      }
    } catch {
      // Skip rules with invalid cron expressions.
    }
  }

  return { amount, count }
}
