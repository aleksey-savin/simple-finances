import { and, eq, inArray, lte } from 'drizzle-orm'
import { Cron } from 'croner'
import { db } from '#/db'
import { expense, income, recurringRule } from '#/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_OCCURRENCES_PER_SYNC = 500

type RecurringExecutionRule = {
  id: string
  type: string
  amount: string
  description: string
  categoryId: string
  counterpartyId: string | null
  currentAccountId: string
  dueDaysFromCreation: number | null
  createdBy: string
  updatedBy: string
  paymentAccountId: string | null
  paymentCategoryId: string | null
}

function buildDueDate(createdAt: Date, dueDaysFromCreation: number | null) {
  if (!dueDaysFromCreation || dueDaysFromCreation <= 0) return null
  return new Date(createdAt.getTime() + dueDaysFromCreation * DAY_MS)
}

export async function createRecurringEntry(
  rule: RecurringExecutionRule,
  occurrenceAt: Date,
  actorUserId = rule.createdBy,
) {
  const dueDate = buildDueDate(occurrenceAt, rule.dueDaysFromCreation)

  await db.transaction(async (tx) => {
    if (rule.type === 'expense') {
      const [insertedExpense] = await tx
        .insert(expense)
        .values({
          amount: rule.amount,
          description: rule.description,
          categoryId: rule.categoryId,
          currentAccountId: rule.currentAccountId,
          counterpartyId: rule.counterpartyId,
          createdAt: occurrenceAt,
          dueDate,
          recurringRuleId: rule.id,
          recurringOccurrenceAt: occurrenceAt,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .onConflictDoNothing({
          target: [expense.recurringRuleId, expense.recurringOccurrenceAt],
        })
        .returning({ id: expense.id })

      let expenseId: string | null = insertedExpense?.id ?? null

      if (!expenseId) {
        const existingExpense = await tx.query.expense.findFirst({
          where: and(
            eq(expense.recurringRuleId, rule.id),
            eq(expense.recurringOccurrenceAt, occurrenceAt),
          ),
          columns: { id: true },
        })
        expenseId = existingExpense?.id ?? null
      }

      if (rule.paymentAccountId && rule.paymentCategoryId && expenseId) {
        await tx
          .insert(income)
          .values({
            amount: rule.amount,
            description: rule.description,
            categoryId: rule.paymentCategoryId,
            currentAccountId: rule.paymentAccountId,
            counterpartyId: rule.counterpartyId,
            createdAt: occurrenceAt,
            dueDate,
            linkedExpenseId: expenseId,
            recurringRuleId: rule.id,
            recurringOccurrenceAt: occurrenceAt,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          })
          .onConflictDoNothing({
            target: [income.recurringRuleId, income.recurringOccurrenceAt],
          })
      }

      return
    }

    await tx
      .insert(income)
      .values({
        amount: rule.amount,
        description: rule.description,
        categoryId: rule.categoryId,
        currentAccountId: rule.currentAccountId,
        counterpartyId: rule.counterpartyId,
        createdAt: occurrenceAt,
        dueDate,
        recurringRuleId: rule.id,
        recurringOccurrenceAt: occurrenceAt,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .onConflictDoNothing({
        target: [income.recurringRuleId, income.recurringOccurrenceAt],
      })
  })
}

export async function syncRecurringRulesForAccounts(
  accountIds: string[],
  now = new Date(),
) {
  if (accountIds.length === 0) return

  const dueRules = await db.query.recurringRule.findMany({
    where: and(
      inArray(recurringRule.currentAccountId, accountIds),
      eq(recurringRule.isActive, true),
      lte(recurringRule.nextRunAt, now),
    ),
    columns: {
      id: true,
      type: true,
      amount: true,
      description: true,
      categoryId: true,
      counterpartyId: true,
      currentAccountId: true,
      cronExpression: true,
      dueDaysFromCreation: true,
      nextRunAt: true,
      lastRunAt: true,
      createdBy: true,
      updatedBy: true,
      paymentAccountId: true,
      paymentCategoryId: true,
    },
  })

  for (const rule of dueRules) {
    if (!rule.nextRunAt) continue

    let processedAt: Date | null = null
    let nextOccurrence: Date | null = rule.nextRunAt

    try {
      const schedule = new Cron(rule.cronExpression, { paused: true })

      for (
        let guard = 0;
        guard < MAX_OCCURRENCES_PER_SYNC &&
        nextOccurrence &&
        nextOccurrence <= now;
        guard++
      ) {
        const occurrenceAt = nextOccurrence
        await createRecurringEntry(rule, occurrenceAt)

        processedAt = occurrenceAt
        nextOccurrence = schedule.nextRun(new Date(occurrenceAt.getTime() + 1))
      }
    } catch {
      continue
    }

    if (!processedAt) continue

    await db
      .update(recurringRule)
      .set({
        lastRunAt: processedAt,
        nextRunAt: nextOccurrence,
      })
      .where(eq(recurringRule.id, rule.id))
  }
}
