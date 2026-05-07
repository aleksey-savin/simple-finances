import { createServerFn } from '@tanstack/react-start'

import { z } from 'zod'
import { db } from '#/db/index.server'
import {
  category,
  counterparty,
  currentAccount,
  currentAccountUser,
  recurringRule,
} from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { Cron } from 'croner'
import { getRequest, requireSession } from '#/utils/session.server'
import { createRecurringEntry } from '#/lib/recurring'
import {
  getScopedCounterpartyIds,
  resolveScopedAccountIds,
} from '#/lib/company-scope'
import type { RecurringLoaderData, RecurringMonthTotals } from '@/types'

// ─── Fetch list (route loader) ────────────────────────────────────────────────

export const fetchRecurringData = createServerFn().handler(async () => {
  const session = await requireSession()
  const request = await getRequest()

  const { accountIds, selectedScope } = await resolveScopedAccountIds(
    session.user.id,
    request.headers,
  )

  if (accountIds.length === 0) {
    const [categories, counterparties] = await Promise.all([
      db.query.category.findMany({
        where: or(
          eq(category.createdBy, session.user.id),
          eq(category.isShared, true),
        ),
      }),
      getScopedCounterpartyIds(session.user.id, selectedScope).then((ids) =>
        ids.length > 0
          ? db.query.counterparty.findMany({
              where: inArray(counterparty.id, ids),
              columns: { id: true, name: true, linkedUserId: true },
            })
          : [],
      ),
    ])
    return {
      rules: [],
      categories,
      accounts: [],
      counterparties,
      currentMonthTotals: {
        income: 0,
        incomeCount: 0,
        expenses: 0,
        expensesCount: 0,
      },
    } satisfies RecurringLoaderData
  }

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
    getScopedCounterpartyIds(session.user.id, selectedScope).then((ids) =>
      ids.length > 0
        ? db.query.counterparty.findMany({
            where: inArray(counterparty.id, ids),
            columns: { id: true, name: true, linkedUserId: true },
          })
        : [],
    ),
  ])

  return {
    rules,
    categories,
    accounts,
    counterparties,
    currentMonthTotals: buildCurrentMonthTotals(rules),
  } satisfies RecurringLoaderData
})

// ─── Fetch single rule (edit loader) ─────────────────────────────────────────

export const fetchRuleById = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    await requireSession()

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
    await requireSession()

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
  contractId: z.string().optional(),
})

export const createRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(createRuleSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

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
      contractId: data.contractId || null,
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
  contractId: z.string().optional(),
})

export const updateRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(updateRuleSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

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
        contractId: data.contractId || null,
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
    const session = await requireSession()

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
        contractId: true,
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
    await requireSession()

    await db.delete(recurringRule).where(eq(recurringRule.id, data.id))
  })

function buildCurrentMonthTotals(
  rules: Array<{
    type: string
    amount: string
    cronExpression: string
    isActive: boolean
  }>,
): RecurringMonthTotals {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )

  let income = 0
  let incomeCount = 0
  let expenses = 0
  let expensesCount = 0

  for (const rule of rules) {
    if (!rule.isActive) continue

    try {
      const schedule = new Cron(rule.cronExpression, { paused: true })
      let cursor = new Date(monthStart.getTime() - 1)

      for (let guard = 0; guard < 500; guard++) {
        const next = schedule.nextRun(cursor)
        if (!next || next > monthEnd) break

        if (rule.type === 'receivable') {
          income += Number(rule.amount)
          incomeCount += 1
        } else if (rule.type === 'payable') {
          expenses += Number(rule.amount)
          expensesCount += 1
        }

        cursor = new Date(next.getTime() + 1)
      }
    } catch {
      // Skip rules with invalid cron expressions.
    }
  }

  return { income, incomeCount, expenses, expensesCount }
}
