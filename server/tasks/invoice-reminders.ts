import { defineTask } from 'nitro/task'
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull } from 'drizzle-orm'
import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns'

import { db } from '#/db/index.server'
import {
  invoice,
  invoiceReminderLog,
  contractVm,
  clientCounterparty,
  contact,
} from '#/db/schema'
import { buildInvoiceReminderEmail } from '#/lib/email-templates'
import { sendEmail } from '#/lib/email.server'

export default defineTask({
  meta: {
    name: 'invoice-reminders',
    description:
      'Sends email reminders to client contacts for invoices. Lead time, frequency, and tone come from the business line.',
  },

  async run() {
    const now = new Date()
    const today = startOfDay(now)
    const formatDateRu = (value: Date | string) =>
      new Intl.DateTimeFormat('ru-RU').format(new Date(value))

    const candidates = await db.query.invoice.findMany({
      where: and(
        isNotNull(invoice.contractId),
        isNotNull(invoice.dueDate),
        isNull(invoice.paidAt),
        isNull(invoice.archivedAt),
      ),
      with: {
        contract: {
          columns: {
            id: true,
            name: true,
            number: true,
            allowNotifications: true,
          },
          with: {
            businessLine: {
              columns: {
                allowNotifications: true,
                reminderDaysBefore: true,
                reminderFrequencyDays: true,
                notificationStyle: true,
              },
            },
          },
        },
      },
    })

    console.log(
      `[invoice-reminders] Considering ${candidates.length} unpaid invoices with contract+dueDate`,
    )

    let sent = 0

    for (const inv of candidates) {
      try {
        if (!inv.dueDate) continue
        if (!inv.counterpartyId) {
          console.log(
            `[invoice-reminders] Invoice ${inv.id} skipped: no counterpartyId`,
          )
          continue
        }

        const bl = inv.contract?.businessLine
        if (!bl) {
          console.log(
            `[invoice-reminders] Invoice ${inv.id} skipped: contract has no business line`,
          )
          continue
        }

        if (bl.allowNotifications === false) {
          console.log(
            `[invoice-reminders] Invoice ${inv.id} skipped: notifications disabled for business line`,
          )
          continue
        }

        if (inv.contract?.allowNotifications === false) {
          console.log(
            `[invoice-reminders] Invoice ${inv.id} skipped: notifications disabled for contract`,
          )
          continue
        }

        const firstEligible = startOfDay(
          subDays(inv.dueDate, bl.reminderDaysBefore),
        )
        if (today < firstEligible) continue

        const lastLog = (
          await db
            .select({ sentAt: invoiceReminderLog.sentAt })
            .from(invoiceReminderLog)
            .where(eq(invoiceReminderLog.invoiceId, inv.id))
            .orderBy(desc(invoiceReminderLog.sentAt))
            .limit(1)
        ).at(0)

        if (lastLog) {
          const daysSince = differenceInCalendarDays(today, lastLog.sentAt)
          if (daysSince < bl.reminderFrequencyDays) continue
        }

        const clientLinks = await db
          .select({ clientId: clientCounterparty.clientId })
          .from(clientCounterparty)
          .where(eq(clientCounterparty.counterpartyId, inv.counterpartyId))
          .limit(5)

        if (clientLinks.length === 0) {
          console.log(
            `[invoice-reminders] Invoice ${inv.id} skipped: counterparty ${inv.counterpartyId} not linked to any client`,
          )
          continue
        }

        const clientIds = clientLinks.map((l) => l.clientId)
        const contacts = await db
          .select({ email: contact.email, name: contact.name })
          .from(contact)
          .where(
            and(inArray(contact.clientId, clientIds), isNotNull(contact.email)),
          )
          .limit(1)

        if (contacts.length === 0 || !contacts[0].email) {
          console.log(
            `[invoice-reminders] Invoice ${inv.id} skipped: no contact with email found for clients ${clientIds.join(', ')}`,
          )
          continue
        }

        const toEmail = contacts[0].email
        const dueDateLabel = formatDateRu(inv.dueDate)
        const contractInfo = inv.contract ? inv.contract.name : 'договор'

        let renewalHtml = ''
        let renewalText = ''

        if (inv.contractId) {
          const manualExtensionRows = await db
            .select({ pausedUntil: contractVm.pausedUntil })
            .from(contractVm)
            .where(
              and(
                eq(contractVm.contractId, inv.contractId),
                isNotNull(contractVm.pausedUntil),
                gt(contractVm.pausedUntil, now),
              ),
            )
            .orderBy(desc(contractVm.pausedUntil))
            .limit(1)
          if (
            manualExtensionRows.length > 0 &&
            manualExtensionRows[0].pausedUntil
          ) {
            const extendedUntil = formatDateRu(
              manualExtensionRows[0].pausedUntil,
            )
            renewalHtml = `<p>Срок действия сервера продлён вручную до <strong>${extendedUntil}</strong>.</p>`
            renewalText = `Срок действия сервера продлён вручную до ${extendedUntil}.`
          } else {
            const nextPaymentRows = await db
              .select({ dueDate: invoice.dueDate })
              .from(invoice)
              .where(
                and(
                  eq(invoice.currentAccountId, inv.currentAccountId),
                  eq(invoice.contractId, inv.contractId),
                  isNull(invoice.archivedAt),
                  isNotNull(invoice.dueDate),
                  gt(invoice.dueDate, inv.dueDate),
                ),
              )
              .orderBy(asc(invoice.dueDate))
              .limit(1)

            if (nextPaymentRows.length > 0 && nextPaymentRows[0].dueDate) {
              const nextPaymentDate = formatDateRu(nextPaymentRows[0].dueDate)
              renewalHtml = `<p>После оплаты текущего счёта срок действия услуги будет продлён до <strong>${nextPaymentDate}</strong>.</p>`
              renewalText = `После оплаты текущего счёта срок действия услуги будет продлён до ${nextPaymentDate}.`
            }
          }
        }

        try {
          const emailTemplate = buildInvoiceReminderEmail({
            contactName: contacts[0].name,
            contractLabel: contractInfo,
            dueDateLabel,
            renewalHtml,
            renewalText,
            style: bl.notificationStyle,
          })

          await sendEmail({
            to: toEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
          })

          await db.insert(invoiceReminderLog).values({
            invoiceId: inv.id,
            toEmail,
          })

          sent++
          console.log(
            `[invoice-reminders] Sent reminder for invoice ${inv.id} to ${toEmail} (style=${bl.notificationStyle})`,
          )
        } catch (emailErr) {
          console.error(
            `[invoice-reminders] Failed to send to ${toEmail}:`,
            emailErr,
          )
        }
      } catch (err) {
        console.error(`[invoice-reminders] Error for invoice ${inv.id}:`, err)
      }
    }

    console.log(`[invoice-reminders] Sent ${sent} reminders.`)
    return { result: { sent } }
  },
})
