import { createServerFn } from '@tanstack/react-start'

import { and, eq, inArray, or, sql } from 'drizzle-orm'
import z from 'zod'

import type { TagItem } from '#/components/ui/tag-picker'
import { db } from '#/db/index.server'
import {
  category,
  counterparty,
  accountTransfer,
  currentAccount,
  currentAccountUser,
  invoice,
  invoiceTag,
} from '#/db/schema'
import { getPaymentState } from '#/lib/invoice-payment'
import {
  getScopedCounterpartyIds,
  resolveScopedAccountIds,
} from '#/lib/company-scope'
import { getRequest, requireSession } from '#/utils/session.server'

export const fetchTransactionsData = createServerFn().handler(async () => {
  const session = await requireSession()
  const userId = session.user.id
  const request = await getRequest()

  const { accountIds, selectedScope } = await resolveScopedAccountIds(
    session.user.id,
    request.headers,
  )

  const memberships =
    accountIds.length > 0
      ? await db
          .select({
            currentAccountId: currentAccountUser.currentAccountId,
            role: currentAccountUser.role,
          })
          .from(currentAccountUser)
          .where(
            and(
              eq(currentAccountUser.userId, userId),
              inArray(currentAccountUser.currentAccountId, accountIds),
            ),
          )
      : []

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
      transfers: [],
      counterparties: [],
      tagsMap: {} as Partial<Record<string, TagItem[]>>,
      allTags: [] as TagItem[],
      tagTotals: [],
    }
  }

  const [invoices, transfers, categories, counterparties, accountsData] =
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
          contractId: true,
        },
        with: {
          category: { columns: { id: true, name: true } },
          contract: {
            columns: { id: true, name: true, number: true, signedAt: true },
            with: {
              contractDocuments: {
                with: {
                  document: { columns: { id: true, name: true } },
                },
              },
            },
          },
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
      db.query.accountTransfer.findMany({
        where: or(
          inArray(accountTransfer.fromAccountId, accountIds),
          inArray(accountTransfer.toAccountId, accountIds),
        ),
        with: {
          fromAccount: { columns: { id: true, name: true } },
          toAccount: { columns: { id: true, name: true } },
          createdByUser: { columns: { id: true, name: true } },
        },
      }),
      db.query.category.findMany({
        where: or(eq(category.createdBy, userId), eq(category.isShared, true)),
      }),
      getScopedCounterpartyIds(userId, selectedScope).then((ids) =>
        ids.length > 0
          ? db.query.counterparty.findMany({
              where: inArray(counterparty.id, ids),
            })
          : [],
      ),
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
    transfers: transfers.map((transfer) => ({
      ...transfer,
      kind: 'transfer' as const,
    })),
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
  paidAt: z.string().nullable(),
})

export const togglePaid = createServerFn({ method: 'POST' })
  .inputValidator(togglePaidSchema)
  .handler(async ({ data }) => {
    await db
      .update(invoice)
      .set({ paidAt: data.paidAt ? new Date(data.paidAt) : null })
      .where(eq(invoice.id, data.id))
  })

const accountTransferInputSchema = z
  .object({
    amount: z.number().min(0.01, 'Минимум 0.01'),
    description: z.string().min(2, 'Минимум 2 символа'),
    fromAccountId: z.string().min(1, 'Выберите счёт списания'),
    toAccountId: z.string().min(1, 'Выберите счёт зачисления'),
    transferredAt: z.string().optional(),
    paidAt: z.string().nullable().optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Выберите разные счета',
    path: ['toAccountId'],
  })

async function assertTransferAccountAccess(
  userId: string,
  fromAccountId: string,
  toAccountId: string,
) {
  const memberships = await db.query.currentAccountUser.findMany({
    where: and(
      eq(currentAccountUser.userId, userId),
      inArray(currentAccountUser.currentAccountId, [
        fromAccountId,
        toAccountId,
      ]),
    ),
  })

  if (memberships.length !== 2) {
    throw new Error('Недостаточно прав для перевода между выбранными счетами')
  }
}

export const addAccountTransfer = createServerFn({ method: 'POST' })
  .inputValidator(accountTransferInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id
    await assertTransferAccountAccess(
      userId,
      data.fromAccountId,
      data.toAccountId,
    )

    const transferredAt = data.transferredAt
      ? new Date(data.transferredAt)
      : new Date()
    const paidAt = data.paidAt ? new Date(data.paidAt) : null
    const amount = data.amount.toFixed(2)

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(accountTransfer)
        .values({
          amount,
          description: data.description,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          transferredAt,
          paidAt,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: accountTransfer.id })

      if (paidAt) {
        await tx
          .update(currentAccount)
          .set({
            balance: sql`${currentAccount.balance} - ${amount}::numeric`,
            updatedBy: userId,
          })
          .where(eq(currentAccount.id, data.fromAccountId))

        await tx
          .update(currentAccount)
          .set({
            balance: sql`${currentAccount.balance} + ${amount}::numeric`,
            updatedBy: userId,
          })
          .where(eq(currentAccount.id, data.toAccountId))
      }

      return inserted.id
    })
  })

const deleteAccountTransferSchema = z.object({ id: z.string() })

export const deleteAccountTransfer = createServerFn({ method: 'POST' })
  .inputValidator(deleteAccountTransferSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id

    const transfer = await db.query.accountTransfer.findFirst({
      where: eq(accountTransfer.id, data.id),
    })
    if (!transfer) return

    await assertTransferAccountAccess(
      userId,
      transfer.fromAccountId,
      transfer.toAccountId,
    )

    await db.transaction(async (tx) => {
      await tx.delete(accountTransfer).where(eq(accountTransfer.id, data.id))

      if (transfer.paidAt) {
        await tx
          .update(currentAccount)
          .set({
            balance: sql`${currentAccount.balance} + ${transfer.amount}::numeric`,
            updatedBy: userId,
          })
          .where(eq(currentAccount.id, transfer.fromAccountId))

        await tx
          .update(currentAccount)
          .set({
            balance: sql`${currentAccount.balance} - ${transfer.amount}::numeric`,
            updatedBy: userId,
          })
          .where(eq(currentAccount.id, transfer.toAccountId))
      }
    })
  })
