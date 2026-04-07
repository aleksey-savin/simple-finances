import type { FilterFn } from '@tanstack/react-table'

import type { IncomeRow, IncomeStatus } from './types'

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

export function pluralRecords(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'запись'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'записи'
  }
  return 'записей'
}

export function getDueMeta(dueDate: string | Date | null | undefined) {
  if (!dueDate) return { isOverdue: false, daysLeft: null }

  const diff = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  return { isOverdue: diff < 0, daysLeft: diff }
}

export function getIncomeStatus(row: IncomeRow): IncomeStatus {
  if (row.paymentStatus === 'partial') return 'partial'
  if (!row.dueDate) return 'nodate'

  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)
  if (isOverdue) return 'overdue'
  if (daysLeft !== null && daysLeft <= 7) return 'soon'
  return 'ontime'
}

export const idFilterFn: FilterFn<IncomeRow> = (row, columnId, value: string[]) => {
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

export const overdueFilterFn: FilterFn<IncomeRow> = (row, _id, value: boolean) => {
  if (!value) return true
  return getDueMeta(row.original.dueDate).isOverdue
}
overdueFilterFn.autoRemove = (value) => !value

export const statusFilterFn: FilterFn<IncomeRow> = (
  row,
  _id,
  value: IncomeStatus[],
) => {
  if (value.length === 0) return true
  return value.includes(getIncomeStatus(row.original))
}
statusFilterFn.autoRemove = (value) => !value?.length

export function getReceivablesSummary(rows: IncomeRow[]) {
  const totalAll = rows.reduce((sum, row) => sum + row.outstandingAmount, 0)
  const overdueAll = rows.filter(
    (row) =>
      row.paymentStatus !== 'paid' && getDueMeta(row.dueDate).isOverdue,
  ).length

  return {
    totalAll,
    overdueAll,
  }
}
