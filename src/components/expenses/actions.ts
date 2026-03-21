import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import { currentAccountUser, expense, income } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'

// ─── Fetch payment accounts ───────────────────────────────────────────────────

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
      .map((m) => m.currentAccount)
      .filter((a) => a.acceptPayments)
      .map((a) => ({ id: a.id, name: a.name }))
  })

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteExpenseSchema = z.object({ id: z.string() })

export const deleteExpense = createServerFn({ method: 'POST' })
  .inputValidator(deleteExpenseSchema)
  .handler(async ({ data }) => {
    // Remove any income that was auto-created from this expense
    await db.delete(income).where(eq(income.linkedExpenseId, data.id))
    await db.delete(expense).where(eq(expense.id, data.id))
  })

// ─── Archive ──────────────────────────────────────────────────────────────────

const archiveExpenseSchema = z.object({ id: z.string(), archive: z.boolean() })

export const archiveExpense = createServerFn({ method: 'POST' })
  .inputValidator(archiveExpenseSchema)
  .handler(async ({ data }) => {
    await db
      .update(expense)
      .set({ archivedAt: data.archive ? new Date() : null })
      .where(eq(expense.id, data.id))
  })

// ─── Add ──────────────────────────────────────────────────────────────────────

export const addExpenseSchema = z.object({
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
  /** ID of the linked user's account that will receive a mirrored income entry */
  paymentAccountId: z.string().optional(),
  /** Category used for the mirrored income entry */
  paymentCategoryId: z.string().optional(),
})

export const addExpense = createServerFn({ method: 'POST' })
  .inputValidator(addExpenseSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date()

    const [inserted] = await db
      .insert(expense)
      .values({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        counterpartyId: data.counterpartyId,
        dueDate,
        createdAt,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: expense.id })

    // If a payment account + category were chosen, create the mirrored income
    // in the counterparty's linked user account atomically.
    if (data.paymentAccountId && data.paymentCategoryId) {
      await db.insert(income).values({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.paymentCategoryId,
        currentAccountId: data.paymentAccountId,
        counterpartyId: data.counterpartyId,
        dueDate,
        createdAt,
        createdBy: session.user.id,
        updatedBy: session.user.id,
        linkedExpenseId: inserted.id,
      })
    }

    return inserted.id
  })

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateExpenseSchema = addExpenseSchema.extend({
  id: z.string(),
})

export const updateExpense = createServerFn({ method: 'POST' })
  .inputValidator(updateExpenseSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    const createdAt = data.createdAt ? new Date(data.createdAt) : undefined

    await db
      .update(expense)
      .set({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        counterpartyId: data.counterpartyId,
        dueDate,
        ...(createdAt && { createdAt }),
        updatedBy: session.user.id,
      })
      .where(eq(expense.id, data.id))

    // Sync mirrored income if one is linked to this expense
    await db
      .update(income)
      .set({
        amount: data.amount.toString(),
        description: data.description,
        dueDate,
        ...(createdAt && { createdAt }),
        updatedBy: session.user.id,
      })
      .where(eq(income.linkedExpenseId, data.id))
  })
