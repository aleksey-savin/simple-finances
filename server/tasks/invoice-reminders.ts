import { defineTask } from 'nitro/task'
import { and, eq, gte, isNull, lt, isNotNull, inArray } from 'drizzle-orm'
import { addDays, startOfDay, endOfDay } from 'date-fns'

import { db } from '#/db'
import {
  proxmoxAccountSettings,
  invoice,
  invoiceReminderLog,
  clientCounterparty,
  contact,
} from '#/db/schema'
import { sendEmail } from '#/lib/email'

export default defineTask({
  meta: {
    name: 'invoice-reminders',
    description: 'Sends email reminders to client contacts for invoices due in N days.',
  },

  async run() {
    const now = new Date()

    const allSettings = await db.select().from(proxmoxAccountSettings)

    if (allSettings.length === 0) {
      return { result: { sent: 0 } }
    }

    let sent = 0

    for (const settings of allSettings) {
      try {
        const targetDate = addDays(now, settings.reminderDaysBefore)
        const targetStart = startOfDay(targetDate)
        const targetEnd = endOfDay(targetDate)

        const dueInvoices = await db.query.invoice.findMany({
          where: and(
            eq(invoice.currentAccountId, settings.currentAccountId),
            isNotNull(invoice.contractId),
            isNull(invoice.paidAt),
            isNull(invoice.archivedAt),
            gte(invoice.dueDate, targetStart),
            lt(invoice.dueDate, targetEnd),
          ),
          with: {
            contract: {
              columns: { id: true, name: true, number: true },
            },
          },
        })

        if (dueInvoices.length === 0) continue

        for (const inv of dueInvoices) {
          if (!inv.counterpartyId) continue

          // Check if reminder already sent today
          const todayStart = startOfDay(now)
          const todayEnd = endOfDay(now)
          const existing = await db
            .select({ id: invoiceReminderLog.id })
            .from(invoiceReminderLog)
            .where(
              and(
                eq(invoiceReminderLog.invoiceId, inv.id),
                gte(invoiceReminderLog.sentAt, todayStart),
                lt(invoiceReminderLog.sentAt, todayEnd),
              ),
            )
            .limit(1)

          if (existing.length > 0) continue

          // Resolve client contact email via counterparty
          const clientLinks = await db
            .select({ clientId: clientCounterparty.clientId })
            .from(clientCounterparty)
            .where(eq(clientCounterparty.counterpartyId, inv.counterpartyId))
            .limit(5)

          if (clientLinks.length === 0) continue

          const clientIds = clientLinks.map((l) => l.clientId)
          const contacts = await db
            .select({ email: contact.email, name: contact.name })
            .from(contact)
            .where(and(inArray(contact.clientId, clientIds), isNotNull(contact.email)))
            .limit(1)

          if (contacts.length === 0 || !contacts[0].email) continue

          const toEmail = contacts[0].email
          const dueDate = inv.dueDate
            ? new Intl.DateTimeFormat('ru-RU').format(new Date(inv.dueDate))
            : 'неизвестно'

          const contractInfo = inv.contract
            ? `Договор №${inv.contract.number ?? inv.contract.name}`
            : 'договор'

          try {
            await sendEmail({
              currentAccountId: settings.currentAccountId,
              to: toEmail,
              subject: `Напоминание об оплате счёта до ${dueDate}`,
              html: `
                <p>Здравствуйте, ${contacts[0].name ?? ''}!</p>
                <p>Напоминаем, что счёт по <strong>${contractInfo}</strong> на сумму
                  <strong>${Number(inv.amount).toLocaleString('ru-RU')} ₽</strong>
                  необходимо оплатить до <strong>${dueDate}</strong>.</p>
                <p>${inv.description}</p>
                <p>Пожалуйста, произведите оплату в указанные сроки.</p>
              `,
              text: `Напоминание об оплате. ${contractInfo}. Сумма: ${inv.amount} ₽. Срок оплаты: ${dueDate}.`,
            })

            await db.insert(invoiceReminderLog).values({
              invoiceId: inv.id,
              toEmail,
            })

            sent++
            console.log(`[invoice-reminders] Sent reminder for invoice ${inv.id} to ${toEmail}`)
          } catch (emailErr) {
            console.error(`[invoice-reminders] Failed to send to ${toEmail}:`, emailErr)
          }
        }
      } catch (err) {
        console.error(`[invoice-reminders] Error for account ${settings.currentAccountId}:`, err)
      }
    }

    console.log(`[invoice-reminders] Sent ${sent} reminders.`)
    return { result: { sent } }
  },
})
