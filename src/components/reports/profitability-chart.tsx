import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatMoney } from '#/lib/format'
import type { ProfitabilityMonthPoint } from '#/types'
import { basisValues } from '#/components/reports/utils'
import type { ProfitabilityBasis } from '#/components/reports/utils'

export type { ProfitabilityBasis } from '#/components/reports/utils'

const chartConfig = {
  income: { label: 'Доход', color: 'var(--chart-1)' },
  expense: { label: 'Расход', color: 'var(--chart-3)' },
  net: { label: 'Сальдо за месяц', color: 'var(--chart-4)' },
  debt: { label: 'Долг на 1-е', color: 'var(--destructive)' },
  balance: { label: 'Баланс на 1-е', color: 'var(--chart-2)' },
} satisfies ChartConfig

type ChartDatum = {
  label: string
  incomeActual: number
  incomePlanned: number
  expenseActual: number
  expensePlanned: number
  net: number
  debt: number
  balanceStart: number
  isForecast: boolean
}

function compactMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

type SeriesMark = 'bar' | 'bar-planned' | 'line' | 'line-dashed'

function SeriesSwatch({ mark, color }: { mark: SeriesMark; color: string }) {
  if (mark === 'line' || mark === 'line-dashed') {
    return (
      <span
        className={`w-4 shrink-0 border-t-2 ${mark === 'line-dashed' ? 'border-dashed' : ''}`}
        style={{ borderColor: color }}
      />
    )
  }
  return (
    <span
      className={`size-2.5 shrink-0 ${mark === 'bar-planned' ? 'opacity-40' : ''}`}
      style={{ backgroundColor: color }}
    />
  )
}

function TooltipRow({
  label,
  value,
  mark,
  color,
  className,
}: {
  label: string
  value: number
  mark: SeriesMark
  color: string
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        <SeriesSwatch mark={mark} color={color} />
        {label}
      </span>
      <span className={`font-mono font-medium tabular-nums ${className ?? ''}`}>
        {formatMoney(value)}
      </span>
    </div>
  )
}

function ReportTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartDatum }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="grid min-w-[12rem] gap-1.5 border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">
        {d.label}
        {d.isForecast ? (
          <span className="text-muted-foreground"> · прогноз</span>
        ) : null}
      </div>
      <TooltipRow
        label={d.isForecast ? 'Доход (факт)' : 'Доход'}
        value={d.incomeActual}
        mark="bar"
        color={chartConfig.income.color}
        className="text-accent-text"
      />
      {d.incomePlanned > 0 ? (
        <TooltipRow
          label="Доход (план)"
          value={d.incomePlanned}
          mark="bar-planned"
          color={chartConfig.income.color}
          className="text-accent-text"
        />
      ) : null}
      <TooltipRow
        label={d.isForecast ? 'Расход (факт)' : 'Расход'}
        value={d.expenseActual}
        mark="bar"
        color={chartConfig.expense.color}
      />
      {d.expensePlanned > 0 ? (
        <TooltipRow
          label="Расход (план)"
          value={d.expensePlanned}
          mark="bar-planned"
          color={chartConfig.expense.color}
        />
      ) : null}
      <TooltipRow
        label="Сальдо за месяц"
        value={d.net}
        mark="line"
        color={chartConfig.net.color}
      />
      <TooltipRow
        label="Баланс на 1-е"
        value={d.balanceStart}
        mark="line"
        color={chartConfig.balance.color}
      />
      <TooltipRow
        label="Долг на 1-е"
        value={d.debt}
        mark="line-dashed"
        color={chartConfig.debt.color}
        className="text-destructive"
      />
    </div>
  )
}

function ChartLegend({ hasPlanned }: { hasPlanned: boolean }) {
  const items: {
    mark: SeriesMark
    color: string
    label: string
    hint?: string
  }[] = [
    {
      mark: 'bar',
      color: chartConfig.income.color,
      label: 'Доход',
    },
    {
      mark: 'bar',
      color: chartConfig.expense.color,
      label: 'Расход',
    },
    ...(hasPlanned
      ? [
          {
            mark: 'bar-planned' as const,
            color: 'var(--muted-foreground)',
            label: 'План',
            hint: 'ожидается до конца текущего месяца',
          },
        ]
      : []),
    {
      mark: 'line',
      color: chartConfig.net.color,
      label: 'Сальдо за месяц',
      hint: 'доход минус расход',
    },
    {
      mark: 'line',
      color: chartConfig.balance.color,
      label: 'Баланс на 1-е',
      hint: 'остаток на счетах на начало месяца',
    },
    {
      mark: 'line-dashed',
      color: chartConfig.debt.color,
      label: 'Долг на 1-е',
      hint: 'неоплаченные расходы на начало месяца',
    },
  ]

  return (
    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <SeriesSwatch mark={item.mark} color={item.color} />
          <span>{item.label}</span>
          {item.hint ? (
            <span className="text-muted-foreground">· {item.hint}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function ProfitabilityChart({
  points,
  basis,
}: {
  points: ProfitabilityMonthPoint[]
  basis: ProfitabilityBasis
}) {
  const data: ChartDatum[] = points.map((point) => {
    const v = basisValues(point, basis)
    return {
      label: point.label,
      incomeActual: v.incomeActual,
      incomePlanned: v.incomePlanned,
      expenseActual: v.expenseActual,
      expensePlanned: v.expensePlanned,
      net: v.net,
      debt: point.debt,
      balanceStart: point.balanceStart,
      isForecast: point.isForecast,
    }
  })

  const hasPlanned = data.some(
    (d) => d.incomePlanned > 0 || d.expensePlanned > 0,
  )

  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[320px] w-full"
      >
        <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={compactMoney}
            className="tabular-nums"
          />
          <ChartTooltip content={<ReportTooltip />} />
          {/* Income: realized + forecast (current month only) */}
          <Bar
            dataKey="incomeActual"
            stackId="income"
            fill="var(--color-income)"
            maxBarSize={36}
          />
          <Bar
            dataKey="incomePlanned"
            stackId="income"
            fill="var(--color-income)"
            fillOpacity={0.4}
            maxBarSize={36}
          />
          {/* Expense: realized + forecast (current month only) */}
          <Bar
            dataKey="expenseActual"
            stackId="expense"
            fill="var(--color-expense)"
            maxBarSize={36}
          />
          <Bar
            dataKey="expensePlanned"
            stackId="expense"
            fill="var(--color-expense)"
            fillOpacity={0.4}
            maxBarSize={36}
          />
          <Line
            dataKey="net"
            type="monotone"
            stroke="var(--color-net)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="debt"
            type="monotone"
            stroke="var(--color-debt)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            dataKey="balanceStart"
            type="monotone"
            stroke="var(--color-balance)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
      <ChartLegend hasPlanned={hasPlanned} />
    </>
  )
}
