import { Link } from '@tanstack/react-router'
import { ChevronRight, FileClock } from 'lucide-react'
import type { ReactNode } from 'react'

import { SaldoMetricCard } from '#/components/dashboard/saldo-metric-card'
import { formatMoney, formatShortDate } from '#/lib/format'

const metricLinkClassName =
  'flex min-w-0 flex-col gap-1 px-4 py-3 sm:py-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

export function DashboardSummary({
  incomingValue,
  obligationsValue,
  expensesAmount,
  receivablesAmount,
  overdueReceivablesAmount,
  lastStatementDate,
  children,
}: {
  incomingValue: number
  obligationsValue: number
  expensesAmount: number
  receivablesAmount: number
  overdueReceivablesAmount: number
  lastStatementDate: string | null
  children: ReactNode
}) {
  return (
    <section aria-label="Финансовая сводка" className="border bg-card">
      <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 short-landscape:grid-cols-3 short-landscape:divide-x short-landscape:divide-y-0">
        <SaldoMetricCard
          incomingValue={incomingValue}
          obligationsValue={obligationsValue}
        >
          {children}
        </SaldoMetricCard>

        <Link to="/receivables" className={metricLinkClassName}>
          <span className="flex items-center justify-between gap-2 text-sm font-medium">
            Дебиторка
            <ChevronRight
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </span>
          <span className="text-3xl font-bold tabular-nums text-accent-text [overflow-wrap:anywhere] short-landscape:text-xl">
            {formatMoney(receivablesAmount)} ₽
          </span>
          <span
            className={
              overdueReceivablesAmount > 0
                ? 'text-sm text-destructive tabular-nums [overflow-wrap:anywhere] short-landscape:hidden'
                : 'text-sm text-muted-foreground short-landscape:hidden'
            }
          >
            {overdueReceivablesAmount > 0
              ? `Просрочено ${formatMoney(overdueReceivablesAmount)} ₽`
              : 'Без просрочки'}
          </span>
        </Link>

        <Link to="/payables" className={metricLinkClassName}>
          <span className="flex items-center justify-between gap-2 text-sm font-medium">
            Расходы и обязательства
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </span>
          <span className="text-3xl font-bold tabular-nums [overflow-wrap:anywhere] short-landscape:text-xl">
            {formatMoney(expensesAmount)} ₽
          </span>
          <span className="text-sm text-muted-foreground short-landscape:hidden">
            К оплате и по плану на месяц
          </span>
        </Link>
      </div>

      <Link
        to="/bank-import"
        search={{
          page: 1,
          pageSize: 25,
          search: '',
          counterparty: '',
          direction: 'all',
          status: 'all',
        }}
        className="flex items-center gap-3 border-t px-4 py-3 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <FileClock
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-muted-foreground">Последняя выписка</span>
          {lastStatementDate ? (
            <time
              dateTime={lastStatementDate}
              className="font-medium tabular-nums"
            >
              Операции по {formatShortDate(lastStatementDate)}
            </time>
          ) : (
            <span className="text-muted-foreground">Ещё не загружена</span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </section>
  )
}
