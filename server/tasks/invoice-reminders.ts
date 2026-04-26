import { defineTask } from 'nitro/task'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
} from 'drizzle-orm'
import { addDays, endOfDay, startOfDay } from 'date-fns'

import { db } from '#/db/index.server'
import {
  proxmoxAccountSettings,
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
      'Sends email reminders to client contacts for invoices due within N days.',
  },

  async run() {
    const now = new Date()
    const formatDateRu = (value: Date | string) =>
      new Intl.DateTimeFormat('ru-RU').format(new Date(value))

    const allSettings = await db.select().from(proxmoxAccountSettings)
    const settingsByAccount = new Map(
      allSettings.map((row) => [row.currentAccountId, row.reminderDaysBefore]),
    )

    const invoiceAccounts = await db
      .selectDistinct({ currentAccountId: invoice.currentAccountId })
      .from(invoice)
      .where(
        and(
          isNotNull(invoice.contractId),
          isNotNull(invoice.dueDate),
          isNull(invoice.paidAt),
          isNull(invoice.archivedAt),
          gte(invoice.dueDate, startOfDay(now)),
        ),
      )

    const effectiveSettings = invoiceAccounts.map((row) => ({
      currentAccountId: row.currentAccountId,
      reminderDaysBefore: settingsByAccount.get(row.currentAccountId) ?? 5,
      hasExplicitSettings: settingsByAccount.has(row.currentAccountId),
    }))

    console.log(
      `[invoice-reminders] Found ${allSettings.length} account settings, processing ${effectiveSettings.length} invoice accounts`,
    )

    if (effectiveSettings.length === 0) {
      return { result: { sent: 0 } }
    }

    let sent = 0

    for (const settings of effectiveSettings) {
      try {
        const targetStart = startOfDay(now)
        const targetEndExclusive = startOfDay(
          addDays(now, settings.reminderDaysBefore + 1),
        )
        console.log(
          `[invoice-reminders] Account ${settings.currentAccountId}: reminderDaysBefore=${settings.reminderDaysBefore}, explicitSettings=${settings.hasExplicitSettings}, window=${targetStart.toISOString()}..${targetEndExclusive.toISOString()} (exclusive end)`,
        )

        const dueInvoices = await db.query.invoice.findMany({
          where: and(
            eq(invoice.currentAccountId, settings.currentAccountId),
            isNotNull(invoice.contractId),
            isNull(invoice.paidAt),
            isNull(invoice.archivedAt),
            gte(invoice.dueDate, targetStart),
            lt(invoice.dueDate, targetEndExclusive),
          ),
          with: {
            contract: {
              columns: { id: true, name: true, number: true },
              with: {
                businessLine: {
                  columns: { allowNotifications: true },
                },
              },
            },
          },
        })
        console.log(
          `[invoice-reminders] Found ${dueInvoices.length} due invoices for account ${settings.currentAccountId}`,
        )

        if (dueInvoices.length === 0) continue

        for (const inv of dueInvoices) {
          if (!inv.counterpartyId) {
            console.log(
              `[invoice-reminders] Invoice ${inv.id} skipped: no counterpartyId`,
            )
            continue
          }

          if (inv.contract?.businessLine?.allowNotifications === false) {
            console.log(
              `[invoice-reminders] Invoice ${inv.id} skipped: notifications disabled for business line`,
            )
            continue
          }

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
              and(
                inArray(contact.clientId, clientIds),
                isNotNull(contact.email),
              ),
            )
            .limit(1)

          if (contacts.length === 0 || !contacts[0].email) {
            console.log(
              `[invoice-reminders] Invoice ${inv.id} skipped: no contact with email found for clients ${clientIds.join(', ')}`,
            )
            continue
          }

          const toEmail = contacts[0].email
          const dueDate = inv.dueDate ? formatDateRu(inv.dueDate) : 'неизвестно'

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
            } else if (inv.dueDate) {
              const nextPaymentRows = await db
                .select({ dueDate: invoice.dueDate })
                .from(invoice)
                .where(
                  and(
                    eq(invoice.currentAccountId, settings.currentAccountId),
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
                if (inv.paidAt) {
                  renewalHtml = `<p>Сервер оплачен до <strong>${nextPaymentDate}</strong>.</p>`
                  renewalText = `Сервер оплачен до ${nextPaymentDate}.`
                } else {
                  renewalHtml = `<p>После оплаты текущего счёта сервер будет продлён до <strong>${nextPaymentDate}</strong>.</p>`
                  renewalText = `После оплаты текущего счёта сервер будет продлён до ${nextPaymentDate}.`
                }
              }
            }
          }

          try {
            const emailTemplate = buildInvoiceReminderEmail({
              contactName: contacts[0].name,
              contractLabel: contractInfo,
              dueDateLabel: dueDate,
              renewalHtml,
              renewalText,
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
              `[invoice-reminders] Sent reminder for invoice ${inv.id} to ${toEmail}`,
            )
          } catch (emailErr) {
            console.error(
              `[invoice-reminders] Failed to send to ${toEmail}:`,
              emailErr,
            )
          }
        }
      } catch (err) {
        console.error(
          `[invoice-reminders] Error for account ${settings.currentAccountId}:`,
          err,
        )
      }
    }

    console.log(`[invoice-reminders] Sent ${sent} reminders.`)
    return { result: { sent } }
  },
})
