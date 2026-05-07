import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import z from 'zod'

import { db } from '#/db/index.server'
import { smtpSettings } from '#/db/schema'
import { buildSmtpTestEmail } from '#/lib/email-templates'
import { sendEmail } from '#/lib/email.server'
import { requireSession } from '#/utils/session.server'

// ─── Query key ────────────────────────────────────────────────────────────────

export const smtpSettingsQueryKey = ['smtp-settings'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchSmtpSettings = createServerFn().handler(async () => {
  await requireSession()

  const settingsRows = await db
    .select()
    .from(smtpSettings)
    .orderBy(asc(smtpSettings.createdAt))
    .limit(1)

  return settingsRows[0] ?? null
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
    await requireSession()

    const existing = await db
      .select({ id: smtpSettings.id })
      .from(smtpSettings)
      .orderBy(asc(smtpSettings.createdAt))
      .limit(1)

    if (existing.length > 0) {
      const currentSettingsId = existing[0].id
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
        .where(eq(smtpSettings.id, currentSettingsId))
    } else {
      await db.insert(smtpSettings).values({
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
    await requireSession()

    const emailTemplate = buildSmtpTestEmail()

    await sendEmail({
      to: data.to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })
  })
