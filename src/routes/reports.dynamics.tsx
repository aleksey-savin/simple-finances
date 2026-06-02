import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { fetchProfitabilityReport } from '#/components/reports/actions'
import type { ProfitabilityMonths } from '#/components/reports/actions'
import { buildProfitabilityColumns } from '#/components/reports/columns'
import { ProfitabilityChart } from '#/components/reports/profitability-chart'
import { basisValues } from '#/components/reports/utils'
import type { ProfitabilityBasis } from '#/components/reports/utils'
import { Card } from '#/components/ui/card'
import { DataTable } from '#/components/ui/data-table'
import { Skeleton } from '#/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatMoney } from '#/lib/format'

const searchSchema = z.object({
  months: z.union([z.literal(6), z.literal(12), z.literal(24)]).default(6),
})

function StatCard({
  label,
  value,
  className,
  hint,
}: {
  label: string
  value: string
  className?: string
  hint?: string
}) {
  return (
    <Card className="flex min-w-44 flex-col justify-center gap-1 p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-2xl font-semibold tabular-nums ${className ?? ''}`}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </Card>
  )
}

function ProfitabilityPage() {
  const { points, hasAccounts } = Route.useLoaderData()
  const { months } = Route.useSearch()
  const router = useRouter()

  const [basis, setBasis] = useState<ProfitabilityBasis>('cash')

  const columns = buildProfitabilityColumns()

  const totals = points.reduce(
    (acc, p) => {
      const v = basisValues(p, basis)
      acc.income += v.income
      acc.expense += v.expense
      acc.net += v.net
      return acc
    },
    { income: 0, expense: 0, net: 0 },
  )

  const changeMonths = (next: ProfitabilityMonths) => {
    void router.navigate({
      to: '/reports/dynamics',
      search: { months: next },
      replace: true,
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Динамика</h1>
        <p className="text-sm text-muted-foreground">
          Ретроспектива доходов, расходов и сальдо по месяцам. «Факт» — по дате
          оплаты, «Начисления» — по дате создания документа. Текущий месяц —
          прогноз: к фактическим суммам добавлены запланированные платежи (по
          расписанию и срокам оплаты).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          variant="outline"
          type="single"
          value={basis}
          onValueChange={(v) => {
            if (v) setBasis(v as ProfitabilityBasis)
          }}
        >
          <ToggleGroupItem value="cash" className="h-9 px-3 text-sm">
            Факт (касса)
          </ToggleGroupItem>
          <ToggleGroupItem value="accrual" className="h-9 px-3 text-sm">
            Начисления
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          variant="outline"
          type="single"
          value={String(months)}
          onValueChange={(v) => {
            if (v) changeMonths(Number(v) as ProfitabilityMonths)
          }}
        >
          <ToggleGroupItem value="6" className="h-9 px-3 text-sm">
            6 мес.
          </ToggleGroupItem>
          <ToggleGroupItem value="12" className="h-9 px-3 text-sm">
            12 мес.
          </ToggleGroupItem>
          <ToggleGroupItem value="24" className="h-9 px-3 text-sm">
            24 мес.
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {!hasAccounts || points.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Нет данных для отчёта. Добавьте расчётные счета и операции — здесь
          появится ретроспектива доходности.
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <StatCard
              label={`Доход за период (${basis === 'cash' ? 'факт' : 'начисл.'})`}
              value={formatMoney(totals.income)}
              className="text-success"
            />
            <StatCard
              label={`Расход за период (${basis === 'cash' ? 'факт' : 'начисл.'})`}
              value={formatMoney(totals.expense)}
              className="text-warning"
            />
            <StatCard
              label="Сальдо за период"
              value={formatMoney(totals.net)}
              className={
                totals.net > 0
                  ? 'text-success'
                  : totals.net < 0
                    ? 'text-warning'
                    : undefined
              }
            />
          </div>

          <Card className="min-w-0 p-4">
            <ProfitabilityChart points={points} basis={basis} />
          </Card>

          <DataTable
            columns={columns}
            data={points}
            initialSorting={[{ id: 'month', desc: true }]}
            pagination={false}
          />
        </>
      )}
    </div>
  )
}

function ProfitabilitySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex min-w-44 flex-col justify-center gap-2 border p-4"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="border p-4">
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/reports/dynamics')({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ months: search.months }),
  loader: ({ deps }) =>
    fetchProfitabilityReport({ data: { months: deps.months } }),
  component: ProfitabilityPage,
  pendingComponent: ProfitabilitySkeleton,
  pendingMs: 0,
})
