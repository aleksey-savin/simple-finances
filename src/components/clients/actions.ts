import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  client,
  clientCounterparty,
  clientManager,
  contact,
  contract,
  contractVm,
  contractAmountHistory,
  contractPriceRevision,
  contractPriceRevisionItem,
  invoice,
} from '@/db/schema'
import { auth } from 'utils/auth'
import { getBlockedServicesByContractIds } from '#/lib/blocked-services'
import { resolveSelectedScope } from '#/lib/company-scope'
import { getPaymentState } from '#/lib/invoice-payment'
import type { ClientDetail } from '@/types'

export const clientsQueryKey = ['clients'] as const

export const fetchClients = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session.user.id) throw new Error('Не авторизован')

  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  const whereClause =
    selectedScope.kind === 'company'
      ? eq(client.companyId, selectedScope.id)
      : and(isNull(client.companyId), eq(client.createdBy, session.user.id))

  const rows = await db.query.client.findMany({
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
      contacts: {
        columns: { id: true, name: true, position: true, phone: true, email: true },
      },
    },
    orderBy: (table, { asc }) => asc(table.name),
  })

  const allCounterpartyIds = [
    ...new Set(
      rows.flatMap((row) => row.counterparties.map((item) => item.counterparty.id)),
    ),
  ]

  const blockedContractRows =
    allCounterpartyIds.length === 0
      ? []
      : await db
          .selectDistinct({
            contractId: contract.id,
            counterpartyId: contract.counterpartyId,
          })
          .from(contract)
          .innerJoin(
            contractVm,
            and(
              eq(contractVm.contractId, contract.id),
              eq(contractVm.isPausedBySystem, true),
            ),
          )
          .where(inArray(contract.counterpartyId, allCounterpartyIds))

  const blockedContractIdsByCounterpartyId = new Map<string, Set<string>>()
  for (const row of blockedContractRows) {
    const existing =
      blockedContractIdsByCounterpartyId.get(row.counterpartyId) ?? new Set<string>()
    existing.add(row.contractId)
    blockedContractIdsByCounterpartyId.set(row.counterpartyId, existing)
  }

  return rows.map((row) => {
    const blockedContractIds = new Set<string>()
    for (const item of row.counterparties) {
      const blockedForCounterparty =
        blockedContractIdsByCounterpartyId.get(item.counterparty.id)
      if (!blockedForCounterparty) continue
      for (const contractId of blockedForCounterparty) {
        blockedContractIds.add(contractId)
      }
    }

    return {
      id: row.id,
      name: row.name,
      companyId: row.companyId,
      createdBy: row.createdBy,
      counterparties: row.counterparties.map((item) => item.counterparty),
      managers: row.managers.map((item) => ({
        userId: item.user.id,
        name: item.user.name,
      })),
      contacts: row.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
      })),
      blockedServicesCount: blockedContractIds.size,
    }
  })
})

export type ClientSummary = {
  id: string
  name: string
  companyId: string | null
  createdBy: string
  counterparties: { id: string; name: string }[]
  managers: { userId: string; name: string }[]
  contacts: { id: string; name: string; position: string | null; phone: string | null; email: string | null }[]
  contractsCount: number
  totalRevenue: number
  activitiesCount: number
  blockedServicesCount: number
}

export const fetchClientsWithSummary = createServerFn().handler(async (): Promise<ClientSummary[]> => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session.user.id) throw new Error('Не авторизован')

  const { selectedScope } = await resolveSelectedScope(session.user.id, request.headers)

  const whereClause =
    selectedScope.kind === 'company'
      ? eq(client.companyId, selectedScope.id)
      : and(isNull(client.companyId), eq(client.createdBy, session.user.id))

  const clientRows = await db.query.client.findMany({
    where: whereClause,
    columns: { id: true, name: true, companyId: true, createdBy: true },
    with: {
      counterparties: {
        columns: {},
        with: { counterparty: { columns: { id: true, name: true } } },
      },
      managers: {
        columns: {},
        with: { user: { columns: { id: true, name: true } } },
      },
      contacts: {
        columns: { id: true, name: true, position: true, phone: true, email: true },
      },
    },
    orderBy: (table, { asc }) => asc(table.name),
  })

  const allCounterpartyIds = [
    ...new Set(
      clientRows.flatMap((row) => row.counterparties.map((c) => c.counterparty.id)),
    ),
  ]

  const [contractRows, invoiceRows] = await Promise.all([
    allCounterpartyIds.length === 0
      ? []
      : db.query.contract.findMany({
          where: inArray(contract.counterpartyId, allCounterpartyIds),
          columns: { id: true, counterpartyId: true },
        }),
    allCounterpartyIds.length === 0
      ? []
      : db.query.invoice.findMany({
          where: and(
            inArray(invoice.counterpartyId, allCounterpartyIds),
            eq(invoice.kind, 'receivable'),
          ),
          columns: { counterpartyId: true, amount: true, paidAt: true },
          with: { settlements: { columns: { amount: true, settledAt: true } } },
        }),
  ])

  const contractIdsByCounterpartyId = new Map<string, string[]>()
  for (const c of contractRows) {
    if (!c.counterpartyId) continue
    const existing = contractIdsByCounterpartyId.get(c.counterpartyId) ?? []
    existing.push(c.id)
    contractIdsByCounterpartyId.set(c.counterpartyId, existing)
  }

  const allContractIds = contractRows.map((c) => c.id)
  const blockedContractRows =
    allContractIds.length === 0
      ? []
      : await db
          .selectDistinct({ contractId: contractVm.contractId })
          .from(contractVm)
          .where(
            and(
              inArray(contractVm.contractId, allContractIds),
              eq(contractVm.isPausedBySystem, true),
            ),
          )
  const blockedContractIdSet = new Set(
    blockedContractRows.map((row) => row.contractId),
  )

  const activeRevisionItems =
    allContractIds.length === 0
      ? []
      : await db
          .select({ contractId: contractPriceRevisionItem.contractId })
          .from(contractPriceRevisionItem)
          .innerJoin(
            contractPriceRevision,
            and(
              eq(contractPriceRevisionItem.revisionId, contractPriceRevision.id),
              isNull(contractPriceRevision.completedAt),
            ),
          )
          .where(inArray(contractPriceRevisionItem.contractId, allContractIds))

  const activeRevisionCountByContractId = new Map<string, number>()
  for (const item of activeRevisionItems) {
    activeRevisionCountByContractId.set(
      item.contractId,
      (activeRevisionCountByContractId.get(item.contractId) ?? 0) + 1,
    )
  }

  return clientRows.map((row) => {
    const counterpartyIds = row.counterparties.map((c) => c.counterparty.id)
    const counterpartyIdSet = new Set(counterpartyIds)

    const contractsCount = contractRows.filter(
      (c) => c.counterpartyId && counterpartyIdSet.has(c.counterpartyId),
    ).length

    const totalRevenue = invoiceRows
      .filter((inv) => inv.counterpartyId && counterpartyIdSet.has(inv.counterpartyId))
      .reduce((sum, inv) => {
        const state = getPaymentState({
          amount: inv.amount,
          paidAt: inv.paidAt,
          settlements: inv.settlements,
        })
        return sum + (state.status === 'paid' ? Number(inv.amount) : 0)
      }, 0)

    const clientContractIds = counterpartyIds.flatMap(
      (id) => contractIdsByCounterpartyId.get(id) ?? [],
    )
    const activitiesCount = clientContractIds.reduce(
      (sum, id) => sum + (activeRevisionCountByContractId.get(id) ?? 0),
      0,
    )
    const blockedServicesCount = [
      ...new Set(clientContractIds),
    ].filter((id) => blockedContractIdSet.has(id)).length

    return {
      id: row.id,
      name: row.name,
      companyId: row.companyId,
      createdBy: row.createdBy,
      counterparties: row.counterparties.map((c) => c.counterparty),
      managers: row.managers.map((m) => ({ userId: m.user.id, name: m.user.name })),
      contacts: row.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
      })),
      contractsCount,
      totalRevenue,
      activitiesCount,
      blockedServicesCount,
    }
  })
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

    if (!session.user.id) {
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

    if (!session.user.id) {
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

// ─── Client detail ────────────────────────────────────────────────────────────

export const clientDetailQueryKey = (id: string) => ['clients', id] as const

export const fetchClientDetail = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<ClientDetail> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session.user.id) throw new Error('Не авторизован')

    const row = await db.query.client.findFirst({
      where: eq(client.id, data.id),
      columns: { id: true, name: true, companyId: true, createdBy: true, createdAt: true },
      with: {
        company: { columns: { id: true, name: true } },
        counterparties: {
          columns: {},
          with: {
            counterparty: {
              columns: { id: true, name: true, fullName: true, type: true, tin: true },
            },
          },
        },
        managers: {
          columns: {},
          with: { user: { columns: { id: true, name: true } } },
        },
        contacts: {
          columns: { id: true, name: true, position: true, phone: true, email: true },
        },
      },
    })

    if (!row) throw new Error('Клиент не найден')

    const counterpartyIds = row.counterparties.map((c) => c.counterparty.id)

    // ── Contracts ──────────────────────────────────────────────────────────
    const contractRows =
      counterpartyIds.length === 0
        ? []
        : await db.query.contract.findMany({
            where: inArray(contract.counterpartyId, counterpartyIds),
            columns: {
              id: true,
              name: true,
              number: true,
              signedAt: true,
              contractType: true,
              amount: true,
              businessLineId: true,
              counterpartyId: true,
            },
            with: {
              businessLine: { columns: { id: true, name: true } },
              counterparty: { columns: { id: true, name: true } },
              contractDocuments: {
                with: { document: { columns: { id: true, name: true, url: true } } },
              },
            },
          })

    const contractIds = contractRows.map((c) => c.id)
    const blockedServices = await getBlockedServicesByContractIds(contractIds)

    // ── Pending payments ───────────────────────────────────────────────────
    const paymentRows =
      counterpartyIds.length === 0
        ? []
        : await db.query.invoice.findMany({
            where: and(
              inArray(invoice.counterpartyId, counterpartyIds),
              eq(invoice.kind, 'receivable'),
              isNull(invoice.paidAt),
              isNull(invoice.archivedAt),
            ),
            columns: {
              id: true,
              amount: true,
              description: true,
              dueDate: true,
              counterpartyId: true,
            },
            with: {
              counterparty: { columns: { name: true } },
            },
          })

    // ── Active revisions ───────────────────────────────────────────────────
    const revisionRows =
      contractIds.length === 0
        ? []
        : await db
            .select({
              itemId: contractPriceRevisionItem.id,
              contractId: contractPriceRevisionItem.contractId,
              currentAmounts: contractPriceRevisionItem.currentAmounts,
              proposedAmounts: contractPriceRevisionItem.proposedAmounts,
              included: contractPriceRevisionItem.included,
              status: contractPriceRevisionItem.status,
              revisionId: contractPriceRevision.id,
              revisionName: contractPriceRevision.name,
              contractName: contract.name,
            })
            .from(contractPriceRevisionItem)
            .innerJoin(
              contractPriceRevision,
              and(
                eq(contractPriceRevisionItem.revisionId, contractPriceRevision.id),
                isNull(contractPriceRevision.completedAt),
              ),
            )
            .innerJoin(contract, eq(contractPriceRevisionItem.contractId, contract.id))
            .where(inArray(contractPriceRevisionItem.contractId, contractIds))

    // ── Amount history ─────────────────────────────────────────────────────
    const historyRows =
      contractIds.length === 0
        ? []
        : await db.query.contractAmountHistory.findMany({
            where: inArray(contractAmountHistory.contractId, contractIds),
            columns: {
              id: true,
              contractId: true,
              previousAmounts: true,
              newAmounts: true,
              changedAt: true,
            },
            with: {
              contract: { columns: { name: true } },
              changedByUser: { columns: { name: true } },
            },
            orderBy: desc(contractAmountHistory.changedAt),
            limit: 50,
          })

    return {
      id: row.id,
      name: row.name,
      companyId: row.companyId,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      company: row.company ?? null,
      counterparties: row.counterparties.map((c) => ({
        id: c.counterparty.id,
        name: c.counterparty.name,
        fullName: c.counterparty.fullName ?? null,
        type: c.counterparty.type ?? '',
        tin: c.counterparty.tin ?? null,
      })),
      managers: row.managers.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
      })),
      contracts: contractRows.map((c) => ({
        id: c.id,
        name: c.name,
        number: c.number ?? null,
        signedAt: c.signedAt ?? null,
        contractType: c.contractType,
        amount: c.amount,
        businessLine: c.businessLine,
        counterparty: c.counterparty,
        documents: c.contractDocuments.map((cd) => cd.document),
      })),
      pendingPayments: paymentRows.map((p) => ({
        id: p.id,
        amount: p.amount,
        description: p.description,
        dueDate: p.dueDate ?? null,
        counterpartyName: p.counterparty?.name ?? null,
      })),
      activeRevisions: revisionRows.map((r) => ({
        revisionId: r.revisionId,
        revisionName: r.revisionName,
        itemId: r.itemId,
        contractId: r.contractId,
        contractName: r.contractName,
        status: r.status,
        included: r.included,
        currentAmounts: r.currentAmounts,
        proposedAmounts: r.proposedAmounts,
      })),
      amountHistory: historyRows.map((h) => ({
        id: h.id,
        contractId: h.contractId,
        contractName: h.contract.name,
        previousAmounts: h.previousAmounts,
        newAmounts: h.newAmounts,
        changedAt: h.changedAt,
        changedByName: h.changedByUser.name,
      })),
      contacts: row.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
      })),
      blockedServices,
    }
  })

// ─── Contact CRUD ─────────────────────────────────────────────────────────────

const contactSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1, 'Введите имя'),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
})

export const addContact = createServerFn({ method: 'POST' })
  .inputValidator(contactSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session.user.id) throw new Error('Не авторизован')

    const [inserted] = await db
      .insert(contact)
      .values({
        clientId: data.clientId,
        name: data.name,
        position: data.position || null,
        phone: data.phone || null,
        email: data.email || null,
      })
      .returning()

    return inserted
  })

export const updateContact = createServerFn({ method: 'POST' })
  .inputValidator(contactSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session.user.id) throw new Error('Не авторизован')

    await db
      .update(contact)
      .set({
        name: data.name,
        position: data.position || null,
        phone: data.phone || null,
        email: data.email || null,
      })
      .where(eq(contact.id, data.id))
  })

export const deleteContact = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(contact).where(eq(contact.id, data.id))
  })
