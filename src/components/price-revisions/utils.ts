import type { PriceRevisionItemRow } from '@/types'

export type PriceRevisionStatus = 'draft' | 'in_progress' | 'completed'

export function getRevisionStatus(r: {
  startedAt: Date | null
  completedAt: Date | null
}): PriceRevisionStatus {
  if (r.completedAt) return 'completed'
  if (r.startedAt) return 'in_progress'
  return 'draft'
}

export const REVISION_STATUS_LABELS: Record<PriceRevisionStatus, string> = {
  draft: 'Черновик',
  in_progress: 'В работе',
  completed: 'Завершена',
}

export function getRevisionStatusVariant(
  status: PriceRevisionStatus,
): 'success' | 'default' | 'secondary' {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'default'
  return 'secondary'
}

export type PriceRevisionSummary = {
  current: number
  proposed: number
  delta: number
  deltaPercent: number | null
  includedCount: number
  excludedCount: number
}

export function computeRevisionSummary(
  items: PriceRevisionItemRow[],
): PriceRevisionSummary {
  const included = items.filter((i) => i.included)
  const excluded = items.filter((i) => !i.included)

  if (included.length === 0) {
    return {
      current: 0,
      proposed: 0,
      delta: 0,
      deltaPercent: null,
      includedCount: 0,
      excludedCount: excluded.length,
    }
  }

  const current = included.reduce(
    (s, i) => s + Math.min(...i.currentAmounts.map(Number)),
    0,
  )
  const proposed = included.reduce(
    (s, i) => s + Math.min(...i.proposedAmounts.map(Number)),
    0,
  )

  const delta = proposed - current
  const deltaPercent = current > 0 ? (delta / current) * 100 : null

  return {
    current,
    proposed,
    delta,
    deltaPercent,
    includedCount: included.length,
    excludedCount: excluded.length,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function hasManualEdits(items: PriceRevisionItemRow[]): boolean {
  return items.some(
    (i) =>
      i.included &&
      (i.currentAmounts.length !== i.proposedAmounts.length ||
        i.currentAmounts.some((v, idx) => v !== i.proposedAmounts[idx])),
  )
}
