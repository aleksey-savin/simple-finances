import { createServerFn } from '@tanstack/react-start'

import { z } from 'zod'
import { and, count, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '@/db'
import {
  companyCounterparty,
  counterparty,
  counterpartyTypeEnum,
  user,
  userCounterparty,
} from '@/db/schema'
import { getRequest, requireSession } from 'utils/session'
import {
  getScopedCounterpartyIds,
  resolveSelectedScope,
} from '#/lib/company-scope'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const counterpartiesQueryKey = ['counterparties'] as const

// ─── Fetch scoped list ────────────────────────────────────────────────────────

export const fetchCounterparties = createServerFn().handler(async () => {
  const session = await requireSession()
  const request = await getRequest()

  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  const ids = await getScopedCounterpartyIds(session.user.id, selectedScope)
  if (ids.length === 0) return []

  return db.query.counterparty.findMany({
    where: inArray(counterparty.id, ids),
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
    orderBy: (t, { asc }) => [asc(t.name)],
  })
})

// ─── Search global registry (find-or-create) ─────────────────────────────────

export const searchCounterparties = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ query: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    const q = data.query.trim()
    if (q.length < 2) return []

    const pattern = `%${q}%`
    const results = await db.query.counterparty.findMany({
      where: or(
        ilike(counterparty.name, pattern),
        ilike(counterparty.tin, pattern),
      ),
      columns: { id: true, name: true, fullName: true, type: true, tin: true },
      orderBy: (t, { asc }) => [asc(t.name)],
      limit: 15,
    })

    const scopeIds = new Set(
      await getScopedCounterpartyIds(session.user.id, selectedScope),
    )

    return results.map((r) => ({ ...r, inScope: scopeIds.has(r.id) }))
  })

// ─── Add existing counterparty to current scope ───────────────────────────────

export const addCounterpartyToScope = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ counterpartyId: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    if (selectedScope.kind === 'company') {
      await db
        .insert(companyCounterparty)
        .values({
          companyId: selectedScope.id,
          counterpartyId: data.counterpartyId,
        })
        .onConflictDoNothing()
    } else {
      await db
        .insert(userCounterparty)
        .values({
          userId: session.user.id,
          counterpartyId: data.counterpartyId,
        })
        .onConflictDoNothing()
    }
  })

// ─── Create new counterparty and add to current scope ────────────────────────

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
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

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

    if (selectedScope.kind === 'company') {
      await db
        .insert(companyCounterparty)
        .values({ companyId: selectedScope.id, counterpartyId: inserted.id })
    } else {
      await db
        .insert(userCounterparty)
        .values({ userId: session.user.id, counterpartyId: inserted.id })
    }

    return inserted.id
  })

// ─── Remove counterparty from current scope ───────────────────────────────────

export const removeCounterpartyFromScope = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ counterpartyId: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    if (selectedScope.kind === 'company') {
      await db
        .delete(companyCounterparty)
        .where(
          and(
            eq(companyCounterparty.companyId, selectedScope.id),
            eq(companyCounterparty.counterpartyId, data.counterpartyId),
          ),
        )
    } else {
      await db
        .delete(userCounterparty)
        .where(
          and(
            eq(userCounterparty.userId, session.user.id),
            eq(userCounterparty.counterpartyId, data.counterpartyId),
          ),
        )
    }
  })

// ─── Update counterparty fields ───────────────────────────────────────────────

export const updateCounterpartySchema = addCounterpartySchema.extend({
  id: z.string(),
})

export const updateCounterparty = createServerFn({ method: 'POST' })
  .inputValidator(updateCounterpartySchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const request = await getRequest()

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    // Count how many scopes reference this counterparty
    const [[companyRefs], [userRefs]] = await Promise.all([
      db
        .select({ n: count() })
        .from(companyCounterparty)
        .where(eq(companyCounterparty.counterpartyId, data.id)),
      db
        .select({ n: count() })
        .from(userCounterparty)
        .where(eq(userCounterparty.counterpartyId, data.id)),
    ])
    const totalRefs = (companyRefs?.n ?? 0) + (userRefs?.n ?? 0)

    if (totalRefs <= 1) {
      // Only this scope uses it — update in place
      await db
        .update(counterparty)
        .set({
          name: data.name,
          fullName: data.fullName ?? null,
          type: data.type,
          tin: data.tin ?? null,
          linkedUserId: data.linkedUserId ?? null,
        })
        .where(eq(counterparty.id, data.id))
      return
    }

    // Shared — fork: create a new counterparty and redirect this scope's junction entry
    const [forked] = await db
      .insert(counterparty)
      .values({
        name: data.name,
        fullName: data.fullName,
        type: data.type,
        tin: data.tin,
        linkedUserId: data.linkedUserId ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: counterparty.id })

    if (selectedScope.kind === 'company') {
      await db
        .update(companyCounterparty)
        .set({ counterpartyId: forked.id })
        .where(
          and(
            eq(companyCounterparty.companyId, selectedScope.id),
            eq(companyCounterparty.counterpartyId, data.id),
          ),
        )
    } else {
      await db
        .update(userCounterparty)
        .set({ counterpartyId: forked.id })
        .where(
          and(
            eq(userCounterparty.userId, session.user.id),
            eq(userCounterparty.counterpartyId, data.id),
          ),
        )
    }
  })

// ─── Search user by email ─────────────────────────────────────────────────────

export const searchUserByEmail = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

    if (!data.email) return null

    const found = await db.query.user.findFirst({
      where: eq(user.email, data.email),
      columns: { id: true, name: true, email: true },
    })

    return found ?? null
  })
