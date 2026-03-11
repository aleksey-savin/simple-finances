import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import {
  tag,
  expenseTag,
  incomeTag,
  currentAccountUser,
  expense,
  income,
} from '#/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'

// ─── Fetch all tags ────────────────────────────────────────────────────────────

export const fetchTags = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const tags = await db.query.tag.findMany({
    orderBy: (t, { asc }) => asc(t.name),
  })

  return tags
})

// ─── Fetch tags for a set of expenses ─────────────────────────────────────────

export const fetchExpenseTags = createServerFn()
  .inputValidator(z.object({ expenseIds: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    if (data.expenseIds.length === 0) return []

    const rows = await db.query.expenseTag.findMany({
      where: inArray(expenseTag.expenseId, data.expenseIds),
      with: { tag: true },
    })

    return rows.map((r) => ({ expenseId: r.expenseId, tag: r.tag }))
  })

// ─── Fetch tags for a set of incomes ──────────────────────────────────────────

export const fetchIncomeTags = createServerFn()
  .inputValidator(z.object({ incomeIds: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    if (data.incomeIds.length === 0) return []

    const rows = await db.query.incomeTag.findMany({
      where: inArray(incomeTag.incomeId, data.incomeIds),
      with: { tag: true },
    })

    return rows.map((r) => ({ incomeId: r.incomeId, tag: r.tag }))
  })

// ─── Create tag ────────────────────────────────────────────────────────────────

const createTagSchema = z.object({
  name: z.string().min(1).max(32),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const createTag = createServerFn({ method: 'POST' })
  .inputValidator(createTagSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const [created] = await db
      .insert(tag)
      .values({
        name: data.name.trim(),
        color: data.color,
        createdBy: session.user.id,
      })
      .returning()

    return created
  })

// ─── Delete tag ────────────────────────────────────────────────────────────────

export const deleteTag = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.delete(tag).where(eq(tag.id, data.id))
  })

// ─── Add tag to expense ────────────────────────────────────────────────────────

const addExpenseTagSchema = z.object({
  expenseId: z.string(),
  tagId: z.string(),
})

export const addExpenseTag = createServerFn({ method: 'POST' })
  .inputValidator(addExpenseTagSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    // Verify user has access to this expense's account
    const exp = await db.query.expense.findFirst({
      where: eq(expense.id, data.expenseId),
      columns: { currentAccountId: true },
    })
    if (!exp) throw new Error('Расход не найден')

    const membership = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.currentAccountId, exp.currentAccountId),
        eq(currentAccountUser.userId, session.user.id),
      ),
    })
    if (!membership) throw new Error('Нет доступа')

    await db
      .insert(expenseTag)
      .values({ expenseId: data.expenseId, tagId: data.tagId })
      .onConflictDoNothing()
  })

// ─── Remove tag from expense ───────────────────────────────────────────────────

const removeExpenseTagSchema = z.object({
  expenseId: z.string(),
  tagId: z.string(),
})

export const removeExpenseTag = createServerFn({ method: 'POST' })
  .inputValidator(removeExpenseTagSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db
      .delete(expenseTag)
      .where(
        and(
          eq(expenseTag.expenseId, data.expenseId),
          eq(expenseTag.tagId, data.tagId),
        ),
      )
  })

// ─── Add tag to income ─────────────────────────────────────────────────────────

const addIncomeTagSchema = z.object({
  incomeId: z.string(),
  tagId: z.string(),
})

export const addIncomeTag = createServerFn({ method: 'POST' })
  .inputValidator(addIncomeTagSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    // Verify access
    const inc = await db.query.income.findFirst({
      where: eq(income.id, data.incomeId),
      columns: { currentAccountId: true },
    })
    if (!inc) throw new Error('Доход не найден')

    const membership = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.currentAccountId, inc.currentAccountId),
        eq(currentAccountUser.userId, session.user.id),
      ),
    })
    if (!membership) throw new Error('Нет доступа')

    await db
      .insert(incomeTag)
      .values({ incomeId: data.incomeId, tagId: data.tagId })
      .onConflictDoNothing()
  })

// ─── Remove tag from income ────────────────────────────────────────────────────

const removeIncomeTagSchema = z.object({
  incomeId: z.string(),
  tagId: z.string(),
})

export const removeIncomeTag = createServerFn({ method: 'POST' })
  .inputValidator(removeIncomeTagSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db
      .delete(incomeTag)
      .where(
        and(
          eq(incomeTag.incomeId, data.incomeId),
          eq(incomeTag.tagId, data.tagId),
        ),
      )
  })

// ─── Fetch tag totals (all expenses + incomes across user's accounts) ──────────

export const fetchTagTotals = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, session.user.id))

  const accountIds = memberships.map((m) => m.currentAccountId)
  if (accountIds.length === 0) return []

  // All tags
  const allTags = await db.query.tag.findMany({
    orderBy: (t, { asc }) => asc(t.name),
  })

  // Expense tags with amounts (unpaid only)
  const expenseTags = await db.query.expenseTag.findMany({
    with: {
      expense: { columns: { amount: true, currentAccountId: true, paidAt: true } },
      tag: { columns: { id: true } },
    },
  })

  // Income tags with amounts (unpaid only)
  const incomeTags = await db.query.incomeTag.findMany({
    with: {
      income: { columns: { amount: true, currentAccountId: true, paidAt: true } },
      tag: { columns: { id: true } },
    },
  })

  const accountIdSet = new Set(accountIds)

  // Aggregate per tag
  const totals = allTags.map((t) => {
    const expenseTotal = expenseTags
      .filter(
        (et) =>
          et.tag.id === t.id &&
          accountIdSet.has(et.expense.currentAccountId) &&
          !et.expense.paidAt,
      )
      .reduce((s, et) => s + Number(et.expense.amount), 0)

    const incomeTotal = incomeTags
      .filter(
        (it) =>
          it.tag.id === t.id &&
          accountIdSet.has(it.income.currentAccountId) &&
          !it.income.paidAt,
      )
      .reduce((s, it) => s + Number(it.income.amount), 0)

    return {
      tag: t,
      expenseTotal,
      incomeTotal,
      net: incomeTotal - expenseTotal,
    }
  })

  // Only return tags that have at least some activity
  return totals.filter((t) => t.expenseTotal > 0 || t.incomeTotal > 0)
})
