import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import { recurringRule } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'

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
