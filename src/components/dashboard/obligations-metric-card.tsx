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
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Обязательства</CardTitle>
        <p className="text-sm text-muted-foreground">
          Плановые расходы плюс выбранные долги прошлых периодов.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-warning text-3xl font-semibold tabular-nums">
          {formatMoney(total)} ₽
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={includePlannedExpenses ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePlannedExpenses}
          >
            {includePlannedExpenses ? '+' : ''} Плановые расходы:{' '}
            {formatMoney(plannedExpenses)} ₽
          </Button>

          <Button
            variant={includeProjectedPayables ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleProjectedPayables}
          >
            {includeProjectedPayables ? '+' : ''} Платежи текущего месяца:{' '}
            {formatMoney(projectedPayablesAmount)} ₽
          </Button>

          <Button
            variant={includeOverdueDebt ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleOverdueDebt}
          >
            {includeOverdueDebt ? '+' : ''} Просроченная задолженность:{' '}
            {formatMoney(overdueDebt)} ₽
          </Button>

          <Button
            variant={includePlannedRepayment ? 'default' : 'outline'}
            size="sm"
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
