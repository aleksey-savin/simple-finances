import { db } from '@/db'
import { currentAccount, currentAccountUser, user } from '@/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from 'utils/auth'
import z from 'zod'

// ─── Query key ────────────────────────────────────────────────────────────────

export const accountsQueryKey = ['accounts'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchAccounts = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

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
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

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
  acceptPayments: z.boolean(),
})

export const addAccount = createServerFn({ method: 'POST' })
  .inputValidator(addAccountFormSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(currentAccount)
      .values({
        name: data.name,
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
  acceptPayments: z.boolean(),
})

export const updateAccount = createServerFn({ method: 'POST' })
  .inputValidator(updateAccountSchema)
  .handler(async ({ data }) => {
    await db
      .update(currentAccount)
      .set({ name: data.name, acceptPayments: data.acceptPayments })
      .where(eq(currentAccount.id, data.id))
  })

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
