import { createServerFn } from '@tanstack/react-start'

import { Cron } from 'croner'
import { and, eq, gte, inArray, isNull, lt, lte } from 'drizzle-orm'

import type {
  ExpenseRow,
  PayablesLoaderData,
  TagsMap,
} from '#/components/payables/types'
import { db } from '#/db'
import {
  counterparty,
  currentAccount,
  invoice,
  invoiceTag,
  recurringRule,
} from '#/db/schema'
import {
  getScopedCounterpartyIds,
  resolveScopedAccountIds,
} from '#/lib/company-scope'
import { getPaymentState } from '#/lib/invoice-payment'
import { getRequest, requireSession } from 'utils/session'

export const fetchPayables = createServerFn().handler(async () => {
  const session = await requireSession()
  const request = await getRequest()

  const { accountIds, selectedScope } = await resolveScopedAccountIds(
    session.user.id,
    request.headers,
  )

  if (accountIds.length === 0) {
    return {
      currentMonth: [],
      previousUnpaid: [],
      accounts: [],
      categories: [],
      counterparties: [],
      monthLabel: '',
      tagsMap: {},
      allTags: [],
      tagTotals: [],
    } satisfies PayablesLoaderData
  }

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
  const monthLabel = now.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  const baseWithRelations = {
    category: { columns: { id: true as const, name: true as const } },
    currentAccount: { columns: { id: true as const, name: true as const } },
    counterparty: { columns: { id: true as const, name: true as const } },
  }
  const invoiceWithRelations = {
    ...baseWithRelations,
    settlements: {
      columns: { amount: true as const, settledAt: true as const },
    },
  }

  const [
    realCurrentMonth,
    previousUnpaidRaw,
    activeRules,
    accounts,
    counterparties,
  ] = await Promise.all([
    db.query.invoice.findMany({
      where: and(
        inArray(invoice.currentAccountId, accountIds),
        eq(invoice.kind, 'payable'),
        gte(invoice.createdAt, monthStart),
        lte(invoice.createdAt, monthEnd),
        isNull(invoice.archivedAt),
      ),
      with: invoiceWithRelations,
      orderBy: (table, { asc }) => asc(table.createdAt),
    }),
    db.query.invoice.findMany({
      where: and(
        inArray(invoice.currentAccountId, accountIds),
        eq(invoice.kind, 'payable'),
        lt(invoice.createdAt, monthStart),
        isNull(invoice.archivedAt),
      ),
      with: invoiceWithRelations,
      orderBy: (table, { asc }) => asc(table.createdAt),
    }),
    db.query.recurringRule.findMany({
      where: and(
        inArray(recurringRule.currentAccountId, accountIds),
        eq(recurringRule.type, 'payable'),
        eq(recurringRule.isActive, true),
      ),
      with: baseWithRelations,
    }),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
      columns: { id: true, name: true },
    }),
    getScopedCounterpartyIds(session.user.id, selectedScope).then((ids) =>
      ids.length > 0
        ? db.query.counterparty.findMany({
            where: inArray(counterparty.id, ids),
            columns: { id: true, name: true },
          })
        : [],
    ),
  ])

  const projected: ExpenseRow[] = []

  for (const rule of activeRules) {
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

        projected.push({
          id: `projected::${rule.id}::${next.getTime()}`,
          periodGroup: 'current-month',
          amount: rule.amount,
          description: rule.description,
          categoryId: rule.categoryId,
          currentAccountId: rule.currentAccountId,
          createdAt: next.toISOString(),
          dueDate: dueDate?.toISOString() ?? null,
          paidAt: null,
          archivedAt: null,
          manualPaid: false,
          settledAmount: 0,
          outstandingAmount: Number(rule.amount),
          paymentStatus: 'unpaid',
          category: rule.category,
          currentAccount: rule.currentAccount,
          counterpartyId: rule.counterpartyId ?? null,
          counterparty: rule.counterparty ?? null,
          isProjected: true,
        })

        after = new Date(next.getTime() + 1)
      }
    } catch {
      // Skip rules with invalid cron expressions.
    }
  }

  const toRow = (record: (typeof realCurrentMonth)[number]): ExpenseRow => {
    const paymentState = getPaymentState({
      amount: record.amount,
      paidAt: record.paidAt,
      settlements: record.settlements,
    })

    return {
      id: record.id,
      periodGroup: 'current-month',
      amount: record.amount,
      description: record.description,
      categoryId: record.categoryId,
      currentAccountId: record.currentAccountId,
      createdAt: record.createdAt.toISOString(),
      dueDate: record.dueDate ? record.dueDate.toISOString() : null,
      paidAt: paymentState.effectivePaidAt?.toISOString() ?? null,
      archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
      manualPaid: paymentState.manualPaid,
      settledAmount: paymentState.settledAmount,
      outstandingAmount: paymentState.outstandingAmount,
      paymentStatus: paymentState.status,
      category: record.category,
      currentAccount: record.currentAccount,
      counterpartyId: record.counterpartyId ?? null,
      counterparty: record.counterparty ?? null,
      isProjected: false,
    }
  }

  const currentMonth: ExpenseRow[] = [
    ...realCurrentMonth.map((record) => toRow(record)),
    ...projected,
  ].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )

  const previousUnpaid = previousUnpaidRaw
    .map((record) => ({
      ...toRow(record),
      periodGroup: 'previous-periods' as const,
    }))
    .filter((row) => row.paymentStatus !== 'paid')

  const categoryMap = new Map<string, string>()
  for (const row of [...currentMonth, ...previousUnpaid]) {
    categoryMap.set(row.category.id, row.category.name)
  }
  const categories = [...categoryMap.entries()].map(([id, name]) => ({
    id,
    name,
  }))

  const realIds = [
    ...realCurrentMonth.map((record) => record.id),
    ...previousUnpaidRaw.map((record) => record.id),
  ]

  const expenseTagRows =
    realIds.length > 0
      ? await db.query.invoiceTag.findMany({
          where: inArray(invoiceTag.invoiceId, realIds),
          with: { tag: true },
        })
      : []

  const tagsMap: TagsMap = {}
  for (const expenseTag of expenseTagRows) {
    if (!tagsMap[expenseTag.invoiceId]) {
      tagsMap[expenseTag.invoiceId] = []
    }

    tagsMap[expenseTag.invoiceId]?.push({
      id: expenseTag.tag.id,
      name: expenseTag.tag.name,
      color: expenseTag.tag.color,
    })
  }

  const allTags = await db.query.tag.findMany({
    orderBy: (table, { asc }) => asc(table.name),
  })

  const accountIdSet = new Set(accountIds)
  const expenseById = new Map(
    [...realCurrentMonth, ...previousUnpaidRaw].map((record) => [
      record.id,
      record,
    ]),
  )

  const allIncomeTags = await db.query.invoiceTag.findMany({
    with: {
      invoice: {
        columns: {
          amount: true,
          currentAccountId: true,
          paidAt: true,
          kind: true,
        },
        with: {
          settlements: {
            columns: { amount: true, settledAt: true },
          },
        },
      },
      tag: { columns: { id: true } },
    },
  })

  const tagTotals = allTags
    .map((tag) => {
      const expenseTotal = expenseTagRows
        .filter((expenseTag) => {
          const expense = expenseById.get(expenseTag.invoiceId)

          return (
            expenseTag.tag.id === tag.id &&
            expense !== undefined &&
            accountIdSet.has(expense.currentAccountId)
          )
        })
        .reduce((sum, expenseTag) => {
          const expense = expenseById.get(expenseTag.invoiceId)
          if (!expense) return sum

          const paymentState = getPaymentState({
            amount: expense.amount,
            paidAt: expense.paidAt,
            settlements: expense.settlements,
          })

          return sum + paymentState.outstandingAmount
        }, 0)

      const incomeTotal = allIncomeTags
        .filter((incomeTag) => {
          if (
            incomeTag.tag.id !== tag.id ||
            incomeTag.invoice.kind !== 'receivable' ||
            !accountIdSet.has(incomeTag.invoice.currentAccountId)
          ) {
            return false
          }

          const paymentState = getPaymentState({
            amount: incomeTag.invoice.amount,
            paidAt: incomeTag.invoice.paidAt,
            settlements: incomeTag.invoice.settlements,
          })

          return paymentState.status !== 'paid'
        })
        .reduce((sum, incomeTag) => {
          const paymentState = getPaymentState({
            amount: incomeTag.invoice.amount,
            paidAt: incomeTag.invoice.paidAt,
            settlements: incomeTag.invoice.settlements,
          })

          return sum + paymentState.outstandingAmount
        }, 0)

      return {
        tag: { id: tag.id, name: tag.name, color: tag.color },
        expenseTotal,
        incomeTotal,
        net: incomeTotal - expenseTotal,
      }
    })
    .filter((total) => total.expenseTotal > 0 || total.incomeTotal > 0)

  return {
    currentMonth,
    previousUnpaid,
    accounts,
    categories,
    counterparties,
    monthLabel,
    tagsMap,
    allTags: allTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    tagTotals,
  } satisfies PayablesLoaderData
})
