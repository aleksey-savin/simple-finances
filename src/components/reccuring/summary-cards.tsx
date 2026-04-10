import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { RecurringMonthTotals } from '#/components/reccuring/types'
import { formatRuleAmount } from '#/components/reccuring/utils'

export function RecurringSummaryCards({
  currentMonthTotals,
}: {
  currentMonthTotals: RecurringMonthTotals
}) {
  const net = currentMonthTotals.income - currentMonthTotals.expenses

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard
        title="Доходы месяца"
        value={currentMonthTotals.income}
        count={currentMonthTotals.incomeCount}
        tone="success"
        icon={<ArrowUpRight className="size-4 text-success" />}
      />
      <SummaryCard
        title="Расходы месяца"
        value={currentMonthTotals.expenses}
        count={currentMonthTotals.expensesCount}
        tone="warning"
        icon={<ArrowDownRight className="size-4 text-warning" />}
      />
      <SummaryCard
        title="Сальдо"
        value={net}
        count={null}
        tone={net >= 0 ? 'success' : 'danger'}
        icon={
          net >= 0 ? (
            <ArrowUpRight className="size-4 text-success" />
          ) : (
            <ArrowDownRight className="size-4 text-destructive" />
          )
        }
      />
    </div>
  )
}

function SummaryCard({
  title,
  value,
  count,
  tone,
  icon,
}: {
  title: string
  value: number
  count: number | null
  tone: 'success' | 'warning' | 'danger'
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {count === null
              ? 'Доходы минус расходы'
              : `${count} ${pluralOccurrences(count)}`}
          </p>
        </div>
        {icon}
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-semibold tabular-nums ${
            tone === 'success'
              ? 'text-success'
              : tone === 'warning'
                ? 'text-warning'
                : 'text-destructive'
          }`}
        >
          {formatRuleAmount(value)} ₽
        </p>
      </CardContent>
    </Card>
  )
}

function pluralOccurrences(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return 'срабатывание'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'срабатывания'
  }

  return 'срабатываний'
}
