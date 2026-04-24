import { Link, useRouter } from '@tanstack/react-router'
import { ArrowDownLeft, ArrowUpRight, Rows3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { BlockedServicesCard } from '#/components/contracts/blocked-services-card'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { DashboardLoaderData } from '#/types'

export function DashboardPage({
  accounts,
  totalBalance,
  bankSummary,
  monthlyOutlook,
  blockedServices,
}: DashboardLoaderData) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4">
      {blockedServices.length > 0 && (
        <BlockedServicesCard
          services={blockedServices}
          showClientName
          showVmList
          onUpdated={async () => {
            await router.invalidate()
          }}
        />
      )}

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
        <SaldoMetricCard
          title="Сальдо"
          accounts={accounts}
          baseValue={
            monthlyOutlook.currentMonthIncoming - monthlyOutlook.plannedExpenses
          }
          overduePreviousPeriodDebt={monthlyOutlook.overduePreviousPeriodDebt}
          plannedPreviousPeriodRepayment={
            monthlyOutlook.plannedPreviousPeriodRepayment
          }
        />
      </div>

      <div className="grid gap-4">
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

function SaldoMetricCard({
  title,
  accounts,
  baseValue,
  overduePreviousPeriodDebt,
  plannedPreviousPeriodRepayment,
}: {
  title: string
  accounts: DashboardLoaderData['accounts']
  baseValue: number
  overduePreviousPeriodDebt: number
  plannedPreviousPeriodRepayment: number
}) {
  const [includedAccountIds, setIncludedAccountIds] = useState(
    () => new Set<string>(),
  )
  const [includeOverdueDebt, setIncludeOverdueDebt] = useState(false)
  const [includePlannedRepayment, setIncludePlannedRepayment] = useState(false)

  const includedAccountsBalance = useMemo(
    () =>
      accounts.reduce(
        (sum, account) =>
          includedAccountIds.has(account.id) ? sum + account.balance : sum,
        0,
      ),
    [accounts, includedAccountIds],
  )

  const saldo =
    baseValue +
    includedAccountsBalance +
    (includePlannedRepayment ? -plannedPreviousPeriodRepayment : 0) +
    (includeOverdueDebt ? -overduePreviousPeriodDebt : 0)

  const toggleAccount = (accountId: string) => {
    setIncludedAccountIds((current) => {
      const next = new Set(current)

      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }

      return next
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          База: ожидаемые поступления минус обязательства. Переключатели
          добавляют сценарные корректировки поверх базы.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p
          className={`text-3xl font-semibold tabular-nums ${
            saldo >= 0 ? 'text-success' : 'text-destructive'
          }`}
        >
          {formatMoney(saldo)} ₽
        </p>

        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => {
            const isIncluded = includedAccountIds.has(account.id)

            return (
              <Button
                key={account.id}
                variant={isIncluded ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleAccount(account.id)}
              >
                {isIncluded ? '+' : ''} {account.name}:{' '}
                {formatMoney(account.balance)} ₽
              </Button>
            )
          })}

          <Button
            variant={includeOverdueDebt ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIncludeOverdueDebt((current) => !current)}
          >
            {includeOverdueDebt ? '+' : ''} Просроченная задолженность:{' '}
            {formatMoney(overduePreviousPeriodDebt)} ₽
          </Button>

          <Button
            variant={includePlannedRepayment ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIncludePlannedRepayment((current) => !current)}
          >
            {includePlannedRepayment ? '+' : ''} Задолженность с будущим сроком
            оплаты:{' '}
            {formatMoney(plannedPreviousPeriodRepayment)} ₽
          </Button>
        </div>

        <div className="mt-auto flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/transactions" search={{ page: 1, pageSize: 25 }}>
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
