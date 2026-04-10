import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  company,
  companyCurrentAccount,
  currentAccount,
  currentAccountUser,
} from '@/db/schema'
import { auth } from 'utils/auth'

export const companiesQueryKey = ['companies'] as const

export const fetchCompanies = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const accountIds = await getAccessibleAccountIds(session.user.id)
  if (accountIds.length === 0) return []

  const accessibleAccountSet = new Set(accountIds)

  return db.query.company
    .findMany({
      with: {
        currentAccounts: {
          with: {
            currentAccount: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((rows) =>
      rows
        .map((row) => ({
          id: row.id,
          name: row.name,
          createdBy: row.createdBy,
          accounts: row.currentAccounts
            .map((item) => item.currentAccount)
            .filter((account) => accessibleAccountSet.has(account.id)),
        }))
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
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

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
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

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
