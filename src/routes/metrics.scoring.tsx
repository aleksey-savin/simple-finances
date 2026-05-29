import { createFileRoute } from '@tanstack/react-router'

import { fetchScoringMetrics } from '#/components/metrics/actions'
import { buildScoringColumns } from '#/components/metrics/columns'
import { Card } from '#/components/ui/card'
import { DataTable } from '#/components/ui/data-table'
import { Skeleton } from '#/components/ui/skeleton'

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="flex min-w-44 flex-col justify-center gap-1 p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </Card>
  )
}

function ScoringMetricsPage() {
  const {
    total,
    highestCount,
    notHighestCount,
    highestPercentage,
    mismatches,
  } = Route.useLoaderData()

  const columns = buildScoringColumns()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Скоринг банковских выписок</h1>
        <p className="text-sm text-muted-foreground">
          Насколько часто при разнесении выписки выбирался кандидат с наивысшей
          оценкой. Чем выше доля, тем безопаснее автоматизировать выбор.
        </p>
      </div>

      {total === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Пока нет данных. Оценки сохраняются при разнесении новых банковских
          операций — привяжите несколько операций на странице «Банковские
          выписки», и статистика появится здесь.
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Выбран лучший кандидат"
              value={`${highestPercentage}%`}
              hint={`${highestCount} из ${total}`}
            />
            <StatCard label="С лучшей оценкой" value={String(highestCount)} />
            <StatCard
              label="Не с лучшей оценкой"
              value={String(notHighestCount)}
            />
            <StatCard label="Всего операций" value={String(total)} />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold">
                Операции с не лучшей оценкой
              </h2>
              <p className="text-sm text-muted-foreground">
                Верхняя строка — данные из банковской выписки, нижняя (↳) —
                связанный документ в системе.
              </p>
            </div>
            <DataTable
              columns={columns}
              data={mismatches}
              initialSorting={[{ id: 'bookedAt', desc: true }]}
              defaultPageSize={50}
              pageSizes={[25, 50, 100]}
            />
          </div>
        </>
      )}
    </div>
  )
}

function ScoringMetricsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex min-w-44 flex-col justify-center gap-2 border p-4"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="border p-4 flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/metrics/scoring')({
  component: ScoringMetricsPage,
  loader: () => fetchScoringMetrics(),
  pendingComponent: ScoringMetricsSkeleton,
  pendingMs: 0,
})
