import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { RecurringMonthTotals } from '#/components/recurring/types'
import {
  formatMonthLabel,
  formatRuleAmount,
} from '#/components/recurring/utils'

export function RecurringSummaryCards({
  selectedMonth,
  onMonthChange,
  currentTotals,
  nextTotals,
}: {
  selectedMonth: Date
  onMonthChange: (date: Date) => void
  currentTotals: RecurringMonthTotals
  nextTotals: RecurringMonthTotals
}) {
  const goPrev = () =>
    onMonthChange(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1),
    )
  const goNext = () =>
    onMonthChange(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1),
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-40 text-center text-sm font-medium tabular-nums">
          {formatMonthLabel(selectedMonth)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          aria-label="Следующий месяц"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Доходы"
          current={currentTotals.income}
          currentCount={currentTotals.incomeCount}
          next={nextTotals.income}
          nextCount={nextTotals.incomeCount}
          tone="success"
          icon={<ArrowUpRight className="size-4 text-success" />}
        />
        <SummaryCard
          title="Расходы"
          current={currentTotals.expenses}
          currentCount={currentTotals.expensesCount}
          next={nextTotals.expenses}
          nextCount={nextTotals.expensesCount}
          tone="warning"
          icon={<ArrowDownRight className="size-4 text-warning" />}
        />
        <NetCard
          currentNet={currentTotals.income - currentTotals.expenses}
          nextNet={nextTotals.income - nextTotals.expenses}
        />
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  current,
  currentCount,
  next,
  nextCount,
  tone,
  icon,
}: {
  title: string
  current: number
  currentCount: number
  next: number
  nextCount: number
  tone: 'success' | 'warning'
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {currentCount} {pluralOccurrences(currentCount)}
          </p>
        </div>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={`text-3xl font-semibold tabular-nums ${
            tone === 'success' ? 'text-success' : 'text-warning'
          }`}
        >
          {formatRuleAmount(current)} ₽
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          След. месяц: {formatRuleAmount(next)} ₽ · {nextCount}{' '}
          {pluralOccurrences(nextCount)}
        </p>
      </CardContent>
    </Card>
  )
}

function NetCard({
  currentNet,
  nextNet,
}: {
  currentNet: number
  nextNet: number
}) {
  const tone = currentNet >= 0 ? 'success' : 'danger'
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Сальдо</CardTitle>
          <p className="text-sm text-muted-foreground">Доходы минус расходы</p>
        </div>
        {currentNet >= 0 ? (
          <ArrowUpRight className="size-4 text-success" />
        ) : (
          <ArrowDownRight className="size-4 text-destructive" />
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={`text-3xl font-semibold tabular-nums ${
            tone === 'success' ? 'text-success' : 'text-destructive'
          }`}
        >
          {formatRuleAmount(currentNet)} ₽
        </p>
        <p
          className={`text-sm tabular-nums ${
            nextNet >= 0 ? 'text-muted-foreground' : 'text-destructive/70'
          }`}
        >
          След. месяц: {formatRuleAmount(nextNet)} ₽
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
