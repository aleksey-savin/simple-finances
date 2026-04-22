import { and, asc, eq, gte, isNotNull, isNull } from 'drizzle-orm'

import { db } from '#/db'
import { invoice, recurringRule } from '#/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000

export async function getContractPaymentTermDueDate(
  contractId: string,
  now = new Date(),
): Promise<Date | null> {
  const nearestUnpaidInvoice = await db.query.invoice.findFirst({
    where: and(
      eq(invoice.contractId, contractId),
      isNull(invoice.paidAt),
      isNull(invoice.archivedAt),
      isNotNull(invoice.dueDate),
    ),
    columns: { dueDate: true },
    orderBy: [asc(invoice.dueDate)],
  })

  if (nearestUnpaidInvoice?.dueDate) {
    return nearestUnpaidInvoice.dueDate
  }

  const upcomingRecurring = await db.query.recurringRule.findMany({
    where: and(
      eq(recurringRule.contractId, contractId),
      eq(recurringRule.isActive, true),
      isNotNull(recurringRule.nextRunAt),
      gte(recurringRule.nextRunAt, now),
    ),
    columns: {
      nextRunAt: true,
      dueDaysFromCreation: true,
    },
    orderBy: [asc(recurringRule.nextRunAt)],
  })

  return (
    upcomingRecurring
      .map((rule) => {
        if (!rule.nextRunAt) return null
        if (!rule.dueDaysFromCreation || rule.dueDaysFromCreation <= 0) {
          return null
        }
        return new Date(
          rule.nextRunAt.getTime() + rule.dueDaysFromCreation * DAY_MS,
        )
      })
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())
      .at(0) ?? null
  )
}
