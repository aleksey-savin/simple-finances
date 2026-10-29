import { createServerFn } from '@tanstack/react-start'
import { asc, eq, sql } from 'drizzle-orm'
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
      kind: 'system',
      to: data.to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })
  })

// ─── Client notifications switch ──────────────────────────────────────────────

const clientNotificationsSchema = z.object({
  enabled: z.boolean(),
})

export const setClientNotificationsEnabled = createServerFn({ method: 'POST' })
  .inputValidator(clientNotificationsSchema)
  .handler(async ({ data }) => {
    await requireSession()

    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select({
            id: smtpSettings.id,
            enabled: smtpSettings.clientNotificationsEnabled,
          })
          .from(smtpSettings)
          .orderBy(asc(smtpSettings.createdAt))
          .limit(1)
      ).at(0)

      if (!current) {
        throw new Error('Сначала настройте SMTP-сервер')
      }
      if (current.enabled === data.enabled) return

      await tx
        .update(smtpSettings)
        .set({
          clientNotificationsEnabled: data.enabled,
          updatedAt: new Date(),
        })
        .where(eq(smtpSettings.id, current.id))

      // On re-enable, mark every already-due reminder as sent so the backlog
      // accumulated while disabled doesn't go out at once; regular reminders
      // resume after the business line's reminder frequency.
      if (data.enabled) {
        await tx.execute(sql`
          insert into invoice_reminder_log (id, invoice_id, sent_at, to_email)
          select gen_random_uuid()::text, i.id, now(), 'suppressed@notifications-disabled'
          from invoice i
          join contract c on c.id = i.contract_id
          join business_line bl on bl.id = c.business_line_id
          where i.paid_at is null
            and i.archived_at is null
            and i.due_date is not null
            and date_trunc('day', now())
              >= date_trunc('day', i.due_date - make_interval(days => bl.reminder_days_before))
        `)
      }
    })
  })
