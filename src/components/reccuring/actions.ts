import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import {
  recurringRule,
  currentAccountUser,
  currentAccount,
  category,
} from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { Cron } from 'croner'
import { auth } from 'utils/auth'
import {
  createRecurringEntry,
  syncRecurringRulesForAccounts,
} from '#/lib/recurring'

// ─── Fetch list (route loader) ────────────────────────────────────────────────

export const fetchRecurringData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const memberships = await db
    .select({
      currentAccountId: currentAccountUser.currentAccountId,
      role: currentAccountUser.role,
    })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, session.user.id))

  const accountIds = memberships.map((m) => m.currentAccountId)

  if (accountIds.length === 0) {
    const [categories, counterparties] = await Promise.all([
      db.query.category.findMany({
        where: or(
          eq(category.createdBy, session.user.id),
          eq(category.isShared, true),
        ),
      }),
      db.query.counterparty.findMany({
        columns: { id: true, name: true, linkedUserId: true },
      }),
    ])
    return { rules: [], categories, accounts: [], counterparties }
  }

  await syncRecurringRulesForAccounts(accountIds)

  const [rules, categories, accounts, counterparties] = await Promise.all([
    db.query.recurringRule.findMany({
      where: inArray(recurringRule.currentAccountId, accountIds),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        counterparty: { columns: { id: true, name: true } },
      },
    }),
    db.query.category.findMany({
      where: or(
        eq(category.createdBy, session.user.id),
        eq(category.isShared, true),
      ),
    }),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
    }),
    db.query.counterparty.findMany({
      columns: { id: true, name: true, linkedUserId: true },
    }),
  ])

  return { rules, categories, accounts, counterparties }
})

// ─── Fetch single rule (edit loader) ─────────────────────────────────────────

export const fetchRuleById = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const rule = await db.query.recurringRule.findFirst({
      where: eq(recurringRule.id, id),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
      },
    })

    if (!rule) throw new Error('Правило не найдено')

    return { rule }
  })

// ─── Toggle active ────────────────────────────────────────────────────────────

const toggleRuleSchema = z.object({ id: z.string(), isActive: z.boolean() })

export const toggleRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(toggleRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    let nextRunAt: Date | null = null
    if (data.isActive) {
      const existing = await db.query.recurringRule.findFirst({
        where: eq(recurringRule.id, data.id),
        columns: { cronExpression: true },
      })
      if (existing) {
        const job = new Cron(existing.cronExpression, { paused: true })
        nextRunAt = job.nextRun() ?? null
      }
    }

    await db
      .update(recurringRule)
      .set({
        isActive: data.isActive,
        ...(data.isActive && nextRunAt ? { nextRunAt } : {}),
      })
      .where(eq(recurringRule.id, data.id))
  })

// ─── Create ───────────────────────────────────────────────────────────────────

const createRuleSchema = z.object({
  type: z.enum(['payable', 'receivable']),
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  counterpartyId: z.string().optional(),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronExpression: z.string().min(1, 'Введите расписание'),
  dueDaysFromCreation: z.number().nullable(),
  paymentAccountId: z.string().optional(),
  paymentCategoryId: z.string().optional(),
})

export const createRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(createRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const job = new Cron(data.cronExpression, { paused: true })
    const nextRunAt = job.nextRun()

    await db.insert(recurringRule).values({
      type: data.type,
      amount: data.amount.toString(),
      description: data.description,
      categoryId: data.categoryId,
      counterpartyId: data.counterpartyId || null,
      currentAccountId: data.currentAccountId,
      cronExpression: data.cronExpression,
      dueDaysFromCreation: data.dueDaysFromCreation,
      paymentAccountId: data.paymentAccountId || null,
      paymentCategoryId: data.paymentCategoryId || null,
      nextRunAt,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
  })

// ─── Update ───────────────────────────────────────────────────────────────────

const updateRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['payable', 'receivable']),
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  counterpartyId: z.string().optional(),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronExpression: z.string().min(1, 'Введите расписание'),
  dueDaysFromCreation: z.number().nullable(),
  paymentAccountId: z.string().optional(),
  paymentCategoryId: z.string().optional(),
})

export const updateRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(updateRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const job = new Cron(data.cronExpression, { paused: true })
    const nextRunAt = job.nextRun()

    await db
      .update(recurringRule)
      .set({
        type: data.type,
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        counterpartyId: data.counterpartyId || null,
        currentAccountId: data.currentAccountId,
        cronExpression: data.cronExpression,
        dueDaysFromCreation: data.dueDaysFromCreation,
        paymentAccountId: data.paymentAccountId || null,
        paymentCategoryId: data.paymentCategoryId || null,
        nextRunAt,
        updatedBy: session.user.id,
      })
      .where(eq(recurringRule.id, data.id))
  })

// ─── Create now ───────────────────────────────────────────────────────────────

const createNowSchema = z.object({ id: z.string() })

export const createRecurringNow = createServerFn({ method: 'POST' })
  .inputValidator(createNowSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const memberships = await db
      .select({ currentAccountId: currentAccountUser.currentAccountId })
      .from(currentAccountUser)
      .where(eq(currentAccountUser.userId, session.user.id))

    const accountIds = memberships.map((m) => m.currentAccountId)

    const rule = await db.query.recurringRule.findFirst({
      where: eq(recurringRule.id, data.id),
      columns: {
        id: true,
        type: true,
        amount: true,
        description: true,
        categoryId: true,
        counterpartyId: true,
        currentAccountId: true,
        dueDaysFromCreation: true,
        createdBy: true,
        updatedBy: true,
        paymentAccountId: true,
        paymentCategoryId: true,
      },
    })

    if (!rule || !accountIds.includes(rule.currentAccountId)) {
      throw new Error('Правило не найдено')
    }

    await createRecurringEntry(rule, new Date(), session.user.id)
  })

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteRuleSchema = z.object({ id: z.string() })

export const deleteRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(deleteRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.delete(recurringRule).where(eq(recurringRule.id, data.id))
  })
