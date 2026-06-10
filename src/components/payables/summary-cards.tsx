import { Card } from '#/components/ui/card'

import type { AccountBalance, ExpenseRow } from './types'
import { formatCurrency, getPayablesSummary } from './utils'

type PayablesSummaryCardsProps = {
  currentMonth: ExpenseRow[]
  previousUnpaid: ExpenseRow[]
  accountBalances: AccountBalance[]
}

export function PayablesSummaryCards({
  currentMonth,
  previousUnpaid,
  accountBalances,
}: PayablesSummaryCardsProps) {
  const summary = getPayablesSummary(currentMonth, previousUnpaid)

  return (
    <div className="flex flex-col gap-3">
      {accountBalances.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {accountBalances.map((account) => {
            const balance = Number(account.balance)

            return (
              <Card
                key={account.id}
                className="flex min-w-35 flex-col justify-center gap-2 p-4"
              >
                <p className="text-muted-foreground text-sm">{account.name}</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    balance < 0 ? 'text-destructive' : 'text-on-surface'
                  }`}
                >
                  {formatCurrency(balance)} ₽
                </p>
              </Card>
            )
          })}
        </div>
      )}

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
            <p className="text-muted-foreground text-sm">
              Долг прошлых периодов
            </p>
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
    </div>
  )
}
