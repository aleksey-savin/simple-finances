import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { PriceRevisionItemRow } from '@/types'
import { computeRevisionSummary, formatCurrency } from './utils'

const rawNum = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

function formatCurrencyRange(min: number, max: number, sign = false): string {
  const prefix = sign && min > 0 ? '+' : ''
  if (Math.abs(max - min) < 0.01) return prefix + formatCurrency(min)
  return `${prefix}${rawNum.format(min)} — ${rawNum.format(max)} ₽`
}

function formatPercentRange(min: number, max: number, sign = false): string {
  const prefix = sign && min > 0 ? '+' : ''
  if (Math.abs(max - min) < 0.01) return `${prefix}${min.toFixed(1)}%`
  return `${prefix}${min.toFixed(1)} — ${max.toFixed(1)}%`
}

function deltaColorClass(min: number, max: number): string {
  if (min > 0) return 'text-success'
  if (max < 0) return 'text-destructive'
  return ''
}

export function PriceRevisionSummaryCards({
  items,
}: {
  items: PriceRevisionItemRow[]
}) {
  const summary = computeRevisionSummary(items)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Текущая сумма
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrencyRange(summary.minCurrent, summary.maxCurrent)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.includedCount} из {summary.includedCount + summary.excludedCount} договоров
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Предложенная сумма
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrencyRange(summary.minProposed, summary.maxProposed)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            при успешном согласовании всех
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Дельта
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-xl font-semibold tabular-nums ${deltaColorClass(summary.minDelta, summary.maxDelta)}`}>
            {formatCurrencyRange(summary.minDelta, summary.maxDelta, true)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Изменение %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-xl font-semibold ${
              summary.minDeltaPercent != null && summary.minDeltaPercent > 0
                ? 'text-success'
                : summary.maxDeltaPercent != null && summary.maxDeltaPercent < 0
                  ? 'text-destructive'
                  : ''
            }`}
          >
            {summary.minDeltaPercent != null && summary.maxDeltaPercent != null
              ? formatPercentRange(summary.minDeltaPercent, summary.maxDeltaPercent, true)
              : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
