import { Link } from '@tanstack/react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Check,
  Landmark,
  Rows3,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { DashboardLoaderData } from '#/types'

type DashboardPageProps = DashboardLoaderData & {
  onScopeChange: (scopeId: string) => void
}

export function DashboardPage({
  scopes,
  selectedScopeId,
  accounts,
  totalBalance,
  bankSummary,
  monthlyOutlook,
  onScopeChange,
}: DashboardPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scopes.map((scope) => {
          const isSelected = scope.id === selectedScopeId

          return (
            <button
              key={scope.id}
              type="button"
              onClick={() => onScopeChange(scope.id)}
              className={`border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'bg-card hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{scope.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {scope.kind === 'personal' ? (
                    <UserRound className="size-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="size-4 text-muted-foreground" />
                  )}
                  {isSelected && <Check className="size-4 text-primary" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FormulaMetricCard
          title="Ожидаемые поступления"
          caption="Открытая дебиторка плюс счета, которые ещё будут выставлены."
          href="/receivables"
          total={monthlyOutlook.currentMonthIncoming}
          totalTone="success"
          rows={[
            {
              label: `Дебиторская задолженность (${monthlyOutlook.receivablesCount})`,
              value: monthlyOutlook.receivablesAmount,
            },
            {
              label: `Ещё не выставлено (${monthlyOutlook.unissuedInvoicesCount})`,
              value: monthlyOutlook.unissuedInvoicesAmount,
              prefix: '+',
            },
          ]}
        />
        <FormulaMetricCard
          title="Обязательства"
          caption="Плановые расходы текущего месяца плюс просроченные обязательства."
          href="/payables"
          total={monthlyOutlook.expensesWithDebt}
          totalTone="warning"
          rows={[
            {
              label: `Плановые расходы (${monthlyOutlook.plannedExpensesCount})`,
              value: monthlyOutlook.plannedExpenses,
            },
            {
              label: `Долг прошлых периодов (${monthlyOutlook.previousPeriodDebtCount})`,
              value: monthlyOutlook.previousPeriodDebt,
              prefix: '+',
            },
          ]}
        />
        <NetMetricCard
          title="Сальдо"
          href="/transactions"
          primaryLabel="Без учёта задолженности"
          primaryValue={monthlyOutlook.netWithoutPreviousPeriodDebt}
          secondaryLabel="С учётом задолженности"
          secondaryValue={monthlyOutlook.netWithPreviousPeriodDebt}
          search={{ page: 1, pageSize: 25 }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Баланс текущих счетов</CardTitle>
              <p className="text-sm text-muted-foreground">
                Суммарный остаток по доступным расчётным счетам.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Всего</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(totalBalance)} ₽
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {accounts.length === 0 ? (
              <div className="border border-dashed bg-muted/10 p-6 text-sm text-muted-foreground">
                В выбранном scope нет счетов
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.bankNameInitials ?? 'Банк не указан'}
                      </p>
                    </div>
                    <Landmark className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-xl font-semibold tabular-nums">
                    {formatMoney(account.balance)} ₽
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Неразнесённый банк</CardTitle>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat
                label="Строк"
                value={String(bankSummary.totalCount)}
                icon={<Rows3 className="size-4 text-muted-foreground" />}
              />
              <MiniStat
                label="Входящие"
                value={`${formatMoney(bankSummary.incomingRemaining)} ₽`}
                icon={<ArrowDownLeft className="size-4 text-success" />}
              />
              <MiniStat
                label="Исходящие"
                value={`${formatMoney(bankSummary.outgoingRemaining)} ₽`}
                icon={<ArrowUpRight className="size-4 text-muted-foreground" />}
              />
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                Всего не разнесено
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatMoney(bankSummary.totalRemaining)} ₽
              </p>
            </div>
            <div className="mt-auto flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/bank-import"
                  search={{
                    page: 1,
                    pageSize: 25,
                    search: '',
                    direction: 'all',
                    status: 'all',
                  }}
                >
                  К выпискам
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FormulaMetricCard({
  title,
  caption,
  href,
  total,
  totalTone,
  rows,
}: {
  title: string
  caption: string
  href: '/receivables' | '/payables'
  total: number
  totalTone: 'default' | 'success' | 'warning' | 'danger'
  rows: Array<{
    label: string
    value: number
    prefix?: '+' | '-'
  }>
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p
          className={`text-3xl font-semibold tabular-nums ${
            totalTone === 'success'
              ? 'text-success'
              : totalTone === 'warning'
                ? 'text-warning'
                : totalTone === 'danger'
                  ? 'text-destructive'
                  : ''
          }`}
        >
          {formatMoney(total)} ₽
        </p>
        <div className="space-y-2">
          {rows.map((row) => (
            <BreakdownRow
              key={row.label}
              label={row.label}
              value={row.value}
              prefix={row.prefix}
            />
          ))}
        </div>
        <div className="mt-auto flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to={href}>Открыть</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NetMetricCard({
  title,
  href,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  search,
}: {
  title: string
  href: '/transactions'
  primaryLabel: string
  primaryValue: number
  secondaryLabel: string
  secondaryValue: number
  search: { page: number; pageSize: 25 | 50 | 100 }
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Денежный результат месяца в двух сценариях.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <NetValue label={primaryLabel} value={primaryValue} />
        <NetValue label={secondaryLabel} value={secondaryValue} />
        <div className="mt-auto flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to={href} search={search}>
              Открыть
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownRow({
  label,
  value,
  prefix,
}: {
  label: string
  value: number
  prefix?: '+' | '-'
}) {
  return (
    <div className="flex items-center justify-between gap-4 border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="font-medium text-foreground/80">{prefix ?? ''}</span>
        <span>{label}</span>
      </div>
      <span className="font-medium tabular-nums">{formatMoney(value)} ₽</span>
    </div>
  )
}

function NetValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="border bg-muted/20 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          value >= 0 ? 'text-success' : 'text-destructive'
        }`}
      >
        {formatMoney(value)} ₽
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
