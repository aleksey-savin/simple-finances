import { db } from '#/db'
import { category } from '#/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'
import z from 'zod'

const deleteCategorySchema = z.object({ id: z.string() })

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(deleteCategorySchema)
  .handler(async ({ data }) => {
    await db.delete(category).where(eq(category.id, data.id))
  })

export const addCategorySchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  useForIncome: z.boolean(),
  useForExpenses: z.boolean(),
})

export const addCategory = createServerFn({ method: 'POST' })
  .inputValidator(addCategorySchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(category)
      .values({
        name: data.name,
        useForIncome: data.useForIncome,
        useForExpenses: data.useForExpenses,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: category.id })
    return inserted.id
  })

export const updateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Минимум 2 символа'),
  useForExpenses: z.boolean(),
  useForIncome: z.boolean(),
})

export const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema)
  .handler(async ({ data }) => {
    await db
      .update(category)
      .set({
        name: data.name,
        useForExpenses: data.useForExpenses,
        useForIncome: data.useForIncome,
      })
      .where(eq(category.id, data.id))
  })
