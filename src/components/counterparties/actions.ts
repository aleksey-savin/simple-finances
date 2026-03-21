import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { db } from '@/db'
import { counterparty, counterpartyTypeEnum, user } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from 'utils/auth'

// ─── Query key ────────────────────────────────────────────────────────────────

export const counterpartiesQueryKey = ['counterparties'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchCounterparties = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  return db.query.counterparty.findMany({
    columns: {
      id: true,
      name: true,
      fullName: true,
      type: true,
      tin: true,
      linkedUserId: true,
    },
    with: {
      linkedUser: { columns: { id: true, name: true, email: true } },
    },
  })
})

// ─── Search user by email ─────────────────────────────────────────────────────

export const searchUserByEmail = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    if (!data.email) return null

    const found = await db.query.user.findFirst({
      where: eq(user.email, data.email),
      columns: { id: true, name: true, email: true },
    })

    return found ?? null
  })

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
  type: z.enum(counterpartyTypeEnum.enumValues).optional(),
  tin: z.string().optional(),
  linkedUserId: z.string().optional(),
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
        linkedUserId: data.linkedUserId,
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
        linkedUserId: data.linkedUserId ?? null,
      })
      .where(eq(counterparty.id, data.id))
  })
