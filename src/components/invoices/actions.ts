import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { currentAccountUser, invoice } from '@/db/schema'
import { auth } from 'utils/auth'

export const fetchPaymentAccounts = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ linkedUserId: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

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
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
  paymentAccountId: z.string().optional(),
  paymentCategoryId: z.string().optional(),
  contractId: z.string().optional(),
})

function requireSessionUser(headers: Headers) {
  return auth.api.getSession({ headers }).then((session) => {
    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    return session.user.id
  })
}

export const addInvoice = createServerFn({ method: 'POST' })
  .inputValidator(invoiceInputSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const userId = await requireSessionUser(request.headers)

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date()

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(invoice)
        .values({
          kind: data.kind,
          amount: data.amount.toString(),
          description: data.description,
          categoryId: data.categoryId,
          currentAccountId: data.currentAccountId,
          counterpartyId: data.counterpartyId,
          contractId: data.contractId,
          dueDate,
          createdAt,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: invoice.id })

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
          createdAt,
          linkedInvoiceId: inserted.id,
          createdBy: userId,
          updatedBy: userId,
        })
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
    const request = getRequest()
    const userId = await requireSessionUser(request.headers)

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    const createdAt = data.createdAt ? new Date(data.createdAt) : undefined

    await db
      .update(invoice)
      .set({
        kind: data.kind,
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        counterpartyId: data.counterpartyId,
        contractId: data.contractId ?? null,
        dueDate,
        ...(createdAt && { createdAt }),
        updatedBy: userId,
      })
      .where(eq(invoice.id, data.id))

    if (data.kind === 'payable') {
      await db
        .update(invoice)
        .set({
          amount: data.amount.toString(),
          description: data.description,
          dueDate,
          ...(createdAt && { createdAt }),
          updatedBy: userId,
        })
        .where(
          and(
            eq(invoice.linkedInvoiceId, data.id),
            eq(invoice.kind, 'receivable'),
          ),
        )
    }
  })

const deleteInvoiceSchema = z.object({ id: z.string() })

export const deleteInvoice = createServerFn({ method: 'POST' })
  .inputValidator(deleteInvoiceSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireSessionUser(request.headers)

    await db.transaction(async (tx) => {
      await tx.delete(invoice).where(eq(invoice.linkedInvoiceId, data.id))
      await tx.delete(invoice).where(eq(invoice.id, data.id))
    })
  })

const archiveInvoiceSchema = z.object({ id: z.string(), archive: z.boolean() })

export const archiveInvoice = createServerFn({ method: 'POST' })
  .inputValidator(archiveInvoiceSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireSessionUser(request.headers)

    await db
      .update(invoice)
      .set({ archivedAt: data.archive ? new Date() : null })
      .where(eq(invoice.id, data.id))
  })
