import '@tanstack/react-start/server-only'

import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm'
import { Cron } from 'croner'
import { db } from '#/db/index.server'
import { invoice, recurringRule } from '#/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_OCCURRENCES_PER_SYNC = 500

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Re-sync the `amount` of every recurring rule linked to `contractId` that tracks a
 * specific contract amount index. Rules whose tracked index is out of range for
 * `newAmounts` are left unchanged.
 */
export async function syncRecurringRuleAmountsForContract(
  tx: DbTx,
  contractId: string,
  newAmounts: string[],
) {
  const rules = await tx.query.recurringRule.findMany({
    where: and(
      eq(recurringRule.contractId, contractId),
      isNotNull(recurringRule.selectedAmountIndex),
    ),
    columns: { id: true, selectedAmountIndex: true },
  })

  const byAmount = new Map<string, string[]>()
  for (const rule of rules) {
    const idx = rule.selectedAmountIndex
    if (idx == null || idx < 0 || idx >= newAmounts.length) continue
    const amount = newAmounts[idx]
    const ids = byAmount.get(amount) ?? []
    ids.push(rule.id)
    byAmount.set(amount, ids)
  }
  for (const [amount, ids] of byAmount) {
    await tx
      .update(recurringRule)
      .set({ amount })
      .where(inArray(recurringRule.id, ids))
  }
}

type RecurringExecutionRule = {
  id: string
  type: string
  amount: string
  description: string
  categoryId: string
  counterpartyId: string | null
  currentAccountId: string
  contractId: string | null
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
    if (rule.type === 'payable') {
      const [insertedInvoice] = await tx
        .insert(invoice)
        .values({
          kind: 'payable',
          amount: rule.amount,
          description: rule.description,
          categoryId: rule.categoryId,
          currentAccountId: rule.currentAccountId,
          counterpartyId: rule.counterpartyId,
          createdAt: occurrenceAt,
          dueDate,
          recurringRuleId: rule.id,
          recurringOccurrenceAt: occurrenceAt,
          contractId: rule.contractId,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .onConflictDoNothing({
          target: [
            invoice.recurringRuleId,
            invoice.recurringOccurrenceAt,
            invoice.kind,
          ],
        })
        .returning({ id: invoice.id })

      let invoiceId: string | null = insertedInvoice.id

      if (!invoiceId) {
        const existingInvoice = await tx.query.invoice.findFirst({
          where: and(
            eq(invoice.recurringRuleId, rule.id),
            eq(invoice.recurringOccurrenceAt, occurrenceAt),
          ),
          columns: { id: true },
        })
        invoiceId = existingInvoice?.id ?? null
      }

      if (rule.paymentAccountId && rule.paymentCategoryId && invoiceId) {
        await tx
          .insert(invoice)
          .values({
            kind: 'receivable',
            amount: rule.amount,
            description: rule.description,
            categoryId: rule.paymentCategoryId,
            currentAccountId: rule.paymentAccountId,
            counterpartyId: rule.counterpartyId,
            createdAt: occurrenceAt,
            dueDate,
            linkedInvoiceId: invoiceId,
            recurringRuleId: rule.id,
            recurringOccurrenceAt: occurrenceAt,
            contractId: rule.contractId,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          })
          .onConflictDoNothing({
            target: [
              invoice.recurringRuleId,
              invoice.recurringOccurrenceAt,
              invoice.kind,
            ],
          })
      }

      return
    }

    await tx
      .insert(invoice)
      .values({
        kind: 'receivable',
        amount: rule.amount,
        description: rule.description,
        categoryId: rule.categoryId,
        currentAccountId: rule.currentAccountId,
        counterpartyId: rule.counterpartyId,
        createdAt: occurrenceAt,
        dueDate,
        recurringRuleId: rule.id,
        recurringOccurrenceAt: occurrenceAt,
        contractId: rule.contractId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .onConflictDoNothing({
        target: [
          invoice.recurringRuleId,
          invoice.recurringOccurrenceAt,
          invoice.kind,
        ],
      })
  })
}

export async function syncRecurringRulesForAccounts(
  accountIds: string[],
  now = new Date(),
) {
  if (accountIds.length === 0) {
    return { processedRules: 0, processedOccurrences: 0, totalDueRules: 0 }
  }

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
      contractId: true,
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

  let processedRules = 0
  let processedOccurrences = 0

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

        processedOccurrences++
        processedAt = occurrenceAt
        nextOccurrence = schedule.nextRun(new Date(occurrenceAt.getTime() + 1))
      }
    } catch (err) {
      console.error(
        `[recurring] Failed to process rule ${rule.id} (${rule.cronExpression})`,
        err,
      )
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

    processedRules++
  }

  return {
    processedRules,
    processedOccurrences,
    totalDueRules: dueRules.length,
  }
}
