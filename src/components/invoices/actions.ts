import { createServerFn } from '@tanstack/react-start'

import { and, eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { db } from '#/db/index.server'
import { currentAccount, currentAccountUser, invoice } from '@/db/schema'
import { invoiceBalanceSign } from '#/lib/invoice-payment'
import { requireSession } from '#/utils/session.server'

export const fetchPaymentAccounts = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ linkedUserId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

    const memberships = await db.query.currentAccountUser.findMany({
      where: eq(currentAccountUser.userId, data.linkedUserId),
      with: {
        currentAccount: {
          columns: { id: true, name: true, acceptPayments: true },
        },
      },
    })

    return memberships
      .map((membership) => membership.currentAccount)
      .filter((account) => account.acceptPayments)
      .map((account) => ({ id: account.id, name: account.name }))
  })

export const invoiceInputSchema = z.object({
  kind: z.enum(['payable', 'receivable']),
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().optional(),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
  paidAt: z.string().nullable().optional(),
  paymentAccountId: z.string().optional(),
  paymentCategoryId: z.string().optional(),
  contractId: z.string().optional(),
})

async function requireSessionUser() {
  const session = await requireSession()
  return session.user.id
}

type BalanceTx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0]

/**
 * Shift a current account's stored running balance by a signed delta.
 *
 * The balance is a stored field, not computed on the fly, so every code path
 * that "moves money" has to keep it in sync. Manual invoices only contribute
 * to it when paid AND not backed by a bank settlement — bank import already
 * moved the balance for settled invoices, so counting them here would double up.
 */
async function shiftAccountBalance(
  tx: BalanceTx,
  accountId: string,
  delta: number,
  userId: string,
) {
  if (delta === 0) return

  await tx
    .update(currentAccount)
    .set({
      balance: sql`${currentAccount.balance} + ${delta.toFixed(2)}::numeric`,
      updatedBy: userId,
    })
    .where(eq(currentAccount.id, accountId))
}

export const addInvoice = createServerFn({ method: 'POST' })
  .inputValidator(invoiceInputSchema)
  .handler(async ({ data }) => {
    const userId = await requireSessionUser()

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
    const paidAt = data.paidAt ? new Date(data.paidAt) : null

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(invoice)
        .values({
          kind: data.kind,
          amount: data.amount.toString(),
          description: data.description,
          categoryId: data.categoryId ?? null,
          currentAccountId: data.currentAccountId,
          counterpartyId: data.counterpartyId,
          contractId: data.contractId,
          dueDate,
          paidAt,
          createdAt,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: invoice.id })

      // A freshly created invoice has no settlements yet, so a paid one always
      // moves the running balance.
      if (paidAt) {
        await shiftAccountBalance(
          tx,
          data.currentAccountId,
          invoiceBalanceSign(data.kind) * data.amount,
          userId,
        )
      }

      if (
        data.kind === 'payable' &&
        data.paymentAccountId &&
        data.paymentCategoryId
      ) {
        await tx.insert(invoice).values({
          kind: 'receivable',
          amount: data.amount.toString(),
          description: data.description,
          categoryId: data.paymentCategoryId,
          currentAccountId: data.paymentAccountId,
          counterpartyId: data.counterpartyId,
          dueDate,
          paidAt,
          createdAt,
          linkedInvoiceId: inserted.id,
          createdBy: userId,
          updatedBy: userId,
        })

        if (paidAt) {
          await shiftAccountBalance(
            tx,
            data.paymentAccountId,
            invoiceBalanceSign('receivable') * data.amount,
            userId,
          )
        }
      }

      return inserted.id
    })
  })

export const updateInvoiceSchema = invoiceInputSchema.extend({
  id: z.string(),
})

export const updateInvoice = createServerFn({ method: 'POST' })
  .inputValidator(updateInvoiceSchema)
  .handler(async ({ data }) => {
    const userId = await requireSessionUser()

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    const createdAt = data.createdAt ? new Date(data.createdAt) : undefined
    const paidAt = data.paidAt ? new Date(data.paidAt) : null

    await db.transaction(async (tx) => {
      const existing = await tx.query.invoice.findFirst({
        where: eq(invoice.id, data.id),
        with: { settlements: { columns: { id: true } } },
      })

      if (!existing) {
        throw new Error('Документ не найден')
      }

      // Revert the old contribution, then apply the new one. Settlements aren't
      // touched here, so a bank-backed invoice contributes 0 both ways and its
      // balance stays owned by the bank import.
      if (existing.settlements.length === 0 && existing.paidAt) {
        await shiftAccountBalance(
          tx,
          existing.currentAccountId,
          -invoiceBalanceSign(existing.kind) * Number(existing.amount),
          userId,
        )
      }

      await tx
        .update(invoice)
        .set({
          kind: data.kind,
          amount: data.amount.toString(),
          description: data.description,
          categoryId: data.categoryId ?? null,
          currentAccountId: data.currentAccountId,
          counterpartyId: data.counterpartyId,
          contractId: data.contractId ?? null,
          dueDate,
          paidAt,
          ...(createdAt && { createdAt }),
          updatedBy: userId,
        })
        .where(eq(invoice.id, data.id))

      if (existing.settlements.length === 0 && paidAt) {
        await shiftAccountBalance(
          tx,
          data.currentAccountId,
          invoiceBalanceSign(data.kind) * data.amount,
          userId,
        )
      }

      if (data.kind === 'payable') {
        const mirror = await tx.query.invoice.findFirst({
          where: and(
            eq(invoice.linkedInvoiceId, data.id),
            eq(invoice.kind, 'receivable'),
          ),
          with: { settlements: { columns: { id: true } } },
        })

        if (mirror) {
          // The mirror's account never changes on update, so revert/apply land
          // on the same account.
          if (mirror.settlements.length === 0 && mirror.paidAt) {
            await shiftAccountBalance(
              tx,
              mirror.currentAccountId,
              -invoiceBalanceSign('receivable') * Number(mirror.amount),
              userId,
            )
          }

          await tx
            .update(invoice)
            .set({
              amount: data.amount.toString(),
              description: data.description,
              dueDate,
              paidAt,
              ...(createdAt && { createdAt }),
              updatedBy: userId,
            })
            .where(eq(invoice.id, mirror.id))

          if (mirror.settlements.length === 0 && paidAt) {
            await shiftAccountBalance(
              tx,
              mirror.currentAccountId,
              invoiceBalanceSign('receivable') * data.amount,
              userId,
            )
          }
        }
      }
    })
  })

const deleteInvoiceSchema = z.object({ id: z.string() })

export const deleteInvoice = createServerFn({ method: 'POST' })
  .inputValidator(deleteInvoiceSchema)
  .handler(async ({ data }) => {
    const userId = await requireSessionUser()

    await db.transaction(async (tx) => {
      const rows = await tx.query.invoice.findMany({
        where: or(
          eq(invoice.id, data.id),
          eq(invoice.linkedInvoiceId, data.id),
        ),
        with: { settlements: { columns: { id: true } } },
      })

      // Revert the running-balance contribution of any paid, non-settled row
      // before it disappears.
      for (const row of rows) {
        if (row.settlements.length === 0 && row.paidAt) {
          await shiftAccountBalance(
            tx,
            row.currentAccountId,
            -invoiceBalanceSign(row.kind) * Number(row.amount),
            userId,
          )
        }
      }

      await tx.delete(invoice).where(eq(invoice.linkedInvoiceId, data.id))
      await tx.delete(invoice).where(eq(invoice.id, data.id))
    })
  })

const archiveInvoiceSchema = z.object({ id: z.string(), archive: z.boolean() })

export const archiveInvoice = createServerFn({ method: 'POST' })
  .inputValidator(archiveInvoiceSchema)
  .handler(async ({ data }) => {
    await requireSessionUser()

    await db
      .update(invoice)
      .set({ archivedAt: data.archive ? new Date() : null })
      .where(eq(invoice.id, data.id))
  })
