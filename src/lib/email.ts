import nodemailer from 'nodemailer'
import { eq } from 'drizzle-orm'

import { db } from '#/db'
import { smtpSettings } from '#/db/schema'

export type SendEmailInput = {
  currentAccountId: string
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export type SendEmailResult = {
  messageId: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const [settings] = await db
    .select()
    .from(smtpSettings)
    .where(eq(smtpSettings.currentAccountId, input.currentAccountId))
    .limit(1)

  if (!settings) {
    throw new Error('SMTP не настроен. Перейдите в Настройки → SMTP для настройки.')
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

  const info = await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return { messageId: info.messageId }
}
