import type { PriceRevisionItemRow } from '@/types'

export type PriceRevisionSummary = {
  minCurrent: number
  maxCurrent: number
  minProposed: number
  maxProposed: number
  minDelta: number
  maxDelta: number
  minDeltaPercent: number | null
  maxDeltaPercent: number | null
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
      minCurrent: 0, maxCurrent: 0,
      minProposed: 0, maxProposed: 0,
      minDelta: 0, maxDelta: 0,
      minDeltaPercent: null, maxDeltaPercent: null,
      includedCount: 0,
      excludedCount: excluded.length,
    }
  }

  // Sum each contract's own min/max tier amounts independently
  const minCurrent = included.reduce(
    (s, i) => s + Math.min(...i.currentAmounts.map(Number)),
    0,
  )
  const maxCurrent = included.reduce(
    (s, i) => s + Math.max(...i.currentAmounts.map(Number)),
    0,
  )
  const minProposed = included.reduce(
    (s, i) => s + Math.min(...i.proposedAmounts.map(Number)),
    0,
  )
  const maxProposed = included.reduce(
    (s, i) => s + Math.max(...i.proposedAmounts.map(Number)),
    0,
  )

  const minDelta = minProposed - minCurrent
  const maxDelta = maxProposed - maxCurrent
  const minDeltaPercent = minCurrent > 0 ? (minDelta / minCurrent) * 100 : null
  const maxDeltaPercent = maxCurrent > 0 ? (maxDelta / maxCurrent) * 100 : null

  return {
    minCurrent,
    maxCurrent,
    minProposed,
    maxProposed,
    minDelta,
    maxDelta,
    minDeltaPercent,
    maxDeltaPercent,
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
