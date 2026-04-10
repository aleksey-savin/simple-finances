import { and, eq, isNull } from 'drizzle-orm'

import { db } from '#/db'
import {
  client,
  clientCounterparty,
  companyCounterparty,
  currentAccountUser,
  userCounterparty,
} from '#/db/schema'

export const APP_SCOPE_COOKIE_NAME = 'app_scope'
export const PERSONAL_SCOPE_ID = 'personal'

export type AppScope = {
  id: string
  name: string
  kind: 'personal' | 'company'
  accountIds: string[]
}

export function readScopeIdFromHeaders(headers: Headers) {
  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) return null

  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.trim().split('=')
    if (rawKey !== APP_SCOPE_COOKIE_NAME) continue

    const value = rawValueParts.join('=').trim()
    if (!value) return null

    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  return null
}

export async function getUserScopes(userId: string) {
  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  const accountIds = memberships.map((membership) => membership.currentAccountId)
  const accessibleAccountSet = new Set(accountIds)

  const companyRows =
    accountIds.length === 0
      ? []
      : await db.query.company.findMany({
          columns: {
            id: true,
            name: true,
          },
          with: {
            currentAccounts: {
              columns: {
                currentAccountId: true,
              },
            },
          },
          orderBy: (table, { asc }) => asc(table.name),
        })

  const companyScopes = companyRows
    .map((row) => ({
      id: row.id,
      name: row.name,
      kind: 'company' as const,
      accountIds: row.currentAccounts
        .map((item) => item.currentAccountId)
        .filter((id) => accessibleAccountSet.has(id)),
    }))
    .filter((scope) => scope.accountIds.length > 0)

  const companyAccountSet = new Set(
    companyScopes.flatMap((scope) => scope.accountIds),
  )

  const personalAccountIds = accountIds.filter(
    (accountId) => !companyAccountSet.has(accountId),
  )

  return [
    {
      id: PERSONAL_SCOPE_ID,
      name: 'Личное',
      kind: 'personal' as const,
      accountIds: personalAccountIds,
    },
    ...companyScopes,
  ] satisfies AppScope[]
}

export async function resolveSelectedScope(userId: string, headers: Headers) {
  const scopes = await getUserScopes(userId)
  const scopeId = readScopeIdFromHeaders(headers)
  const selectedScope = scopes.find((scope) => scope.id === scopeId) ?? scopes[0]
  const fallbackScope: AppScope = {
    id: PERSONAL_SCOPE_ID,
    name: 'Личное',
    kind: 'personal',
    accountIds: [],
  }

  return {
    scopes,
    selectedScope: selectedScope ?? fallbackScope,
  }
}

export async function resolveScopedAccountIds(userId: string, headers: Headers) {
  const { scopes, selectedScope } = await resolveSelectedScope(userId, headers)

  return {
    scopes,
    selectedScope,
    accountIds: selectedScope.accountIds,
  }
}

/**
 * Returns the IDs of counterparties visible in the given scope,
 * resolved through the junction tables.
 */
export async function getScopedCounterpartyIds(
  userId: string,
  scope: AppScope,
): Promise<string[]> {
  if (scope.kind === 'company') {
    const [direct, fromClients] = await Promise.all([
      db
        .select({ counterpartyId: companyCounterparty.counterpartyId })
        .from(companyCounterparty)
        .where(eq(companyCounterparty.companyId, scope.id)),
      db
        .select({ counterpartyId: clientCounterparty.counterpartyId })
        .from(clientCounterparty)
        .innerJoin(client, eq(client.id, clientCounterparty.clientId))
        .where(eq(client.companyId, scope.id)),
    ])
    return [
      ...new Set([
        ...direct.map((r) => r.counterpartyId),
        ...fromClients.map((r) => r.counterpartyId),
      ]),
    ]
  }

  const [direct, fromClients] = await Promise.all([
    db
      .select({ counterpartyId: userCounterparty.counterpartyId })
      .from(userCounterparty)
      .where(eq(userCounterparty.userId, userId)),
    db
      .select({ counterpartyId: clientCounterparty.counterpartyId })
      .from(clientCounterparty)
      .innerJoin(client, eq(client.id, clientCounterparty.clientId))
      .where(and(eq(client.createdBy, userId), isNull(client.companyId))),
  ])
  return [
    ...new Set([
      ...direct.map((r) => r.counterpartyId),
      ...fromClients.map((r) => r.counterpartyId),
    ]),
  ]
}
