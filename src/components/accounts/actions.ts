import { db } from '#/db/index.server'
import { currentAccount, currentAccountUser, user } from '@/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import { requireSession } from '#/utils/session.server'
import z from 'zod'

import { decodeHtmlEntities } from '#/lib/html-entities'

// ─── Query key ────────────────────────────────────────────────────────────────

export const accountsQueryKey = ['accounts'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchAccounts = createServerFn().handler(async () => {
  const session = await requireSession()

  const userId = session.user.id

  const memberships = await db
    .select({
      currentAccountId: currentAccountUser.currentAccountId,
      role: currentAccountUser.role,
    })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  if (memberships.length === 0) return []

  const accountIds = memberships.map((m) => m.currentAccountId)
  const roleByAccountId = new Map(
    memberships.map((m) => [m.currentAccountId, m.role]),
  )

  const accountsData = await db.query.currentAccount.findMany({
    where: inArray(currentAccount.id, accountIds),
    orderBy: (table, { asc }) => asc(table.name),
    with: {
      members: {
        with: {
          user: { columns: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return accountsData.map((a) => ({
    ...a,
    role: roleByAccountId.get(a.id) ?? 'viewer',
  }))
})

// ── Shared helpers ────────────────────────────────────────────────────────────

async function requireOwner(accountId: string) {
  const session = await requireSession()

  const ownership = await db.query.currentAccountUser.findFirst({
    where: and(
      eq(currentAccountUser.currentAccountId, accountId),
      eq(currentAccountUser.userId, session.user.id),
      eq(currentAccountUser.role, 'owner'),
    ),
  })
  if (!ownership) throw new Error('Только владелец может управлять доступом')

  return session.user.id
}

// ── Account CRUD ──────────────────────────────────────────────────────────────

const deleteAccountSchema = z.object({ id: z.string() })

export const deleteAccount = createServerFn({ method: 'POST' })
  .inputValidator(deleteAccountSchema)
  .handler(async ({ data }) => {
    await db.delete(currentAccount).where(eq(currentAccount.id, data.id))
  })

export const addAccountFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  bankBik: z.string().regex(/^\d{9}$/, 'БИК должен содержать 9 цифр'),
  accountNumber: z.string().trim(),
  acceptPayments: z.boolean(),
})

export const addAccount = createServerFn({ method: 'POST' })
  .inputValidator(addAccountFormSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    const bankDetails = await fetchBankDetailsByBik(data.bankBik)

    const [inserted] = await db
      .insert(currentAccount)
      .values({
        name: data.name,
        bankName: bankDetails.name,
        bankNameInitials: bankDetails.namemini,
        bankBik: bankDetails.bik,
        bankKs: bankDetails.ks,
        accountNumber: normalizeAccountNumber(data.accountNumber),
        acceptPayments: data.acceptPayments,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: currentAccount.id })

    await db.insert(currentAccountUser).values({
      currentAccountId: inserted.id,
      userId: session.user.id,
      role: 'owner',
    })

    return inserted.id
  })

export const updateAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Минимум 2 символа'),
  bankBik: z.string().regex(/^\d{9}$/, 'БИК должен содержать 9 цифр'),
  accountNumber: z.string().trim(),
  acceptPayments: z.boolean(),
})

export const updateAccount = createServerFn({ method: 'POST' })
  .inputValidator(updateAccountSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    const bankDetails = await fetchBankDetailsByBik(data.bankBik)

    await db
      .update(currentAccount)
      .set({
        name: data.name,
        bankName: bankDetails.name,
        bankNameInitials: bankDetails.namemini,
        bankBik: bankDetails.bik,
        bankKs: bankDetails.ks,
        accountNumber: normalizeAccountNumber(data.accountNumber),
        acceptPayments: data.acceptPayments,
        updatedBy: session.user.id,
      })
      .where(eq(currentAccount.id, data.id))
  })

export const correctAccountBalanceSchema = z.object({
  accountId: z.string(),
  balance: z.coerce.number().finite('Введите корректную сумму'),
})

export const correctAccountBalance = createServerFn({ method: 'POST' })
  .inputValidator(correctAccountBalanceSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    await db
      .update(currentAccount)
      .set({
        balance: data.balance.toFixed(2),
        updatedBy: session.user.id,
      })
      .where(eq(currentAccount.id, data.accountId))

    return { ok: true }
  })

function normalizeAccountNumber(value: string) {
  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

type BIKInfoResponse = {
  bik?: string
  ks?: string
  name?: string
  namemini?: string
}

async function fetchBankDetailsByBik(bik: string) {
  const response = await fetch(
    `https://bik-info.ru/api.html?type=json&bik=${encodeURIComponent(bik)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Не удалось получить реквизиты банка по БИК')
  }

  const payload = (await response.json()) as
    | BIKInfoResponse
    | BIKInfoResponse[]
    | null

  const result = Array.isArray(payload) ? payload[0] : payload

  if (!result?.bik || !result?.name || !result?.namemini || !result?.ks) {
    throw new Error('Банк с таким БИК не найден')
  }

  return {
    bik: result.bik,
    ks: result.ks,
    name: decodeHtmlEntities(result.name) ?? result.name,
    namemini: decodeHtmlEntities(result.namemini) ?? result.namemini,
  }
}

// ── Account members ───────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  accountId: z.string(),
  email: z.email('Введите корректный email'),
  role: z.enum(['editor', 'viewer']),
})

export const addMember = createServerFn({ method: 'POST' })
  .inputValidator(addMemberSchema)
  .handler(async ({ data }) => {
    const invitedBy = await requireOwner(data.accountId)

    const targetUser = await db.query.user.findFirst({
      where: eq(user.email, data.email),
    })
    if (!targetUser) throw new Error('Пользователь не найден')

    const existing = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.currentAccountId, data.accountId),
        eq(currentAccountUser.userId, targetUser.id),
      ),
    })
    if (existing) throw new Error('Пользователь уже является участником')

    await db.insert(currentAccountUser).values({
      currentAccountId: data.accountId,
      userId: targetUser.id,
      role: data.role,
      invitedBy,
    })
  })

const removeMemberSchema = z.object({
  memberId: z.string(),
  accountId: z.string(),
})

export const removeMember = createServerFn({ method: 'POST' })
  .inputValidator(removeMemberSchema)
  .handler(async ({ data }) => {
    await requireOwner(data.accountId)

    const member = await db.query.currentAccountUser.findFirst({
      where: eq(currentAccountUser.id, data.memberId),
    })
    if (member?.role === 'owner') throw new Error('Нельзя удалить владельца')

    await db
      .delete(currentAccountUser)
      .where(eq(currentAccountUser.id, data.memberId))
  })
