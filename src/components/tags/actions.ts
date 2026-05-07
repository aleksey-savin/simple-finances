import { createServerFn } from '@tanstack/react-start'

import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'

import { currentAccountUser, invoice, invoiceTag, tag } from '#/db/schema'
import { getPaymentState } from '#/lib/invoice-payment'

export const fetchTags = createServerFn().handler(async () => {
  const [{ db }, { requireSession }] = await Promise.all([
    import('#/db/index.server'),
    import('#/utils/session.server'),
  ])
  await requireSession()

  return db.query.tag.findMany({
    orderBy: (table, { asc }) => asc(table.name),
  })
})

export const fetchExpenseTags = createServerFn()
  .inputValidator(z.object({ expenseIds: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    await requireSession()

    if (data.expenseIds.length === 0) return []

    const rows = await db.query.invoiceTag.findMany({
      where: inArray(invoiceTag.invoiceId, data.expenseIds),
      with: { tag: true },
    })

    return rows.map((row) => ({ expenseId: row.invoiceId, tag: row.tag }))
  })

export const fetchIncomeTags = createServerFn()
  .inputValidator(z.object({ incomeIds: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    await requireSession()

    if (data.incomeIds.length === 0) return []

    const rows = await db.query.invoiceTag.findMany({
      where: inArray(invoiceTag.invoiceId, data.incomeIds),
      with: { tag: true },
    })

    return rows.map((row) => ({ incomeId: row.invoiceId, tag: row.tag }))
  })

const createTagSchema = z.object({
  name: z.string().min(1).max(32),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export const createTag = createServerFn({ method: 'POST' })
  .inputValidator(createTagSchema)
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    const session = await requireSession()

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

export const deleteTag = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    await requireSession()

    await db.delete(tag).where(eq(tag.id, data.id))
  })

const addExpenseTagSchema = z.object({
  expenseId: z.string(),
  tagId: z.string(),
})

export const addExpenseTag = createServerFn({ method: 'POST' })
  .inputValidator(addExpenseTagSchema)
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    const session = await requireSession()

    const expense = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.expenseId),
      columns: { currentAccountId: true },
    })
    if (!expense) throw new Error('Расход не найден')

    const membership = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.currentAccountId, expense.currentAccountId),
        eq(currentAccountUser.userId, session.user.id),
      ),
    })
    if (!membership) throw new Error('Нет доступа')

    await db
      .insert(invoiceTag)
      .values({ invoiceId: data.expenseId, tagId: data.tagId })
      .onConflictDoNothing()
  })

const removeExpenseTagSchema = z.object({
  expenseId: z.string(),
  tagId: z.string(),
})

export const removeExpenseTag = createServerFn({ method: 'POST' })
  .inputValidator(removeExpenseTagSchema)
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    await requireSession()

    await db
      .delete(invoiceTag)
      .where(
        and(
          eq(invoiceTag.invoiceId, data.expenseId),
          eq(invoiceTag.tagId, data.tagId),
        ),
      )
  })

const addIncomeTagSchema = z.object({
  incomeId: z.string(),
  tagId: z.string(),
})

export const addIncomeTag = createServerFn({ method: 'POST' })
  .inputValidator(addIncomeTagSchema)
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    const session = await requireSession()

    const income = await db.query.invoice.findFirst({
      where: eq(invoice.id, data.incomeId),
      columns: { currentAccountId: true },
    })
    if (!income) throw new Error('Доход не найден')

    const membership = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.currentAccountId, income.currentAccountId),
        eq(currentAccountUser.userId, session.user.id),
      ),
    })
    if (!membership) throw new Error('Нет доступа')

    await db
      .insert(invoiceTag)
      .values({ invoiceId: data.incomeId, tagId: data.tagId })
      .onConflictDoNothing()
  })

const removeIncomeTagSchema = z.object({
  incomeId: z.string(),
  tagId: z.string(),
})

export const removeIncomeTag = createServerFn({ method: 'POST' })
  .inputValidator(removeIncomeTagSchema)
  .handler(async ({ data }) => {
    const [{ db }, { requireSession }] = await Promise.all([
      import('#/db/index.server'),
      import('#/utils/session.server'),
    ])
    await requireSession()

    await db
      .delete(invoiceTag)
      .where(
        and(
          eq(invoiceTag.invoiceId, data.incomeId),
          eq(invoiceTag.tagId, data.tagId),
        ),
      )
  })

export const fetchTagTotals = createServerFn().handler(async () => {
  const [{ db }, { requireSession }] = await Promise.all([
    import('#/db/index.server'),
    import('#/utils/session.server'),
  ])
  const session = await requireSession()

  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, session.user.id))

  const accountIds = memberships.map(
    (membership) => membership.currentAccountId,
  )
  if (accountIds.length === 0) return []

  const allTags = await db.query.tag.findMany({
    orderBy: (table, { asc }) => asc(table.name),
  })

  const invoiceTags = await db.query.invoiceTag.findMany({
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
      tag: { columns: { id: true } },
    },
  })

  const accountIdSet = new Set(accountIds)

  return allTags
    .map((item) => {
      const expenseTotal = invoiceTags
        .filter(
          (entry) =>
            entry.tag.id === item.id &&
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

      const incomeTotal = invoiceTags
        .filter(
          (entry) =>
            entry.tag.id === item.id &&
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
        tag: { id: item.id, name: item.name, color: item.color },
        expenseTotal,
        incomeTotal,
        net: incomeTotal - expenseTotal,
      }
    })
    .filter((entry) => entry.expenseTotal > 0 || entry.incomeTotal > 0)
})
