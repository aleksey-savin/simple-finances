import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import { counterparty, counterpartyTypeEnum } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteCounterpartySchema = z.object({ id: z.string() })

export const deleteCounterparty = createServerFn({ method: 'POST' })
  .inputValidator(deleteCounterpartySchema)
  .handler(async ({ data }) => {
    await db.delete(counterparty).where(eq(counterparty.id, data.id))
  })

// ─── Add ──────────────────────────────────────────────────────────────────────

export const addCounterpartySchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  fullName: z.string().optional(),
  type: z.enum(counterpartyTypeEnum.enumValues),
  tin: z.string().optional(),
})

export const addCounterparty = createServerFn({ method: 'POST' })
  .inputValidator(addCounterpartySchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(counterparty)
      .values({
        name: data.name,
        fullName: data.fullName,
        type: data.type,
        tin: data.tin,
        createdBy: session.user.id,
      })
      .returning({ id: counterparty.id })

    return inserted.id
  })

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateCounterpartySchema = addCounterpartySchema.extend({
  id: z.string(),
})

export const updateCounterparty = createServerFn({ method: 'POST' })
  .inputValidator(updateCounterpartySchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    await db
      .update(counterparty)
      .set({
        name: data.name,
        fullName: data.fullName,
        type: data.type,
        tin: data.tin,
      })
      .where(eq(counterparty.id, data.id))
  })
