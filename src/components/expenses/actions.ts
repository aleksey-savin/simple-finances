import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import { expense } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteExpenseSchema = z.object({ id: z.string() })

export const deleteExpense = createServerFn({ method: 'POST' })
  .inputValidator(deleteExpenseSchema)
  .handler(async ({ data }) => {
    await db.delete(expense).where(eq(expense.id, data.id))
  })

// ─── Add ──────────────────────────────────────────────────────────────────────

export const addExpenseSchema = z.object({
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string().optional(),
  dueDate: z.string().optional(),
})

export const addExpense = createServerFn({ method: 'POST' })
  .inputValidator(addExpenseSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(expense)
      .values({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        counterpartyId: data.counterpartyId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: expense.id })

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

    await db
      .update(expense)
      .set({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        counterpartyId: data.counterpartyId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        updatedBy: session.user.id,
      })
      .where(eq(expense.id, data.id))
  })
