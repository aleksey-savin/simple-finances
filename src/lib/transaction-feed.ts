import { format, startOfDay } from 'date-fns'

import type { StatusTone } from '#/components/ui/status-text'
import type { Invoice, TransactionFeedItem } from '#/types'

const formatMoney = (value: number) =>
  value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const formatDate = (value: Date | string) =>
  format(new Date(value), 'dd.MM.yyyy')

export function getInvoiceStatus(
  item: Pick<
    Invoice,
    | 'paymentStatus'
    | 'paidAt'
    | 'dueDate'
    | 'archivedAt'
    | 'amount'
    | 'settledAmount'
  >,
  now: Date,
): { tone: StatusTone; label: string } {
  if (item.paymentStatus === 'paid') {
    return {
      tone: 'positive',
      label: `Оплачено ${item.paidAt ? formatDate(item.paidAt) : ''}`.trim(),
    }
  }

  if (item.paymentStatus === 'partial') {
    return {
      tone: 'pending',
      label: `Частично ${formatMoney(Number(item.settledAmount))} из ${formatMoney(Number(item.amount))}`,
    }
  }

  if (item.archivedAt !== null) {
    return { tone: 'neutral', label: 'В архиве' }
  }

  if (item.dueDate) {
    if (new Date(item.dueDate) < startOfDay(now)) {
      return {
        tone: 'danger',
        label: `Просрочен · до ${formatDate(item.dueDate)}`,
      }
    }
    return { tone: 'pending', label: `до ${formatDate(item.dueDate)}` }
  }

  return { tone: 'pending', label: 'Ждёт оплаты' }
}

export function getFeedDateKey(item: TransactionFeedItem): string {
  const value = item.kind === 'transfer' ? item.transferredAt : item.createdAt
  return format(new Date(value), 'yyyy-MM-dd')
}

export function computeDayTotals(
  feed: TransactionFeedItem[],
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const item of feed) {
    if (item.kind === 'transfer' || item.paymentStatus !== 'paid') continue

    const key = getFeedDateKey(item)
    const signed =
      item.kind === 'receivable' ? Number(item.amount) : -Number(item.amount)
    totals.set(key, (totals.get(key) ?? 0) + signed)
  }

  return totals
}
