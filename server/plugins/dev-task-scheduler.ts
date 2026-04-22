import { Cron } from 'croner'
import { definePlugin } from 'nitro'
import { runTask } from 'nitro/task'
import { scheduledTasks } from '#nitro/virtual/tasks'

export default definePlugin(() => {
  // In this stack, Nitro dev runtime does not reliably start scheduled tasks.
  // Keep this fallback dev-only to avoid double execution in production.
  if (!import.meta.dev) return
  if (!scheduledTasks || scheduledTasks.length === 0 || process.env.TEST) return

  const payload = { scheduledTime: Date.now() }

  for (const schedule of scheduledTasks) {
    new Cron(schedule.cron, async () => {
      await Promise.all(
        schedule.tasks.map((name) =>
          runTask(name, { payload }).catch((error) => {
            console.error(
              `[dev-task-scheduler] Error while running scheduled task "${name}"`,
              error,
            )
          }),
        ),
      )
    })
  }
})
