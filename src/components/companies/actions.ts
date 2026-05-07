import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db/index.server'
import {
  company,
  companyCurrentAccount,
  currentAccount,
  currentAccountUser,
} from '@/db/schema'
import { requireSession } from '#/utils/session.server'

export const companiesQueryKey = ['companies'] as const

export const fetchCompanies = createServerFn().handler(async () => {
  const session = await requireSession()

  const accountIds = await getAccessibleAccountIds(session.user.id)
  if (accountIds.length === 0) return []

  const accessibleAccountSet = new Set(accountIds)

  return db.query.company
    .findMany({
      with: {
        currentAccounts: {
          with: {
            currentAccount: {
              columns: { id: true, name: true },
              with: {
                members: {
                  with: {
                    user: { columns: { id: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((rows) =>
      rows
        .map((row) => {
          const accounts = row.currentAccounts
            .map((item) => item.currentAccount)
            .filter((account) => accessibleAccountSet.has(account.id))

          const seenUserIds = new Map<
            string,
            { userId: string; name: string; email: string; role: string }
          >()
          for (const item of row.currentAccounts) {
            for (const cu of item.currentAccount.members) {
              if (!seenUserIds.has(cu.userId)) {
                seenUserIds.set(cu.userId, {
                  userId: cu.userId,
                  name: cu.user.name,
                  email: cu.user.email,
                  role: cu.role,
                })
              }
            }
          }

          return {
            id: row.id,
            name: row.name,
            createdBy: row.createdBy,
            accounts,
            members: [...seenUserIds.values()],
          }
        })
        .filter((row) => row.accounts.length > 0),
    )
})

const companySchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  accountIds: z.array(z.string()).min(1, 'Выберите хотя бы один счёт'),
})

export const addCompanySchema = companySchema

export const addCompany = createServerFn({ method: 'POST' })
  .inputValidator(addCompanySchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    await ensureAccountSelectionIsAvailable(session.user.id, data.accountIds)

    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(company)
        .values({
          name: data.name,
          createdBy: session.user.id,
        })
        .returning({ id: company.id })

      await tx.insert(companyCurrentAccount).values(
        data.accountIds.map((currentAccountId) => ({
          companyId: inserted.id,
          currentAccountId,
        })),
      )
    })
  })

export const updateCompanySchema = companySchema.extend({
  id: z.string(),
})

export const updateCompany = createServerFn({ method: 'POST' })
  .inputValidator(updateCompanySchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    await ensureAccountSelectionIsAvailable(
      session.user.id,
      data.accountIds,
      data.id,
    )

    await db.transaction(async (tx) => {
      await tx
        .update(company)
        .set({
          name: data.name,
        })
        .where(eq(company.id, data.id))

      await tx
        .delete(companyCurrentAccount)
        .where(eq(companyCurrentAccount.companyId, data.id))

      await tx.insert(companyCurrentAccount).values(
        data.accountIds.map((currentAccountId) => ({
          companyId: data.id,
          currentAccountId,
        })),
      )
    })
  })

const deleteCompanySchema = z.object({ id: z.string() })

export const deleteCompany = createServerFn({ method: 'POST' })
  .inputValidator(deleteCompanySchema)
  .handler(async ({ data }) => {
    await db.delete(company).where(eq(company.id, data.id))
  })

async function getAccessibleAccountIds(userId: string) {
  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  return memberships.map((membership) => membership.currentAccountId)
}

async function getCompanyAccountIds(companyId: string) {
  const rows = await db.query.companyCurrentAccount.findMany({
    where: eq(companyCurrentAccount.companyId, companyId),
    columns: { currentAccountId: true },
  })
  return rows.map((r) => r.currentAccountId)
}

// ─── Members ──────────────────────────────────────────────────────────────────

export const companyMembersQueryKey = (companyId: string) =>
  ['company-members', companyId] as const

export const fetchCompanyMembers = createServerFn()
  .inputValidator(z.object({ companyId: z.string() }))
  .handler(async ({ data }) => {
    const accountIds = await getCompanyAccountIds(data.companyId)
    if (accountIds.length === 0) return []

    const rows = await db.query.currentAccountUser.findMany({
      where: inArray(currentAccountUser.currentAccountId, accountIds),
      with: {
        user: { columns: { id: true, name: true, email: true } },
      },
    })

    // Deduplicate by userId — a user may be in multiple accounts of the company
    const seen = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      if (!seen.has(row.userId)) seen.set(row.userId, row)
    }

    return [...seen.values()].map((row) => ({
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
    }))
  })

const addCompanyMemberSchema = z.object({
  companyId: z.string(),
  userId: z.string(),
  role: z.string().default('member'),
})

export const addCompanyMember = createServerFn({ method: 'POST' })
  .inputValidator(addCompanyMemberSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()

    const accountIds = await getCompanyAccountIds(data.companyId)
    if (accountIds.length === 0)
      throw new Error('У компании нет привязанных счетов')

    const existing = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.userId, data.userId),
        inArray(currentAccountUser.currentAccountId, accountIds),
      ),
    })
    if (existing)
      throw new Error('Пользователь уже является участником компании')

    await db.insert(currentAccountUser).values(
      accountIds.map((accountId) => ({
        currentAccountId: accountId,
        userId: data.userId,
        role: data.role,
        invitedBy: session.user.id,
      })),
    )
  })

const removeCompanyMemberSchema = z.object({
  companyId: z.string(),
  userId: z.string(),
})

export const removeCompanyMember = createServerFn({ method: 'POST' })
  .inputValidator(removeCompanyMemberSchema)
  .handler(async ({ data }) => {
    await requireSession()

    const accountIds = await getCompanyAccountIds(data.companyId)
    if (accountIds.length === 0) return

    await db
      .delete(currentAccountUser)
      .where(
        and(
          eq(currentAccountUser.userId, data.userId),
          inArray(currentAccountUser.currentAccountId, accountIds),
        ),
      )
  })

async function ensureAccountSelectionIsAvailable(
  userId: string,
  accountIds: string[],
  currentCompanyId?: string,
) {
  const accessibleAccountIds = await getAccessibleAccountIds(userId)
  const accessibleAccountSet = new Set(accessibleAccountIds)

  if (accountIds.some((accountId) => !accessibleAccountSet.has(accountId))) {
    throw new Error('Можно выбрать только доступные вам счета')
  }

  const existingLinks =
    accountIds.length > 0
      ? await db.query.companyCurrentAccount.findMany({
          where: inArray(companyCurrentAccount.currentAccountId, accountIds),
          columns: {
            companyId: true,
            currentAccountId: true,
          },
        })
      : []

  const unavailableLink = existingLinks.find(
    (link) =>
      currentCompanyId === undefined || link.companyId !== currentCompanyId,
  )

  if (unavailableLink) {
    const accountRow = await db.query.currentAccount.findFirst({
      where: eq(currentAccount.id, unavailableLink.currentAccountId),
      columns: { name: true },
    })

    throw new Error(
      `Счёт «${accountRow?.name ?? 'Без названия'}» уже привязан к другой компании`,
    )
  }
}
