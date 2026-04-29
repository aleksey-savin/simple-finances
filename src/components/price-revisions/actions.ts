import { createServerFn } from '@tanstack/react-start'

import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db/index.server'
import {
  client,
  contact,
  contract,
  contractAmountHistory,
  contractPriceRevision,
  contractPriceRevisionItem,
  clientCounterparty,
  clientManager,
  user,
} from '@/db/schema'
import { inArray } from 'drizzle-orm'
import type { PriceRevisionDetail, PriceRevision } from '@/types'
import { getRequest, requireSession } from '#/utils/session.server'
import { resolveSelectedScope } from '#/lib/company-scope'

// Throws if the revision has been marked completed
async function assertRevisionOpen(revisionId: string) {
  const revision = await db.query.contractPriceRevision.findFirst({
    where: eq(contractPriceRevision.id, revisionId),
    columns: { completedAt: true },
  })
  if (revision?.completedAt) {
    throw new Error('Ревизия завершена и не допускает изменений')
  }
}

export const priceRevisionsQueryKey = ['price-revisions'] as const
export const priceRevisionQueryKey = (id: string) =>
  ['price-revisions', id] as const

// ─── Fetch list ───────────────────────────────────────────────────────────────

export const fetchPriceRevisions = createServerFn().handler(
  async (): Promise<PriceRevision[]> => {
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    const whereClause =
      selectedScope.kind === 'company'
        ? eq(contractPriceRevision.companyId, selectedScope.id)
        : and(
            isNull(contractPriceRevision.companyId),
            eq(contractPriceRevision.createdBy, session.user.id),
          )

    const revisions = await db.query.contractPriceRevision.findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        businessLineId: true,
        companyId: true,
        createdAt: true,
        completedAt: true,
      },
      with: {
        businessLine: { columns: { id: true, name: true } },
        items: { columns: { id: true } },
      },
      orderBy: (table, { desc }) => desc(table.createdAt),
    })

    return revisions.map((r) => ({
      id: r.id,
      name: r.name,
      businessLineId: r.businessLineId,
      companyId: r.companyId,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      businessLine: r.businessLine!,
      itemCount: r.items.length,
    }))
  },
)

// ─── Fetch single ─────────────────────────────────────────────────────────────

export const fetchPriceRevision = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<PriceRevisionDetail> => {
    const session = await requireSession()

    const revision = await db.query.contractPriceRevision.findFirst({
      where: eq(contractPriceRevision.id, data.id),
      columns: {
        id: true,
        name: true,
        businessLineId: true,
        companyId: true,
        createdAt: true,
        completedAt: true,
      },
      with: {
        businessLine: { columns: { id: true, name: true } },
        items: {
          columns: {
            id: true,
            revisionId: true,
            contractId: true,
            currentAmounts: true,
            proposedAmounts: true,
            notes: true,
            included: true,
            status: true,
            notifiedAt: true,
            agreedAt: true,
            signedAt: true,
            completedAt: true,
          },
          with: {
            contract: {
              columns: { id: true, name: true, number: true, signedAt: true },
              with: {
                counterparty: { columns: { id: true, name: true } },
                contractDocuments: {
                  with: {
                    document: { columns: { id: true, name: true, url: true } },
                  },
                },
              },
            },
          },
          orderBy: (table, { asc }) => asc(table.id),
        },
      },
    })

    if (!revision) throw new Error('Ревизия не найдена')

    const counterpartyIds = [
      ...new Set(revision.items.map((i) => i.contract!.counterparty!.id)),
    ]

    const managersMap = new Map<string, { userId: string; name: string }[]>()
    const clientMap = new Map<string, { id: string; name: string }>()
    const contactsMap = new Map<
      string,
      {
        id: string
        name: string
        position: string | null
        phone: string | null
        email: string | null
      }[]
    >()

    if (counterpartyIds.length > 0) {
      const [managerRows, clientRows, contactRows] = await Promise.all([
        db
          .select({
            counterpartyId: clientCounterparty.counterpartyId,
            userId: clientManager.userId,
            userName: user.name,
          })
          .from(clientCounterparty)
          .innerJoin(
            clientManager,
            eq(clientManager.clientId, clientCounterparty.clientId),
          )
          .innerJoin(user, eq(user.id, clientManager.userId))
          .where(inArray(clientCounterparty.counterpartyId, counterpartyIds)),
        db
          .select({
            counterpartyId: clientCounterparty.counterpartyId,
            clientId: client.id,
            clientName: client.name,
          })
          .from(clientCounterparty)
          .innerJoin(client, eq(client.id, clientCounterparty.clientId))
          .where(inArray(clientCounterparty.counterpartyId, counterpartyIds)),
        db
          .select({
            counterpartyId: clientCounterparty.counterpartyId,
            id: contact.id,
            name: contact.name,
            position: contact.position,
            phone: contact.phone,
            email: contact.email,
          })
          .from(contact)
          .innerJoin(
            clientCounterparty,
            eq(clientCounterparty.clientId, contact.clientId),
          )
          .where(inArray(clientCounterparty.counterpartyId, counterpartyIds)),
      ])

      for (const row of managerRows) {
        const list = managersMap.get(row.counterpartyId) ?? []
        if (!list.some((m) => m.userId === row.userId)) {
          list.push({ userId: row.userId, name: row.userName })
        }
        managersMap.set(row.counterpartyId, list)
      }

      for (const row of clientRows) {
        if (!clientMap.has(row.counterpartyId)) {
          clientMap.set(row.counterpartyId, {
            id: row.clientId,
            name: row.clientName,
          })
        }
      }

      for (const row of contactRows) {
        const list = contactsMap.get(row.counterpartyId) ?? []
        if (!list.some((c) => c.id === row.id)) {
          list.push({
            id: row.id,
            name: row.name,
            position: row.position ?? null,
            phone: row.phone ?? null,
            email: row.email ?? null,
          })
        }
        contactsMap.set(row.counterpartyId, list)
      }
    }

    return {
      id: revision.id,
      name: revision.name,
      businessLineId: revision.businessLineId,
      companyId: revision.companyId,
      createdAt: revision.createdAt,
      completedAt: revision.completedAt,
      businessLine: revision.businessLine!,
      items: revision.items
        .map((item) => ({
          ...item,
          contract: {
            ...item.contract!,
            signedAt: item.contract!.signedAt ?? null,
            counterparty: {
              ...item.contract!.counterparty!,
              client: clientMap.get(item.contract!.counterparty!.id) ?? null,
              contacts: contactsMap.get(item.contract!.counterparty!.id) ?? [],
            },
            documents: item.contract!.contractDocuments.map(
              (cd) => cd.document,
            ),
          },
          managers: managersMap.get(item.contract!.counterparty!.id) ?? [],
        }))
        .sort((a, b) => {
          const nameA = (
            a.contract.counterparty.client?.name ?? a.contract.counterparty.name
          ).toLowerCase()
          const nameB = (
            b.contract.counterparty.client?.name ?? b.contract.counterparty.name
          ).toLowerCase()
          return nameA.localeCompare(nameB, 'ru')
        }),
    }
  })

// ─── Complete / reopen revision ───────────────────────────────────────────────

export const completeRevision = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db
      .update(contractPriceRevision)
      .set({ completedAt: new Date() })
      .where(eq(contractPriceRevision.id, data.id))
  })

export const reopenRevision = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db
      .update(contractPriceRevision)
      .set({ completedAt: null })
      .where(eq(contractPriceRevision.id, data.id))
  })

// ─── Create revision ──────────────────────────────────────────────────────────

const createPriceRevisionSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  businessLineId: z.string().min(1, 'Выберите направление'),
  companyId: z.string().optional(),
})

export const createPriceRevision = createServerFn({ method: 'POST' })
  .inputValidator(createPriceRevisionSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    const companyId =
      data.companyId ??
      (selectedScope.kind === 'company' ? selectedScope.id : null)

    // Fetch all contracts for the selected business line + scope
    const whereClause =
      selectedScope.kind === 'company'
        ? and(
            eq(contract.businessLineId, data.businessLineId),
            eq(contract.companyId, selectedScope.id),
          )
        : and(
            eq(contract.businessLineId, data.businessLineId),
            isNull(contract.companyId),
            eq(contract.createdBy, session.user.id),
          )

    const contracts = await db.query.contract.findMany({
      where: whereClause,
      columns: { id: true, amount: true },
    })

    const [revision] = await db
      .insert(contractPriceRevision)
      .values({
        name: data.name,
        businessLineId: data.businessLineId,
        companyId,
        createdBy: session.user.id,
      })
      .returning({ id: contractPriceRevision.id })

    if (contracts.length > 0) {
      await db.insert(contractPriceRevisionItem).values(
        contracts.map((c) => ({
          revisionId: revision.id,
          contractId: c.id,
          currentAmounts: c.amount,
          proposedAmounts: c.amount,
        })),
      )
    }

    return revision
  })

// ─── Delete revision ──────────────────────────────────────────────────────────

export const deletePriceRevision = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db
      .delete(contractPriceRevision)
      .where(eq(contractPriceRevision.id, data.id))
  })

// ─── Update revision item ─────────────────────────────────────────────────────

const updateRevisionItemSchema = z.object({
  id: z.string(),
  proposedAmounts: z.array(z.string()).optional(),
  notes: z.string().optional(),
  included: z.boolean().optional(),
})

export const updateRevisionItem = createServerFn({ method: 'POST' })
  .inputValidator(updateRevisionItemSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    const item = await db.query.contractPriceRevisionItem.findFirst({
      where: eq(contractPriceRevisionItem.id, data.id),
      columns: { revisionId: true },
    })
    if (!item) throw new Error('Элемент не найден')
    await assertRevisionOpen(item.revisionId)

    const updates: Record<string, unknown> = {}
    if (data.proposedAmounts !== undefined)
      updates.proposedAmounts = data.proposedAmounts
    if (data.notes !== undefined)
      updates.notes = data.notes.trim() === '' ? null : data.notes
    if (data.included !== undefined) updates.included = data.included

    await db
      .update(contractPriceRevisionItem)
      .set(updates)
      .where(eq(contractPriceRevisionItem.id, data.id))
  })

// ─── Apply bulk adjustment ────────────────────────────────────────────────────

const applyBulkAdjustmentSchema = z.object({
  revisionId: z.string(),
  mode: z.enum(['percent', 'fixed', 'reset']),
  value: z.string().optional(),
})

export const applyBulkAdjustment = createServerFn({ method: 'POST' })
  .inputValidator(applyBulkAdjustmentSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    await assertRevisionOpen(data.revisionId)

    const items = await db.query.contractPriceRevisionItem.findMany({
      where: and(
        eq(contractPriceRevisionItem.revisionId, data.revisionId),
        eq(contractPriceRevisionItem.included, true),
      ),
      columns: { id: true, currentAmounts: true },
    })

    if (items.length === 0) return

    const v = data.value ? Number(data.value) : 0

    for (const item of items) {
      const proposedAmounts = item.currentAmounts.map((amt) => {
        const current = Number(amt)
        let proposed: number
        if (data.mode === 'percent') {
          proposed = current * (1 + v / 100)
        } else if (data.mode === 'fixed') {
          proposed = current + v
        } else {
          proposed = current
        }
        return proposed.toFixed(2)
      })
      await db
        .update(contractPriceRevisionItem)
        .set({ proposedAmounts })
        .where(eq(contractPriceRevisionItem.id, item.id))
    }
  })

// ─── Advance item status ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['agreed'],
  agreed: ['notified'],
  notified: ['signed'],
  signed: ['success'],
}

const STATUS_TIMESTAMP_FIELD: Record<string, string> = {
  notified: 'notifiedAt',
  agreed: 'agreedAt',
  signed: 'signedAt',
  success: 'completedAt',
}

const advanceRevisionItemStatusSchema = z.object({
  id: z.string(),
  targetStatus: z.enum(['notified', 'agreed', 'signed', 'success']),
})

export const advanceRevisionItemStatus = createServerFn({ method: 'POST' })
  .inputValidator(advanceRevisionItemStatusSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    const item = await db.query.contractPriceRevisionItem.findFirst({
      where: eq(contractPriceRevisionItem.id, data.id),
      columns: {
        id: true,
        status: true,
        contractId: true,
        proposedAmounts: true,
        revisionId: true,
      },
    })
    if (!item) throw new Error('Элемент не найден')
    await assertRevisionOpen(item.revisionId)

    const allowed = VALID_TRANSITIONS[item.status]
    if (!allowed?.includes(data.targetStatus)) {
      throw new Error(
        `Переход ${item.status} → ${data.targetStatus} недопустим`,
      )
    }

    const timestampField = STATUS_TIMESTAMP_FIELD[data.targetStatus]
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(contractPriceRevisionItem)
        .set({ status: data.targetStatus, [timestampField]: now })
        .where(eq(contractPriceRevisionItem.id, data.id))

      if (data.targetStatus === 'success') {
        const [currentContract] = await tx
          .select({ amount: contract.amount })
          .from(contract)
          .where(eq(contract.id, item.contractId))

        if (currentContract) {
          await tx.insert(contractAmountHistory).values({
            contractId: item.contractId,
            previousAmounts: currentContract.amount,
            newAmounts: item.proposedAmounts,
            revisionItemId: item.id,
            changedBy: session.user.id,
            changedAt: now,
          })

          await tx
            .update(contract)
            .set({ amount: item.proposedAmounts })
            .where(eq(contract.id, item.contractId))
        }
      }
    })
  })

// ─── Revert item status ───────────────────────────────────────────────────────

const PREV_STATUS: Record<string, string> = {
  agreed: 'draft',
  notified: 'agreed',
  signed: 'notified',
  success: 'signed',
}

const CLEAR_TIMESTAMP_ON_REVERT: Record<string, string[]> = {
  notified: ['notifiedAt'],
  agreed: ['agreedAt'],
  signed: ['signedAt'],
  success: ['completedAt'],
}

export const revertRevisionItemStatus = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()

    const item = await db.query.contractPriceRevisionItem.findFirst({
      where: eq(contractPriceRevisionItem.id, data.id),
      columns: { id: true, status: true, contractId: true, revisionId: true },
    })
    if (!item) throw new Error('Элемент не найден')
    if (item.status === 'draft') throw new Error('Уже в начальном статусе')

    await assertRevisionOpen(item.revisionId)

    const prevStatus = PREV_STATUS[item.status]
    const clearFields = CLEAR_TIMESTAMP_ON_REVERT[item.status]

    const updates: Record<string, unknown> = { status: prevStatus }
    for (const field of clearFields) {
      updates[field] = null
    }

    await db.transaction(async (tx) => {
      await tx
        .update(contractPriceRevisionItem)
        .set(updates)
        .where(eq(contractPriceRevisionItem.id, data.id))

      // If reverting from success: restore previous contract amounts from history
      if (item.status === 'success') {
        const historyRecord = await tx.query.contractAmountHistory.findFirst({
          where: eq(contractAmountHistory.revisionItemId, data.id),
          columns: { id: true, previousAmounts: true },
        })
        if (historyRecord) {
          await tx
            .update(contract)
            .set({ amount: historyRecord.previousAmounts })
            .where(eq(contract.id, item.contractId))
          await tx
            .delete(contractAmountHistory)
            .where(eq(contractAmountHistory.id, historyRecord.id))
        }
      }
    })
  })
