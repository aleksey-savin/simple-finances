import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip } from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatMoney } from '#/lib/format'
import type { ProfitabilityMonthPoint } from '#/types'
import { basisValues } from '#/components/reports/utils'
import type { ProfitabilityBasis } from '#/components/reports/utils'

export type { ProfitabilityBasis } from '#/components/reports/utils'

const chartConfig = {
  income: { label: 'Доход', color: 'var(--success)' },
  expense: { label: 'Расход', color: 'var(--warning)' },
  net: { label: 'Нетто за месяц', color: 'var(--primary)' },
  balance: { label: 'Остаток на 1-е', color: 'var(--muted-foreground)' },
} satisfies ChartConfig

type ChartDatum = {
  label: string
  incomeActual: number
  incomePlanned: number
  expenseActual: number
  expensePlanned: number
  net: number
  balance: number
  isForecast: boolean
}

function compactMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function TooltipRow({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
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
        className="text-success"
      />
      {d.incomePlanned > 0 ? (
        <TooltipRow
          label="Доход (план)"
          value={d.incomePlanned}
          className="text-success"
        />
      ) : null}
      <TooltipRow
        label={d.isForecast ? 'Расход (факт)' : 'Расход'}
        value={d.expenseActual}
        className="text-warning"
      />
      {d.expensePlanned > 0 ? (
        <TooltipRow
          label="Расход (план)"
          value={d.expensePlanned}
          className="text-warning"
        />
      ) : null}
      <TooltipRow label="Нетто за месяц" value={d.net} />
      <TooltipRow label="Остаток на 1-е" value={d.balance} />
    </div>
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
      balance: point.balanceAtStart,
      isForecast: point.isForecast,
    }
  })

  return (
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
          dataKey="balance"
          type="monotone"
          stroke="var(--color-balance)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  )
}
