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

  // Find how many tiers there are (max across all items)
  const tierCount = Math.max(...included.map((i) => i.currentAmounts.length))

  // For each tier index, sum current and proposed across all items
  // (items with fewer tiers contribute 0 for missing tiers)
  const tierSums = Array.from({ length: tierCount }, (_, j) => {
    const sumCurrent = included.reduce(
      (s, i) => s + Number(i.currentAmounts[j] ?? 0),
      0,
    )
    const sumProposed = included.reduce(
      (s, i) => s + Number(i.proposedAmounts[j] ?? 0),
      0,
    )
    const delta = sumProposed - sumCurrent
    const percent = sumCurrent > 0 ? (delta / sumCurrent) * 100 : null
    return { sumCurrent, sumProposed, delta, percent }
  })

  const minCurrent = Math.min(...tierSums.map((t) => t.sumCurrent))
  const maxCurrent = Math.max(...tierSums.map((t) => t.sumCurrent))
  const minProposed = Math.min(...tierSums.map((t) => t.sumProposed))
  const maxProposed = Math.max(...tierSums.map((t) => t.sumProposed))
  const minDelta = Math.min(...tierSums.map((t) => t.delta))
  const maxDelta = Math.max(...tierSums.map((t) => t.delta))

  const percents = tierSums.map((t) => t.percent).filter((p): p is number => p !== null)
  const minDeltaPercent = percents.length > 0 ? Math.min(...percents) : null
  const maxDeltaPercent = percents.length > 0 ? Math.max(...percents) : null

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
