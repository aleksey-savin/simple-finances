import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { formatMoney } from '@/lib/format'

export function ObligationsMetricCard({
  total,
  plannedExpenses,
  includePlannedExpenses,
  onTogglePlannedExpenses,
  projectedPayablesAmount,
  includeProjectedPayables,
  onToggleProjectedPayables,
  overdueDebt,
  includeOverdueDebt,
  onToggleOverdueDebt,
  plannedRepayment,
  includePlannedRepayment,
  onTogglePlannedRepayment,
}: {
  total: number
  plannedExpenses: number
  includePlannedExpenses: boolean
  onTogglePlannedExpenses: () => void
  projectedPayablesAmount: number
  includeProjectedPayables: boolean
  onToggleProjectedPayables: () => void
  overdueDebt: number
  includeOverdueDebt: boolean
  onToggleOverdueDebt: () => void
  plannedRepayment: number
  includePlannedRepayment: boolean
  onTogglePlannedRepayment: () => void
}) {
  return (
    <Card className="flex min-w-0 h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Обязательства</CardTitle>
        <p className="text-sm text-muted-foreground">
          Плановые расходы плюс выбранные долги прошлых периодов.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-3xl font-bold tabular-nums [overflow-wrap:anywhere]">
          {formatMoney(total)} ₽
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            aria-pressed={includePlannedExpenses}
            variant={includePlannedExpenses ? 'default' : 'outline'}
            size="sm"
            className="h-auto min-h-10 max-w-full justify-start whitespace-normal text-left tabular-nums [overflow-wrap:anywhere]"
            onClick={onTogglePlannedExpenses}
          >
            {includePlannedExpenses ? '+' : ''} Плановые расходы:{' '}
            {formatMoney(plannedExpenses)} ₽
          </Button>

          <Button
            aria-pressed={includeProjectedPayables}
            variant={includeProjectedPayables ? 'default' : 'outline'}
            size="sm"
            className="h-auto min-h-10 max-w-full justify-start whitespace-normal text-left tabular-nums [overflow-wrap:anywhere]"
            onClick={onToggleProjectedPayables}
          >
            {includeProjectedPayables ? '+' : ''} Платежи текущего месяца:{' '}
            {formatMoney(projectedPayablesAmount)} ₽
          </Button>

          <Button
            aria-pressed={includeOverdueDebt}
            variant={includeOverdueDebt ? 'default' : 'outline'}
            size="sm"
            className="h-auto min-h-10 max-w-full justify-start whitespace-normal text-left tabular-nums [overflow-wrap:anywhere]"
            onClick={onToggleOverdueDebt}
          >
            {includeOverdueDebt ? '+' : ''} Просроченная задолженность:{' '}
            {formatMoney(overdueDebt)} ₽
          </Button>

          <Button
            aria-pressed={includePlannedRepayment}
            variant={includePlannedRepayment ? 'default' : 'outline'}
            size="sm"
            className="h-auto min-h-10 max-w-full justify-start whitespace-normal text-left tabular-nums [overflow-wrap:anywhere]"
            onClick={onTogglePlannedRepayment}
          >
            {includePlannedRepayment ? '+' : ''} Задолженность:{' '}
            {formatMoney(plannedRepayment)} ₽
          </Button>
        </div>

        <div className="mt-auto flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/payables">Открыть</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
