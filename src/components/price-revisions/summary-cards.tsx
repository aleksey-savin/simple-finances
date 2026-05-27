import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { PriceRevisionItemRow } from '@/types'
import { computeRevisionSummary, formatCurrency, formatPercent } from './utils'

export function PriceRevisionSummaryCards({
  items,
}: {
  items: PriceRevisionItemRow[]
}) {
  const summary = computeRevisionSummary(items)

  const deltaClass =
    summary.delta > 0
      ? 'text-success'
      : summary.delta < 0
        ? 'text-destructive'
        : ''

  const deltaSign = summary.delta > 0 ? '+' : ''

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Мин. текущая сумма
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrency(summary.current)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.includedCount} из{' '}
            {summary.includedCount + summary.excludedCount} договоров
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Мин. предложенная сумма
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrency(summary.proposed)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            при успешном согласовании всех
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Мин. дельта
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-xl font-semibold tabular-nums ${deltaClass}`}>
            {deltaSign}
            {formatCurrency(summary.delta)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Мин. изменение %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-xl font-semibold ${deltaClass}`}>
            {summary.deltaPercent != null
              ? `${deltaSign}${formatPercent(summary.deltaPercent)}`
              : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
