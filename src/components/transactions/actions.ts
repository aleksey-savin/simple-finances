import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq, inArray, or } from 'drizzle-orm'
import z from 'zod'

import type { TagItem } from '#/components/ui/tag-picker'
import { db } from '#/db'
import {
  category,
  currentAccount,
  currentAccountUser,
  invoice,
  invoiceTag,
} from '#/db/schema'
import { getPaymentState } from '#/lib/invoice-payment'
import { syncRecurringRulesForAccounts } from '#/lib/recurring'
import { auth } from 'utils/auth'

export const fetchTransactionsData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session || !session.user.id) {
    throw new Error('Не авторизован')
  }

  const userId = session.user.id

  const memberships = await db
    .select({
      currentAccountId: currentAccountUser.currentAccountId,
      role: currentAccountUser.role,
    })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  const accountIds = memberships.map(
    (membership) => membership.currentAccountId,
  )
  const roleByAccountId = new Map(
    memberships.map((membership) => [
      membership.currentAccountId,
      membership.role,
    ]),
  )

  if (accountIds.length === 0) {
    const categories = await db.query.category.findMany({
      where: or(eq(category.createdBy, userId), eq(category.isShared, true)),
    })

    return {
      invoices: [],
      categories,
      accounts: [],
      counterparties: [],
      tagsMap: {} as Partial<Record<string, TagItem[]>>,
      allTags: [] as TagItem[],
      tagTotals: [],
    }
  }

  await syncRecurringRulesForAccounts(accountIds)

  const [invoices, categories, counterparties, accountsData] =
    await Promise.all([
      db.query.invoice.findMany({
        where: inArray(invoice.currentAccountId, accountIds),
        columns: {
          id: true,
          kind: true,
          amount: true,
          description: true,
          categoryId: true,
          currentAccountId: true,
          counterpartyId: true,
          createdAt: true,
          dueDate: true,
          paidAt: true,
          archivedAt: true,
          createdBy: true,
          linkedInvoiceId: true,
        },
        with: {
          category: { columns: { id: true, name: true } },
          counterparty: { columns: { id: true, name: true } },
          currentAccount: { columns: { id: true, name: true } },
          createdByUser: { columns: { id: true, name: true } },
          settlements: {
            columns: { id: true, amount: true, settledAt: true },
            with: {
              bankTransaction: {
                columns: {
                  id: true,
                  amount: true,
                  direction: true,
                  bookedAt: true,
                  description: true,
                  counterpartyNameRaw: true,
                  currentAccountId: true,
                },
                with: {
                  currentAccount: {
                    columns: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.query.category.findMany({
        where: or(eq(category.createdBy, userId), eq(category.isShared, true)),
      }),
      db.query.counterparty.findMany({}),
      db.query.currentAccount.findMany({
        where: inArray(currentAccount.id, accountIds),
        with: {
          members: {
            with: {
              user: { columns: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ])

  const accounts = accountsData.map((account) => ({
    ...account,
    role: roleByAccountId.get(account.id) ?? 'viewer',
  }))

  const normalizedInvoices = invoices.map((item) => {
    const paymentState = getPaymentState({
      amount: item.amount,
      paidAt: item.paidAt,
      settlements: item.settlements,
    })

    return {
      ...item,
      paidAt: paymentState.effectivePaidAt,
      manualPaid: paymentState.manualPaid,
      settledAmount: paymentState.settledAmount,
      outstandingAmount: paymentState.outstandingAmount,
      paymentStatus: paymentState.status,
    }
  })

  const invoiceIds = normalizedInvoices.map((item) => item.id)
  const invoiceTagRows =
    invoiceIds.length > 0
      ? await db.query.invoiceTag.findMany({
          where: inArray(invoiceTag.invoiceId, invoiceIds),
          with: { tag: true },
        })
      : []

  const tagsMap: Partial<Record<string, TagItem[]>> = {}
  for (const row of invoiceTagRows) {
    if (!tagsMap[row.invoiceId]) tagsMap[row.invoiceId] = []
    tagsMap[row.invoiceId]?.push({
      id: row.tag.id,
      name: row.tag.name,
      color: row.tag.color,
    })
  }

  const allTags = await db.query.tag.findMany({
    orderBy: (table, { asc }) => asc(table.name),
  })

  const allInvoiceTags = await db.query.invoiceTag.findMany({
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
      tag: {
        columns: {
          id: true,
        },
      },
    },
  })

  const accountIdSet = new Set(accountIds)
  const tagTotals = allTags
    .map((tag) => {
      const expenseTotal = allInvoiceTags
        .filter(
          (entry) =>
            entry.tag.id === tag.id &&
            entry.invoice.kind === 'payable' &&
            accountIdSet.has(entry.invoice.currentAccountId) &&
            getPaymentState({
              amount: entry.invoice.amount,
              paidAt: entry.invoice.paidAt,
              settlements: entry.invoice.settlements,
            }).status !== 'paid',
        )
        .reduce((sum, entry) => {
          const paymentState = getPaymentState({
            amount: entry.invoice.amount,
            paidAt: entry.invoice.paidAt,
            settlements: entry.invoice.settlements,
          })

          return sum + paymentState.outstandingAmount
        }, 0)

      const incomeTotal = allInvoiceTags
        .filter(
          (entry) =>
            entry.tag.id === tag.id &&
            entry.invoice.kind === 'receivable' &&
            accountIdSet.has(entry.invoice.currentAccountId) &&
            getPaymentState({
              amount: entry.invoice.amount,
              paidAt: entry.invoice.paidAt,
              settlements: entry.invoice.settlements,
            }).status !== 'paid',
        )
        .reduce((sum, entry) => {
          const paymentState = getPaymentState({
            amount: entry.invoice.amount,
            paidAt: entry.invoice.paidAt,
            settlements: entry.invoice.settlements,
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
    .filter((entry) => entry.expenseTotal > 0 || entry.incomeTotal > 0)

  return {
    invoices: normalizedInvoices,
    categories,
    counterparties,
    accounts,
    tagsMap,
    allTags: allTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    tagTotals,
  }
})

const togglePaidSchema = z.object({
  id: z.string(),
  kind: z.enum(['payable', 'receivable']),
  paid: z.boolean(),
})

export const togglePaid = createServerFn({ method: 'POST' })
  .inputValidator(togglePaidSchema)
  .handler(async ({ data }) => {
    await db
      .update(invoice)
      .set({ paidAt: data.paid ? new Date() : null })
      .where(eq(invoice.id, data.id))
  })
