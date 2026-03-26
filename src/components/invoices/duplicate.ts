import type { Invoice } from '#/types'

type DuplicableInvoice = Pick<Invoice, 'createdAt' | 'dueDate'>

export function buildDuplicateInvoiceDates(item: DuplicableInvoice) {
  if (!item.dueDate) return {}

  const now = new Date()
  const originalCreatedAt = new Date(item.createdAt)
  const originalDueDate = new Date(item.dueDate)
  const dueOffsetMs = Math.max(
    0,
    originalDueDate.getTime() - originalCreatedAt.getTime(),
  )

  return {
    dueDate: new Date(now.getTime() + dueOffsetMs).toISOString(),
  }
}
