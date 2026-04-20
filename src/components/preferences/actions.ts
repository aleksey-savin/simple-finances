import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import z from 'zod'

import { db } from '#/db'
import { smtpSettings } from '#/db/schema'
import { resolveSelectedScope } from '#/lib/company-scope'
import { sendEmail } from '#/lib/email'
import { auth } from 'utils/auth'

// ─── Query key ────────────────────────────────────────────────────────────────

export const smtpSettingsQueryKey = ['smtp-settings'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchSmtpSettings = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  const accountId = selectedScope.accountIds[0]
  if (!accountId) return null

  const [settings] = await db
    .select()
    .from(smtpSettings)
    .where(eq(smtpSettings.currentAccountId, accountId))
    .limit(1)

  return settings ?? null
})

// ─── Schema ───────────────────────────────────────────────────────────────────

export const smtpSettingsSchema = z.object({
  host: z.string().min(1, 'Укажите адрес сервера'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1, 'Укажите имя пользователя'),
  password: z.string().min(1, 'Укажите пароль'),
  fromName: z.string().min(1, 'Укажите имя отправителя'),
  fromEmail: z.string().email('Укажите корректный email'),
})

// ─── Save (upsert) ────────────────────────────────────────────────────────────

export const saveSmtpSettings = createServerFn({ method: 'POST' })
  .inputValidator(smtpSettingsSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    const accountId = selectedScope.accountIds[0]
    if (!accountId) throw new Error('Счёт не найден')

    const existing = await db
      .select({ id: smtpSettings.id })
      .from(smtpSettings)
      .where(eq(smtpSettings.currentAccountId, accountId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(smtpSettings)
        .set({
          host: data.host,
          port: data.port,
          secure: data.secure,
          username: data.username,
          password: data.password,
          fromName: data.fromName,
          fromEmail: data.fromEmail,
          updatedAt: new Date(),
        })
        .where(eq(smtpSettings.currentAccountId, accountId))
    } else {
      await db.insert(smtpSettings).values({
        currentAccountId: accountId,
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username,
        password: data.password,
        fromName: data.fromName,
        fromEmail: data.fromEmail,
      })
    }
  })

// ─── Test connection ──────────────────────────────────────────────────────────

const testSmtpSchema = z.object({
  to: z.string().email('Укажите корректный email'),
})

export const testSmtpConnection = createServerFn({ method: 'POST' })
  .inputValidator(testSmtpSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    const accountId = selectedScope.accountIds[0]
    if (!accountId) throw new Error('Счёт не найден')

    await sendEmail({
      currentAccountId: accountId,
      to: data.to,
      subject: 'Тест SMTP — SMB Budget',
      html: '<p>SMTP настроен и работает корректно.</p>',
      text: 'SMTP настроен и работает корректно.',
    })
  })
