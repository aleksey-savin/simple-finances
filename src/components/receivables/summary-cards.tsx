import { Card } from '#/components/ui/card'

import type { IncomeRow } from './types'
import { formatCurrency, getReceivablesSummary } from './utils'

type ReceivablesSummaryCardsProps = {
  rows: IncomeRow[]
}

export function ReceivablesSummaryCards({
  rows,
}: ReceivablesSummaryCardsProps) {
  const summary = getReceivablesSummary(rows)

  return (
    <div className="flex flex-wrap gap-3">
      <Card className="flex min-w-35 flex-col justify-center gap-2 p-4">
        <p className="text-sm text-muted-foreground">Всего ожидается</p>
        <p className="text-success text-lg font-semibold tabular-nums">
          {formatCurrency(summary.totalAll)} ₽
        </p>
      </Card>

      {summary.overdueAll > 0 && (
        <Card className="flex min-w-35 flex-col justify-center gap-2 border border-destructive bg-red-50 p-4">
          <p className="text-sm text-muted-foreground">Просрочено</p>
          <p className="text-destructive text-lg font-semibold">
            {summary.overdueAll}{' '}
            {summary.overdueAll === 1 ? 'запись' : 'записей'}
          </p>
        </Card>
      )}
    </div>
  )
}
