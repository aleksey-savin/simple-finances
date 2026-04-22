import { defineTask } from 'nitro/task'
import { db } from '#/db'
import { recurringRule } from '#/db/schema'
import { and, eq, isNotNull, lte } from 'drizzle-orm'
import { syncRecurringRulesForAccounts } from '#/lib/recurring'

export default defineTask({
  meta: {
    name: 'recurring',
    description:
      'Creates invoice entries from due recurring rules and schedules the next run.',
  },

  async run() {
    const now = new Date()

    const dueRules = await db.query.recurringRule.findMany({
      where: and(
        eq(recurringRule.isActive, true),
        isNotNull(recurringRule.nextRunAt),
        lte(recurringRule.nextRunAt, now),
      ),
      columns: { id: true, currentAccountId: true },
    })

    if (dueRules.length === 0) {
      return {
        result: { processedRules: 0, processedOccurrences: 0, totalDueRules: 0 },
      }
    }

    const accountIds = [...new Set(dueRules.map((rule) => rule.currentAccountId))]
    const summary = await syncRecurringRulesForAccounts(accountIds, now)

    console.log(
      `[recurring task] Processed ${summary.processedRules} rules, ${summary.processedOccurrences} occurrences (due rules: ${summary.totalDueRules}).`,
    )

    return { result: summary }
  },
})
