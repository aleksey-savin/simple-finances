import { createServerFn } from '@tanstack/react-start'

import { and, eq } from 'drizzle-orm'
import z from 'zod'

import { db } from '#/db/index.server'
import { proxmoxAccountSettings, proxmoxNode } from '#/db/schema'
import { createProxmoxClient } from '#/lib/proxmox'
import { resolveSelectedScope } from '#/lib/company-scope'
import { getRequest, requireSession } from '#/utils/session.server'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const proxmoxNodesQueryKey = ['proxmox-nodes'] as const
export const proxmoxSettingsQueryKey = ['proxmox-settings'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAccountId() {
  const session = await requireSession()
  const request = await getRequest()
  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )
  const accountId = selectedScope.accountIds[0]
  if (!accountId) throw new Error('Счёт не найден')
  return accountId
}

// ─── Nodes ────────────────────────────────────────────────────────────────────

export const fetchProxmoxNodes = createServerFn().handler(async () => {
  const accountId = await getAccountId()
  return db
    .select()
    .from(proxmoxNode)
    .where(eq(proxmoxNode.currentAccountId, accountId))
})

export const proxmoxNodeSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  host: z.string().min(1, 'Укажите адрес'),
  port: z.number().int().min(1).max(65535),
  tokenId: z.string().min(1, 'Укажите токен (user@realm!tokenname)'),
  tokenSecret: z.string().min(1, 'Укажите секрет токена'),
  verifySsl: z.boolean(),
})

export const addProxmoxNode = createServerFn({ method: 'POST' })
  .inputValidator(proxmoxNodeSchema)
  .handler(async ({ data }) => {
    const accountId = await getAccountId()
    await db
      .insert(proxmoxNode)
      .values({ ...data, currentAccountId: accountId })
  })

export const updateProxmoxNodeSchema = proxmoxNodeSchema.extend({
  id: z.string(),
})

export const updateProxmoxNode = createServerFn({ method: 'POST' })
  .inputValidator(updateProxmoxNodeSchema)
  .handler(async ({ data }) => {
    const accountId = await getAccountId()
    const { id, ...fields } = data
    await db
      .update(proxmoxNode)
      .set(fields)
      .where(
        and(
          eq(proxmoxNode.id, id),
          eq(proxmoxNode.currentAccountId, accountId),
        ),
      )
  })

export const deleteProxmoxNode = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const accountId = await getAccountId()
    await db
      .delete(proxmoxNode)
      .where(
        and(
          eq(proxmoxNode.id, data.id),
          eq(proxmoxNode.currentAccountId, accountId),
        ),
      )
  })

export const testProxmoxNodeConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const accountId = await getAccountId()
    const [node] = await db
      .select()
      .from(proxmoxNode)
      .where(
        and(
          eq(proxmoxNode.id, data.id),
          eq(proxmoxNode.currentAccountId, accountId),
        ),
      )
      .limit(1)
    if (!node) throw new Error('Нода не найдена')

    const client = createProxmoxClient({
      host: node.host,
      port: node.port,
      tokenId: node.tokenId,
      tokenSecret: node.tokenSecret,
      verifySsl: node.verifySsl,
    })

    try {
      await client.testConnection()
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

// ─── Account settings ─────────────────────────────────────────────────────────

export const fetchProxmoxAccountSettings = createServerFn().handler(
  async () => {
    const accountId = await getAccountId()
    const [settings] = await db
      .select()
      .from(proxmoxAccountSettings)
      .where(eq(proxmoxAccountSettings.currentAccountId, accountId))
      .limit(1)
    return settings ?? null
  },
)

export const proxmoxAccountSettingsSchema = z.object({
  reminderDaysBefore: z.number().int().min(0).max(365),
})

export const saveProxmoxAccountSettings = createServerFn({ method: 'POST' })
  .inputValidator(proxmoxAccountSettingsSchema)
  .handler(async ({ data }) => {
    const accountId = await getAccountId()
    const existing = await db
      .select({ id: proxmoxAccountSettings.id })
      .from(proxmoxAccountSettings)
      .where(eq(proxmoxAccountSettings.currentAccountId, accountId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(proxmoxAccountSettings)
        .set({
          reminderDaysBefore: data.reminderDaysBefore,
          updatedAt: new Date(),
        })
        .where(eq(proxmoxAccountSettings.currentAccountId, accountId))
    } else {
      await db.insert(proxmoxAccountSettings).values({
        currentAccountId: accountId,
        reminderDaysBefore: data.reminderDaysBefore,
      })
    }
  })
