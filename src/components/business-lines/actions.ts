import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { businessLine, contract } from '@/db/schema'
import { requireSession } from 'utils/session'

export const businessLinesQueryKey = ['business-lines'] as const

export const fetchBusinessLines = createServerFn().handler(async () => {
  const session = await requireSession()

  return db.query.businessLine
    .findMany({
      columns: {
        id: true,
        name: true,
        allowServerBindings: true,
        allowNotifications: true,
        createdBy: true,
      },
      with: {
        contracts: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        allowServerBindings: row.allowServerBindings,
        allowNotifications: row.allowNotifications,
        createdBy: row.createdBy,
        contracts: row.contracts,
      })),
    )
})

const businessLineSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  allowServerBindings: z.boolean(),
  allowNotifications: z.boolean(),
})

export const addBusinessLineSchema = businessLineSchema

export const addBusinessLine = createServerFn({ method: 'POST' })
  .inputValidator(addBusinessLineSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db.insert(businessLine).values({
      name: data.name,
      allowServerBindings: data.allowServerBindings,
      allowNotifications: data.allowNotifications,
      createdBy: session.user.id,
    })
  })

export const updateBusinessLineSchema = businessLineSchema.extend({
  id: z.string(),
})

export const updateBusinessLine = createServerFn({ method: 'POST' })
  .inputValidator(updateBusinessLineSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db
      .update(businessLine)
      .set({
        name: data.name,
        allowServerBindings: data.allowServerBindings,
        allowNotifications: data.allowNotifications,
      })
      .where(eq(businessLine.id, data.id))
  })

const deleteBusinessLineSchema = z.object({ id: z.string() })

export const deleteBusinessLine = createServerFn({ method: 'POST' })
  .inputValidator(deleteBusinessLineSchema)
  .handler(async ({ data }) => {
    const existingContract = await db.query.contract.findFirst({
      where: eq(contract.businessLineId, data.id),
      columns: {
        id: true,
        name: true,
      },
    })

    if (existingContract) {
      throw new Error(
        `Нельзя удалить направление: договор «${existingContract.name}» ещё привязан`,
      )
    }

    await db.delete(businessLine).where(eq(businessLine.id, data.id))
  })
