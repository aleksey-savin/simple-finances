import type { Expense, Income } from '#/types'

type DuplicableTransaction = Pick<Expense | Income, 'createdAt' | 'dueDate'>

export function buildDuplicateTransactionDates(item: DuplicableTransaction) {
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
