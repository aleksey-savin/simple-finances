import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { client, clientCounterparty, clientManager } from '@/db/schema'
import { auth } from 'utils/auth'
import { resolveSelectedScope } from '#/lib/company-scope'

export const clientsQueryKey = ['clients'] as const

export const fetchClients = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  const whereClause =
    selectedScope.kind === 'company'
      ? eq(client.companyId, selectedScope.id)
      : and(isNull(client.companyId), eq(client.createdBy, session.user.id))

  return db.query.client
    .findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        companyId: true,
        createdBy: true,
      },
      with: {
        counterparties: {
          columns: {},
          with: {
            counterparty: { columns: { id: true, name: true } },
          },
        },
        managers: {
          columns: {},
          with: {
            user: { columns: { id: true, name: true } },
          },
        },
      },
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        companyId: row.companyId,
        createdBy: row.createdBy,
        counterparties: row.counterparties.map((item) => item.counterparty),
        managers: row.managers.map((item) => ({
          userId: item.user.id,
          name: item.user.name,
        })),
      })),
    )
})

const clientSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  companyId: z.string().optional(),
  counterpartiesIds: z
    .array(z.string())
    .min(1, 'Выберите хотя бы одного контрагента'),
  managerIds: z.array(z.string()).optional(),
})

export const addClientSchema = clientSchema

export const addClient = createServerFn({ method: 'POST' })
  .inputValidator(addClientSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(client)
        .values({
          name: data.name,
          companyId: data.companyId ?? null,
          createdBy: session.user.id,
        })
        .returning({ id: client.id })

      await tx.insert(clientCounterparty).values(
        data.counterpartiesIds.map((counterpartyId) => ({
          clientId: inserted.id,
          counterpartyId,
        })),
      )

      if (data.managerIds && data.managerIds.length > 0) {
        await tx.insert(clientManager).values(
          data.managerIds.map((userId) => ({
            clientId: inserted.id,
            userId,
          })),
        )
      }
    })
  })

export const updateClientSchema = clientSchema.extend({
  id: z.string(),
})

export const updateClient = createServerFn({ method: 'POST' })
  .inputValidator(updateClientSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    await db.transaction(async (tx) => {
      await tx
        .update(client)
        .set({
          name: data.name,
          companyId: data.companyId ?? null,
        })
        .where(eq(client.id, data.id))

      await tx
        .delete(clientCounterparty)
        .where(eq(clientCounterparty.clientId, data.id))

      await tx.insert(clientCounterparty).values(
        data.counterpartiesIds.map((counterpartyId) => ({
          clientId: data.id,
          counterpartyId,
        })),
      )

      await tx
        .delete(clientManager)
        .where(eq(clientManager.clientId, data.id))

      if (data.managerIds && data.managerIds.length > 0) {
        await tx.insert(clientManager).values(
          data.managerIds.map((userId) => ({
            clientId: data.id,
            userId,
          })),
        )
      }
    })
  })

const deleteClientSchema = z.object({ id: z.string() })

export const deleteClient = createServerFn({ method: 'POST' })
  .inputValidator(deleteClientSchema)
  .handler(async ({ data }) => {
    await db.delete(client).where(eq(client.id, data.id))
  })
