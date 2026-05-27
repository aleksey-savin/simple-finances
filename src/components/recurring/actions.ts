import { createServerFn } from '@tanstack/react-start'

import { z } from 'zod'
import { Cron } from 'croner'
import { db } from '#/db/index.server'
import {
  category,
  counterparty,
  currentAccount,
  currentAccountUser,
  recurringRule,
} from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { getRequest, requireSession } from '#/utils/session.server'
import { createRecurringEntry } from '#/lib/recurring'
import {
  getScopedCounterpartyIds,
  resolveScopedAccountIds,
} from '#/lib/company-scope'
import type { RecurringLoaderData } from '@/types'

function cronNextRun(expression: string): Date | null {
  return new Cron(expression, { paused: true }).nextRun() ?? null
}

function cronAdvanceFrom(expression: string, after: Date): Date | null {
  return new Cron(expression, { paused: true }).nextRun(after) ?? null
}

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
    } satisfies RecurringLoaderData
  }

  const [rules, categories, accounts, counterparties] = await Promise.all([
    db.query.recurringRule.findMany({
      where: inArray(recurringRule.currentAccountId, accountIds),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        counterparty: { columns: { id: true, name: true } },
        contract: { columns: { id: true, name: true, number: true } },
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
        nextRunAt = cronNextRun(existing.cronExpression)
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

    const nextRunAt = cronNextRun(data.cronExpression)

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

    const nextRunAt = cronNextRun(data.cronExpression)

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

const createNowSchema = z.object({
  id: z.string(),
  skipNext: z.boolean().optional(),
})

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
        cronExpression: true,
        dueDaysFromCreation: true,
        createdBy: true,
        updatedBy: true,
        paymentAccountId: true,
        paymentCategoryId: true,
        nextRunAt: true,
      },
    })

    if (!rule || !accountIds.includes(rule.currentAccountId)) {
      throw new Error('Правило не найдено')
    }

    await createRecurringEntry(rule, new Date(), session.user.id)

    if (data.skipNext && rule.nextRunAt) {
      const advanced = cronAdvanceFrom(
        rule.cronExpression,
        new Date(rule.nextRunAt.getTime() + 1),
      )
      if (advanced) {
        await db
          .update(recurringRule)
          .set({ nextRunAt: advanced })
          .where(eq(recurringRule.id, rule.id))
      }
    }
  })

// ─── Skip next occurrence ────────────────────────────────────────────────────

const skipNextSchema = z.object({ id: z.string() })

export const skipNextRecurringOccurrence = createServerFn({ method: 'POST' })
  .inputValidator(skipNextSchema)
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
        currentAccountId: true,
        cronExpression: true,
        nextRunAt: true,
        isActive: true,
      },
    })

    if (!rule || !accountIds.includes(rule.currentAccountId)) {
      throw new Error('Правило не найдено')
    }
    if (!rule.isActive) {
      throw new Error('Правило приостановлено')
    }
    if (!rule.nextRunAt) {
      throw new Error('Нет следующего запуска для пропуска')
    }

    const advanced = cronAdvanceFrom(
      rule.cronExpression,
      new Date(rule.nextRunAt.getTime() + 1),
    )

    if (!advanced) {
      throw new Error('Не удалось вычислить следующий запуск')
    }

    await db
      .update(recurringRule)
      .set({ nextRunAt: advanced })
      .where(eq(recurringRule.id, rule.id))
  })

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteRuleSchema = z.object({ id: z.string() })

export const deleteRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(deleteRuleSchema)
  .handler(async ({ data }) => {
    await requireSession()

    await db.delete(recurringRule).where(eq(recurringRule.id, data.id))
  })
