import { defineTask } from 'nitro/task'
import { Cron } from 'croner'
import { db } from '#/db'
import { recurringRule, expense, income } from '#/db/schema'
import { and, eq, isNotNull, lte } from 'drizzle-orm'

export default defineTask({
  meta: {
    name: 'recurring',
    description:
      'Creates expense / income entries from due recurring rules and schedules the next run.',
  },

  async run() {
    const now = new Date()

    const dueRules = await db.query.recurringRule.findMany({
      where: and(
        eq(recurringRule.isActive, true),
        isNotNull(recurringRule.nextRunAt),
        lte(recurringRule.nextRunAt, now),
      ),
    })

    let processed = 0

    for (const rule of dueRules) {
      try {
        // dueDate = creation time + N calendar days
        const dueDate =
          rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0
            ? new Date(
                now.getTime() +
                  rule.dueDaysFromCreation * 24 * 60 * 60 * 1000,
              )
            : undefined

        const table = rule.type === 'expense' ? expense : income

        await db.insert(table).values({
          amount: rule.amount,
          description: rule.description,
          categoryId: rule.categoryId,
          currentAccountId: rule.currentAccountId,
          dueDate,
          createdBy: rule.createdBy,
          updatedBy: rule.createdBy,
        })

        // Calculate the next scheduled run using croner (paused = no side-effects)
        const job = new Cron(rule.cronExpression, { paused: true })
        const nextRun = job.nextRun()

        await db
          .update(recurringRule)
          .set({ lastRunAt: now, nextRunAt: nextRun })
          .where(eq(recurringRule.id, rule.id))

        processed++
      } catch (err) {
        console.error(
          `[recurring task] Failed to process rule ${rule.id}:`,
          err,
        )
      }
    }

    console.log(`[recurring task] Processed ${processed} / ${dueRules.length} rules.`)

    return { result: { processed, total: dueRules.length } }
  },
})
