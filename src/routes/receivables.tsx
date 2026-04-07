import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq, inArray, isNull } from 'drizzle-orm'

import { ReceivablesPage } from '#/components/receivables/receivables-page'
import type {
  IncomeRow,
  ReceivablesLoaderData,
  TagsMap,
} from '#/components/receivables/types'
import { db } from '#/db'
import {
  clientCounterparty,
  currentAccount,
  currentAccountUser,
  invoiceTag,
} from '#/db/schema'
import { getPaymentState } from '#/lib/invoice-payment'
import { syncRecurringRulesForAccounts } from '#/lib/recurring'
import { auth } from 'utils/auth'

const fetchReceivables = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session || !session.user.id) {
    throw new Error('Не авторизован')
  }

  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, session.user.id))

  const accountIds = memberships.map(
    (membership) => membership.currentAccountId,
  )

  if (accountIds.length === 0) {
    return {
      rows: [],
      accounts: [],
      categories: [],
      counterparties: [],
      tagsMap: {},
      allTags: [],
      tagTotals: [],
    } satisfies ReceivablesLoaderData
  }

  await syncRecurringRulesForAccounts(accountIds)

  const [rawRows, accounts, counterparties] = await Promise.all([
    db.query.invoice.findMany({
      where: (table, { and }) =>
        and(
          inArray(table.currentAccountId, accountIds),
          eq(table.kind, 'receivable'),
          isNull(table.paidAt),
        ),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        counterparty: { columns: { id: true, name: true } },
        settlements: {
          columns: { amount: true, settledAt: true },
        },
      },
      orderBy: (table, { asc }) => asc(table.createdAt),
    }),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
      columns: { id: true, name: true },
    }),
    db.query.counterparty.findMany({ columns: { id: true, name: true } }),
  ])

  const normalizedRows = rawRows
    .map((row) => {
      const paymentState = getPaymentState({
        amount: row.amount,
        paidAt: row.paidAt,
        settlements: row.settlements,
      })

      return {
        id: row.id,
        amount: row.amount,
        description: row.description,
        categoryId: row.categoryId,
        currentAccountId: row.currentAccountId,
        createdAt: row.createdAt.toISOString(),
        dueDate: row.dueDate ? row.dueDate.toISOString() : null,
        paidAt: paymentState.effectivePaidAt?.toISOString() ?? null,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        manualPaid: paymentState.manualPaid,
        settledAmount: paymentState.settledAmount,
        outstandingAmount: paymentState.outstandingAmount,
        paymentStatus: paymentState.status,
        category: row.category,
        currentAccount: row.currentAccount,
        counterpartyId: row.counterpartyId ?? null,
        counterparty: row.counterparty ?? null,
      }
    })
    .filter((row) => row.paymentStatus !== 'paid')

  const counterpartyIds = [
    ...new Set(
      normalizedRows
        .map((row) => row.counterparty?.id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]

  const clientLinks =
    counterpartyIds.length > 0
      ? await db.query.clientCounterparty.findMany({
          where: inArray(clientCounterparty.counterpartyId, counterpartyIds),
          with: {
            client: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: (table, { asc }) => asc(table.createdAt),
        })
      : []

  const clientByCounterpartyId = new Map<string, { id: string; name: string }>()

  for (const link of clientLinks) {
    if (!clientByCounterpartyId.has(link.counterpartyId)) {
      clientByCounterpartyId.set(link.counterpartyId, link.client)
    }
  }

  const rows: IncomeRow[] = normalizedRows.map((row) => ({
    ...row,
    client: row.counterparty
      ? (clientByCounterpartyId.get(row.counterparty.id) ?? null)
      : null,
  }))

  const categoryMap = new Map<string, string>()
  for (const row of rows) {
    categoryMap.set(row.category.id, row.category.name)
  }
  const categories = [...categoryMap.entries()].map(([id, name]) => ({
    id,
    name,
  }))

  const incomeIds = rows.map((row) => row.id)
  const incomeTagRows =
    incomeIds.length > 0
      ? await db.query.invoiceTag.findMany({
          where: inArray(invoiceTag.invoiceId, incomeIds),
          with: { tag: true },
        })
      : []

  const tagsMap: TagsMap = {}
  for (const incomeTag of incomeTagRows) {
    if (!tagsMap[incomeTag.invoiceId]) {
      tagsMap[incomeTag.invoiceId] = []
    }

    tagsMap[incomeTag.invoiceId]?.push({
      id: incomeTag.tag.id,
      name: incomeTag.tag.name,
      color: incomeTag.tag.color,
    })
  }

  const allTags = await db.query.tag.findMany({
    orderBy: (table, { asc }) => asc(table.name),
  })

  const accountIdSet = new Set(accountIds)
  const incomeById = new Map(rows.map((row) => [row.id, row]))
  const allExpenseTags = await db.query.invoiceTag.findMany({
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
      const incomeTotal = incomeTagRows.reduce((sum, incomeTag) => {
        if (incomeTag.tag.id !== tag.id) return sum
        return (
          sum + (incomeById.get(incomeTag.invoiceId)?.outstandingAmount ?? 0)
        )
      }, 0)

      const expenseTotal = allExpenseTags
        .filter((expenseTag) => {
          if (
            expenseTag.tag.id !== tag.id ||
            expenseTag.invoice.kind !== 'payable' ||
            !accountIdSet.has(expenseTag.invoice.currentAccountId)
          ) {
            return false
          }

          const paymentState = getPaymentState({
            amount: expenseTag.invoice.amount,
            paidAt: expenseTag.invoice.paidAt,
            settlements: expenseTag.invoice.settlements,
          })

          return paymentState.status !== 'paid'
        })
        .reduce((sum, expenseTag) => {
          const paymentState = getPaymentState({
            amount: expenseTag.invoice.amount,
            paidAt: expenseTag.invoice.paidAt,
            settlements: expenseTag.invoice.settlements,
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
    rows,
    accounts,
    categories,
    counterparties,
    tagsMap,
    allTags: allTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    tagTotals,
  } satisfies ReceivablesLoaderData
})

function ReceivablesRouteComponent() {
  return <ReceivablesPage {...Route.useLoaderData()} />
}

export const Route = createFileRoute('/receivables')({
  component: ReceivablesRouteComponent,
  loader: () => fetchReceivables(),
})
