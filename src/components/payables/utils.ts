import type { FilterFn } from '@tanstack/react-table'

import type {
  ExpenseRow,
  ExpenseStatus,
  PayablesPeriodGroup,
} from './types'

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatCurrency(n: number) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getDueMeta(dueDate: string | null | undefined) {
  if (!dueDate) return { isOverdue: false, daysLeft: null }

  const diff = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  return { isOverdue: diff < 0, daysLeft: diff }
}

export function getExpenseStatus(row: ExpenseRow): ExpenseStatus {
  if (row.isProjected) return 'projected'
  if (row.paymentStatus === 'paid') return 'paid'
  if (row.paymentStatus === 'partial') return 'partial'
  if (!row.dueDate) return 'nodate'

  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)
  if (isOverdue) return 'overdue'
  if (daysLeft !== null && daysLeft <= 7) return 'soon'
  return 'ontime'
}

export function getPeriodLabel(periodGroup: PayablesPeriodGroup) {
  if (periodGroup === 'current-month') return 'Текущий месяц'
  return 'Прошлые периоды'
}

export const idFilterFn: FilterFn<ExpenseRow> = (
  row,
  columnId,
  value: string[],
) => {
  if (value.length === 0) return true
  if (columnId === 'account') {
    return value.includes(row.original.currentAccount.id)
  }
  if (columnId === 'category') return value.includes(row.original.category.id)
  if (columnId === 'counterparty') {
    return value.includes(row.original.counterparty?.id ?? '')
  }
  return true
}
idFilterFn.autoRemove = (value) => !value?.length

export const overdueFilterFn: FilterFn<ExpenseRow> = (
  row,
  _id,
  value: boolean,
) => {
  if (!value) return true
  return getDueMeta(row.original.dueDate).isOverdue
}
overdueFilterFn.autoRemove = (value) => !value

export const statusFilterFn: FilterFn<ExpenseRow> = (
  row,
  _id,
  value: ExpenseStatus[],
) => {
  if (value.length === 0) return true
  return value.includes(getExpenseStatus(row.original))
}
statusFilterFn.autoRemove = (value) => !value?.length

export const periodFilterFn: FilterFn<ExpenseRow> = (
  row,
  _id,
  value: PayablesPeriodGroup[],
) => {
  if (value.length === 0) return true
  return value.includes(row.original.periodGroup)
}
periodFilterFn.autoRemove = (value) => !value?.length

export function getPayablesSummary(
  currentMonth: ExpenseRow[],
  previousUnpaid: ExpenseRow[],
) {
  const currentMonthUnpaid = currentMonth
    .filter((row) => row.paymentStatus !== 'paid')
    .reduce((sum, row) => sum + row.outstandingAmount, 0)

  const currentMonthPaid = currentMonth.reduce((sum, row) => {
    if (row.paymentStatus === 'paid') return sum + Number(row.amount)
    if (row.paymentStatus === 'partial') return sum + row.settledAmount
    return sum
  }, 0)

  const previousTotal = previousUnpaid.reduce(
    (sum, row) => sum + row.outstandingAmount,
    0,
  )

  const overdueCount = [...currentMonth.filter((row) => !row.isProjected), ...previousUnpaid]
    .filter(
      (row) =>
        row.paymentStatus !== 'paid' && getDueMeta(row.dueDate).isOverdue,
    )
    .length

  const projectedCount = currentMonth.filter((row) => row.isProjected).length

  return {
    currentMonthUnpaid,
    currentMonthPaid,
    previousTotal,
    overdueCount,
    projectedCount,
  }
}
