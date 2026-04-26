import '@tanstack/react-start/server-only'

import { asc } from 'drizzle-orm'
import nodemailer from 'nodemailer'

import { db } from '#/db/index.server'
import { smtpSettings } from '#/db/schema'

const DEV_EMAIL_RECIPIENT = 'a.savin@f1lab.ru'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export type SendEmailResult = {
  messageId: string
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
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
