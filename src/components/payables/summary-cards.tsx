import { Card } from '#/components/ui/card'

import type { ExpenseRow } from './types'
import { formatCurrency, getPayablesSummary } from './utils'

type PayablesSummaryCardsProps = {
  currentMonth: ExpenseRow[]
  previousUnpaid: ExpenseRow[]
}

export function PayablesSummaryCards({
  currentMonth,
  previousUnpaid,
}: PayablesSummaryCardsProps) {
  const summary = getPayablesSummary(currentMonth, previousUnpaid)

  return (
    <div className="flex flex-wrap gap-3">
      <Card className="flex min-w-35 flex-col justify-center gap-2 p-4">
        <p className="text-muted-foreground text-sm">К оплате (месяц)</p>
        <p className="text-destructive text-lg font-semibold tabular-nums">
          {formatCurrency(summary.currentMonthUnpaid)} ₽
        </p>
      </Card>

      {summary.currentMonthPaid > 0 && (
        <Card className="flex min-w-35 flex-col justify-center gap-2 p-4">
          <p className="text-muted-foreground text-sm">Оплачено (месяц)</p>
          <p className="text-success text-lg font-semibold tabular-nums">
            {formatCurrency(summary.currentMonthPaid)} ₽
          </p>
        </Card>
      )}

      {summary.previousTotal > 0 && (
        <Card className="flex min-w-35 flex-col justify-center gap-2 p-4">
          <p className="text-muted-foreground text-sm">Долг прошлых периодов</p>
          <p className="text-warning text-lg font-semibold tabular-nums">
            {formatCurrency(summary.previousTotal)} ₽
          </p>
        </Card>
      )}

      {summary.overdueCount > 0 && (
        <Card className="flex min-w-35 flex-col justify-center gap-2 p-4">
          <p className="text-muted-foreground text-sm">Просрочено</p>
          <p className="text-destructive text-lg font-semibold">
            {summary.overdueCount}{' '}
            {summary.overdueCount === 1 ? 'запись' : 'записей'}
          </p>
        </Card>
      )}
    </div>
  )
}
