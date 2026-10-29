import '@tanstack/react-start/server-only'

import { asc } from 'drizzle-orm'
import nodemailer from 'nodemailer'

import { db } from '#/db/index.server'
import { smtpSettings } from '#/db/schema'

const DEV_EMAIL_RECIPIENT = 'a.savin@f1lab.ru'

// 'system' — auth codes, password reset, SMTP test: always sent.
// 'notification' — client-facing mail, suppressed by the global switch.
export type EmailKind = 'system' | 'notification'

export type SendEmailInput = {
  kind: EmailKind
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export type SendEmailResult = {
  messageId: string
}

export async function areClientNotificationsEnabled(): Promise<boolean> {
  const rows = await db
    .select({ enabled: smtpSettings.clientNotificationsEnabled })
    .from(smtpSettings)
    .orderBy(asc(smtpSettings.createdAt))
    .limit(1)
  return rows.at(0)?.enabled ?? true
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult | null> {
  const settingsRows = await db
    .select()
    .from(smtpSettings)
    .orderBy(asc(smtpSettings.createdAt))
    .limit(1)

  if (settingsRows.length === 0) {
    throw new Error(
      'SMTP не настроен. Перейдите в Настройки → SMTP для настройки.',
    )
  }
  const settings = settingsRows[0]

  if (input.kind === 'notification' && !settings.clientNotificationsEnabled) {
    console.log(
      `[email] Client notifications disabled, skipped: "${input.subject}"`,
    )
    return null
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.username,
      pass: settings.password,
    },
  })

  const isDevMode = process.env.NODE_ENV === 'development'
  const requestedTo = Array.isArray(input.to) ? input.to.join(', ') : input.to
  const to = isDevMode ? DEV_EMAIL_RECIPIENT : requestedTo

  if (isDevMode && requestedTo.toLowerCase() !== DEV_EMAIL_RECIPIENT) {
    console.warn(
      `[email] DEV recipient override: "${requestedTo}" -> "${DEV_EMAIL_RECIPIENT}"`,
    )
  }

  const info = await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return { messageId: info.messageId }
}
