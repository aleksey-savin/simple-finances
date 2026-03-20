import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import { income } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteIncomeSchema = z.object({ id: z.string() })

export const deleteIncome = createServerFn({ method: 'POST' })
  .inputValidator(deleteIncomeSchema)
  .handler(async ({ data }) => {
    await db.delete(income).where(eq(income.id, data.id))
  })

// ─── Add ──────────────────────────────────────────────────────────────────────

export const addIncomeSchema = z.object({
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string().optional(),
  dueDate: z.string().optional(),
})

export const addIncome = createServerFn({ method: 'POST' })
  .inputValidator(addIncomeSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(income)
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
      .returning({ id: income.id })

    return inserted.id
  })

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateIncomeSchema = addIncomeSchema.extend({
  id: z.string(),
})

export const updateIncome = createServerFn({ method: 'POST' })
  .inputValidator(updateIncomeSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    await db
      .update(income)
      .set({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        counterpartyId: data.counterpartyId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        updatedBy: session.user.id,
      })
      .where(eq(income.id, data.id))
  })
