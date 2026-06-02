import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { formatMoney } from '#/lib/format'
import type { ProfitabilityMonthPoint } from '#/types'

export type ProfitabilityBasis = 'cash' | 'accrual'

const chartConfig = {
  income: { label: 'Доход', color: 'var(--success)' },
  expense: { label: 'Расход', color: 'var(--warning)' },
  net: { label: 'Нетто за месяц', color: 'var(--primary)' },
  balance: { label: 'Остаток на 1-е', color: 'var(--muted-foreground)' },
} satisfies ChartConfig

function compactMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function ProfitabilityChart({
  points,
  basis,
}: {
  points: ProfitabilityMonthPoint[]
  basis: ProfitabilityBasis
}) {
  const data = points.map((point) => ({
    label: point.label,
    income: basis === 'cash' ? point.incomeCash : point.incomeAccrual,
    expense: basis === 'cash' ? point.expenseCash : point.expenseAccrual,
    net: basis === 'cash' ? point.netCash : point.netAccrual,
    balance: point.balanceAtStart,
  }))

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
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const itemConfig = chartConfig[name as keyof typeof chartConfig]
                return (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {itemConfig.label}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatMoney(Number(value))}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" maxBarSize={36} />
        <Bar dataKey="expense" fill="var(--color-expense)" maxBarSize={36} />
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
