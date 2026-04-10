import { db } from '#/db'
import { category } from '#/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, isNull, or } from 'drizzle-orm'
import { resolveSelectedScope } from '#/lib/company-scope'
import { auth } from 'utils/auth'
import z from 'zod'

// ─── Query key ────────────────────────────────────────────────────────────────

export const categoriesQueryKey = ['categories'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchCategories = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  const userFilter = or(
    eq(category.createdBy, session.user.id),
    eq(category.isShared, true),
  )

  const scopeFilter =
    selectedScope.kind === 'personal'
      ? isNull(category.companyId)
      : or(isNull(category.companyId), eq(category.companyId, selectedScope.id))

  return db.query.category.findMany({
    where: and(userFilter, scopeFilter),
    columns: {
      id: true,
      name: true,
      companyId: true,
      useForExpenses: true,
      useForIncome: true,
      isShared: true,
    },
    with: {
      company: {
        columns: { id: true, name: true },
      },
    },
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteCategorySchema = z.object({ id: z.string() })

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(deleteCategorySchema)
  .handler(async ({ data }) => {
    await db.delete(category).where(eq(category.id, data.id))
  })

// ─── Schema ───────────────────────────────────────────────────────────────────

export const categoryFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  companyId: z.string().nullable(),
  useForIncome: z.boolean(),
  useForExpenses: z.boolean(),
  isShared: z.boolean(),
})

// ─── Add ──────────────────────────────────────────────────────────────────────

export const addCategory = createServerFn({ method: 'POST' })
  .inputValidator(categoryFormSchema)
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
        companyId: data.companyId ?? null,
        useForIncome: data.useForIncome,
        useForExpenses: data.useForExpenses,
        isShared: data.isShared,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: category.id })
    return inserted.id
  })

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateCategorySchema = categoryFormSchema.extend({
  id: z.string(),
})

export const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema)
  .handler(async ({ data }) => {
    await db
      .update(category)
      .set({
        name: data.name,
        companyId: data.companyId ?? null,
        useForExpenses: data.useForExpenses,
        useForIncome: data.useForIncome,
        isShared: data.isShared,
      })
      .where(eq(category.id, data.id))
  })
