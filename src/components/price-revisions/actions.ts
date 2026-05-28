import { createServerFn } from '@tanstack/react-start'

import { and, eq, inArray, isNull, notInArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db/index.server'
import {
  client,
  contact,
  contract,
  contractAmountHistory,
  contractPriceRevision,
  contractPriceRevisionBulkSnapshot,
  contractPriceRevisionItem,
  clientCounterparty,
  clientManager,
  counterparty,
  user,
} from '@/db/schema'
import type {
  AvailableContractForRevision,
  PriceRevisionDetail,
  PriceRevision,
} from '@/types'
import { getRequest, requireSession } from '#/utils/session.server'
import { resolveSelectedScope } from '#/lib/company-scope'
import { syncRecurringRuleAmountsForContract } from '#/lib/recurring'

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

// Build the where-clause that scopes a `contract` query to a revision's
// businessLine + (company OR personal-scope createdBy) context.
async function buildRevisionContractScopeWhere(revisionId: string) {
  const session = await requireSession()
  const revision = await db.query.contractPriceRevision.findFirst({
    where: eq(contractPriceRevision.id, revisionId),
    columns: { businessLineId: true, companyId: true },
  })
  if (!revision) throw new Error('Ревизия не найдена')

  const where = revision.companyId
    ? and(
        eq(contract.businessLineId, revision.businessLineId),
        eq(contract.companyId, revision.companyId),
      )
    : and(
        eq(contract.businessLineId, revision.businessLineId),
        isNull(contract.companyId),
        eq(contract.createdBy, session.user.id),
      )

  return { where, revision }
}

function formatActionLabel(
  mode: 'percent' | 'fixed' | 'reset',
  value: number,
): string {
  if (mode === 'reset') return 'Сброс'
  const sign = value > 0 ? '+' : ''
  if (mode === 'percent') return `${sign}${value}%`
  return `${sign}${value} ₽`
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
        startedAt: true,
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
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      businessLine: r.businessLine,
      itemCount: r.items.length,
    }))
  },
)

// ─── Fetch single ─────────────────────────────────────────────────────────────

export const fetchPriceRevision = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<PriceRevisionDetail> => {
    await requireSession()

    const revision = await db.query.contractPriceRevision.findFirst({
      where: eq(contractPriceRevision.id, data.id),
      columns: {
        id: true,
        name: true,
        businessLineId: true,
        companyId: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
      with: {
        businessLine: { columns: { id: true, name: true } },
        bulkSnapshot: { columns: { actionLabel: true } },
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
      ...new Set(revision.items.map((i) => i.contract.counterparty.id)),
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
      startedAt: revision.startedAt,
      completedAt: revision.completedAt,
      businessLine: revision.businessLine,
      bulkSnapshot: (revision.bulkSnapshot as { actionLabel: string } | null)
        ? { actionLabel: revision.bulkSnapshot.actionLabel }
        : null,
      items: revision.items
        .map((item) => ({
          ...item,
          contract: {
            ...item.contract,
            signedAt: item.contract.signedAt ?? null,
            counterparty: {
              ...item.contract.counterparty,
              client: clientMap.get(item.contract.counterparty.id) ?? null,
              contacts: contactsMap.get(item.contract.counterparty.id) ?? [],
            },
            documents: item.contract.contractDocuments.map((cd) => cd.document),
          },
          managers: managersMap.get(item.contract.counterparty.id) ?? [],
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

// ─── Start / complete / reopen revision ───────────────────────────────────────

export const startRevision = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

    const revision = await db.query.contractPriceRevision.findFirst({
      where: eq(contractPriceRevision.id, data.id),
      columns: { startedAt: true, completedAt: true },
    })
    if (!revision) throw new Error('Ревизия не найдена')
    if (revision.completedAt) throw new Error('Ревизия уже завершена')
    if (revision.startedAt) return

    await db
      .update(contractPriceRevision)
      .set({ startedAt: new Date() })
      .where(eq(contractPriceRevision.id, data.id))
  })

export const completeRevision = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

    const revision = await db.query.contractPriceRevision.findFirst({
      where: eq(contractPriceRevision.id, data.id),
      columns: { startedAt: true, completedAt: true },
    })
    if (!revision) throw new Error('Ревизия не найдена')
    if (!revision.startedAt)
      throw new Error('Сначала возьмите ревизию в работу')
    if (revision.completedAt) return

    await db
      .update(contractPriceRevision)
      .set({ completedAt: new Date() })
      .where(eq(contractPriceRevision.id, data.id))
  })

export const reopenRevision = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

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
    await requireSession()

    const revision = await db.query.contractPriceRevision.findFirst({
      where: eq(contractPriceRevision.id, data.id),
      columns: { startedAt: true, completedAt: true },
    })
    if (!revision) return
    if (revision.startedAt || revision.completedAt) {
      throw new Error('Удалять можно только черновики')
    }

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
    await requireSession()

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
    await requireSession()

    await assertRevisionOpen(data.revisionId)

    const items = await db.query.contractPriceRevisionItem.findMany({
      where: and(
        eq(contractPriceRevisionItem.revisionId, data.revisionId),
        eq(contractPriceRevisionItem.included, true),
      ),
      columns: { id: true, currentAmounts: true, proposedAmounts: true },
    })

    if (items.length === 0) return

    const v = data.value ? Number(data.value) : 0
    const actionLabel = formatActionLabel(data.mode, v)

    await db.transaction(async (tx) => {
      // Snapshot current proposedAmounts for single-step undo (upsert).
      await tx
        .insert(contractPriceRevisionBulkSnapshot)
        .values({
          revisionId: data.revisionId,
          actionLabel,
          items: items.map((i) => ({
            itemId: i.id,
            proposedAmounts: i.proposedAmounts,
          })),
        })
        .onConflictDoUpdate({
          target: contractPriceRevisionBulkSnapshot.revisionId,
          set: {
            actionLabel,
            items: items.map((i) => ({
              itemId: i.id,
              proposedAmounts: i.proposedAmounts,
            })),
            createdAt: new Date(),
          },
        })

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
        await tx
          .update(contractPriceRevisionItem)
          .set({ proposedAmounts })
          .where(eq(contractPriceRevisionItem.id, item.id))
      }
    })
  })

// ─── Undo last bulk adjustment ────────────────────────────────────────────────

export const undoBulkAdjustment = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ revisionId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    await assertRevisionOpen(data.revisionId)

    const snapshot = await db.query.contractPriceRevisionBulkSnapshot.findFirst(
      {
        where: eq(
          contractPriceRevisionBulkSnapshot.revisionId,
          data.revisionId,
        ),
        columns: { id: true, items: true },
      },
    )
    if (!snapshot) throw new Error('Нет последнего изменения для отмены')

    await db.transaction(async (tx) => {
      for (const entry of snapshot.items) {
        await tx
          .update(contractPriceRevisionItem)
          .set({ proposedAmounts: entry.proposedAmounts })
          .where(
            and(
              eq(contractPriceRevisionItem.id, entry.itemId),
              eq(contractPriceRevisionItem.revisionId, data.revisionId),
            ),
          )
      }
      await tx
        .delete(contractPriceRevisionBulkSnapshot)
        .where(eq(contractPriceRevisionBulkSnapshot.id, snapshot.id))
    })
  })

// ─── Add contracts to revision ────────────────────────────────────────────────

export const fetchAvailableContractsForRevision = createServerFn()
  .inputValidator(z.object({ revisionId: z.string() }))
  .handler(async ({ data }): Promise<AvailableContractForRevision[]> => {
    await requireSession()
    const { where } = await buildRevisionContractScopeWhere(data.revisionId)

    const existingIds = await db
      .select({ contractId: contractPriceRevisionItem.contractId })
      .from(contractPriceRevisionItem)
      .where(eq(contractPriceRevisionItem.revisionId, data.revisionId))
    const existing = existingIds.map((r) => r.contractId)

    const rows = await db
      .select({
        id: contract.id,
        name: contract.name,
        number: contract.number,
        counterpartyName: counterparty.name,
      })
      .from(contract)
      .innerJoin(counterparty, eq(counterparty.id, contract.counterpartyId))
      .where(
        existing.length > 0
          ? and(where, notInArray(contract.id, existing))
          : where,
      )
      .orderBy(contract.name)

    return rows
  })

export const addContractsToRevision = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      revisionId: z.string(),
      contractIds: z.array(z.string()).min(1),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession()
    await assertRevisionOpen(data.revisionId)
    const { where } = await buildRevisionContractScopeWhere(data.revisionId)

    const contracts = await db
      .select({ id: contract.id, amount: contract.amount })
      .from(contract)
      .where(and(where, inArray(contract.id, data.contractIds)))

    if (contracts.length === 0) return

    await db.insert(contractPriceRevisionItem).values(
      contracts.map((c) => ({
        revisionId: data.revisionId,
        contractId: c.id,
        currentAmounts: c.amount,
        proposedAmounts: c.amount,
      })),
    )
  })

// ─── Advance item status ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<string, string[]>> = {
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
        const currentContract = (
          await tx
            .select({ amount: contract.amount })
            .from(contract)
            .where(eq(contract.id, item.contractId))
        ).at(0)

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

          await syncRecurringRuleAmountsForContract(
            tx,
            item.contractId,
            item.proposedAmounts,
          )
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
    await requireSession()

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
          await syncRecurringRuleAmountsForContract(
            tx,
            item.contractId,
            historyRecord.previousAmounts,
          )
          await tx
            .delete(contractAmountHistory)
            .where(eq(contractAmountHistory.id, historyRecord.id))
        }
      }
    })
  })
