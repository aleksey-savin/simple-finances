import { Link, useRouter } from '@tanstack/react-router'
import { Banknote, ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'

import { BlockedServicesCard } from '#/components/contracts/blocked-services-card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { DashboardLoaderData } from '#/types'

export function DashboardPage({
  accounts,
  tasks,
  monthlyOutlook,
  blockedServices,
}: DashboardLoaderData) {
  const router = useRouter()
  const [includedAccountIds, setIncludedAccountIds] = useState(
    () => new Set(accounts.map((account) => account.id)),
  )
  const [includeOverdueReceivables, setIncludeOverdueReceivables] =
    useState(true)
  const [includeCurrentReceivables, setIncludeCurrentReceivables] =
    useState(true)
  const [includeUnissuedInvoices, setIncludeUnissuedInvoices] = useState(true)
  const [includePlannedExpenses, setIncludePlannedExpenses] = useState(true)
  const [includeOverdueDebt, setIncludeOverdueDebt] = useState(true)
  const [includePlannedRepayment, setIncludePlannedRepayment] = useState(true)

  const includedAccountsBalance = useMemo(
    () =>
      accounts.reduce(
        (sum, account) =>
          includedAccountIds.has(account.id) ? sum + account.balance : sum,
        0,
      ),
    [accounts, includedAccountIds],
  )

  const selectedIncoming =
    (includeOverdueReceivables ? monthlyOutlook.overdueReceivablesAmount : 0) +
    (includeCurrentReceivables ? monthlyOutlook.currentReceivablesAmount : 0) +
    (includeUnissuedInvoices ? monthlyOutlook.unissuedInvoicesAmount : 0) +
    includedAccountsBalance

  const selectedObligations =
    (includePlannedExpenses ? monthlyOutlook.plannedExpenses : 0) +
    (includeOverdueDebt ? monthlyOutlook.overduePreviousPeriodDebt : 0) +
    (includePlannedRepayment
      ? monthlyOutlook.plannedPreviousPeriodRepayment
      : 0)

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
        <IncomingMetricCard
          total={selectedIncoming}
          overdueReceivablesAmount={monthlyOutlook.overdueReceivablesAmount}
          overdueReceivablesCount={monthlyOutlook.overdueReceivablesCount}
          includeOverdueReceivables={includeOverdueReceivables}
          onToggleOverdueReceivables={() =>
            setIncludeOverdueReceivables((current) => !current)
          }
          currentReceivablesAmount={monthlyOutlook.currentReceivablesAmount}
          currentReceivablesCount={monthlyOutlook.currentReceivablesCount}
          includeCurrentReceivables={includeCurrentReceivables}
          onToggleCurrentReceivables={() =>
            setIncludeCurrentReceivables((current) => !current)
          }
          unissuedInvoicesAmount={monthlyOutlook.unissuedInvoicesAmount}
          unissuedInvoicesCount={monthlyOutlook.unissuedInvoicesCount}
          includeUnissuedInvoices={includeUnissuedInvoices}
          onToggleUnissuedInvoices={() =>
            setIncludeUnissuedInvoices((current) => !current)
          }
          accounts={accounts}
          includedAccountIds={includedAccountIds}
          onToggleAccount={toggleAccount}
        />
        <ObligationsMetricCard
          total={selectedObligations}
          plannedExpenses={monthlyOutlook.plannedExpenses}
          plannedExpensesCount={monthlyOutlook.plannedExpensesCount}
          includePlannedExpenses={includePlannedExpenses}
          onTogglePlannedExpenses={() =>
            setIncludePlannedExpenses((current) => !current)
          }
          overdueDebt={monthlyOutlook.overduePreviousPeriodDebt}
          overdueDebtCount={monthlyOutlook.overduePreviousPeriodDebtCount}
          includeOverdueDebt={includeOverdueDebt}
          onToggleOverdueDebt={() =>
            setIncludeOverdueDebt((current) => !current)
          }
          plannedRepayment={monthlyOutlook.plannedPreviousPeriodRepayment}
          plannedRepaymentCount={
            monthlyOutlook.plannedPreviousPeriodRepaymentCount
          }
          includePlannedRepayment={includePlannedRepayment}
          onTogglePlannedRepayment={() =>
            setIncludePlannedRepayment((current) => !current)
          }
        />
        <SaldoMetricCard
          title="Сальдо"
          incomingValue={selectedIncoming}
          obligationsValue={selectedObligations}
        />
      </div>

      <TasksSection tasks={tasks} />
    </div>
  )
}

function IncomingMetricCard({
  total,
  overdueReceivablesAmount,
  overdueReceivablesCount,
  includeOverdueReceivables,
  onToggleOverdueReceivables,
  currentReceivablesAmount,
  currentReceivablesCount,
  includeCurrentReceivables,
  onToggleCurrentReceivables,
  unissuedInvoicesAmount,
  unissuedInvoicesCount,
  includeUnissuedInvoices,
  onToggleUnissuedInvoices,
  accounts,
  includedAccountIds,
  onToggleAccount,
}: {
  total: number
  overdueReceivablesAmount: number
  overdueReceivablesCount: number
  includeOverdueReceivables: boolean
  onToggleOverdueReceivables: () => void
  currentReceivablesAmount: number
  currentReceivablesCount: number
  includeCurrentReceivables: boolean
  onToggleCurrentReceivables: () => void
  unissuedInvoicesAmount: number
  unissuedInvoicesCount: number
  includeUnissuedInvoices: boolean
  onToggleUnissuedInvoices: () => void
  accounts: DashboardLoaderData['accounts']
  includedAccountIds: Set<string>
  onToggleAccount: (accountId: string) => void
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Ожидаемые поступления</CardTitle>
        <p className="text-sm text-muted-foreground">
          Открытая дебиторка, счета к выставлению и выбранные расчётные счета.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-success text-3xl font-semibold tabular-nums">
          {formatMoney(total)} ₽
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={includeOverdueReceivables ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleOverdueReceivables}
          >
            {includeOverdueReceivables ? '+' : ''} Просроченная дебиторка:{' '}
            {formatMoney(overdueReceivablesAmount)} ₽
          </Button>

          <Button
            variant={includeCurrentReceivables ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleCurrentReceivables}
          >
            {includeCurrentReceivables ? '+' : ''} Дебиторка в срок:{' '}
            {formatMoney(currentReceivablesAmount)} ₽
          </Button>

          <Button
            variant={includeUnissuedInvoices ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleUnissuedInvoices}
          >
            {includeUnissuedInvoices ? '+' : ''} Ещё не выставлено:{' '}
            {formatMoney(unissuedInvoicesAmount)} ₽
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => {
            const isIncluded = includedAccountIds.has(account.id)

            return (
              <Button
                key={account.id}
                variant={isIncluded ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleAccount(account.id)}
              >
                {isIncluded ? '+' : ''} {account.name}:{' '}
                {formatMoney(account.balance)} ₽
              </Button>
            )
          })}
        </div>

        <div className="mt-auto flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/receivables">Открыть</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ObligationsMetricCard({
  total,
  plannedExpenses,
  plannedExpensesCount,
  includePlannedExpenses,
  onTogglePlannedExpenses,
  overdueDebt,
  overdueDebtCount,
  includeOverdueDebt,
  onToggleOverdueDebt,
  plannedRepayment,
  plannedRepaymentCount,
  includePlannedRepayment,
  onTogglePlannedRepayment,
}: {
  total: number
  plannedExpenses: number
  plannedExpensesCount: number
  includePlannedExpenses: boolean
  onTogglePlannedExpenses: () => void
  overdueDebt: number
  overdueDebtCount: number
  includeOverdueDebt: boolean
  onToggleOverdueDebt: () => void
  plannedRepayment: number
  plannedRepaymentCount: number
  includePlannedRepayment: boolean
  onTogglePlannedRepayment: () => void
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Обязательства</CardTitle>
        <p className="text-sm text-muted-foreground">
          Плановые расходы плюс выбранные долги прошлых периодов.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-warning text-3xl font-semibold tabular-nums">
          {formatMoney(total)} ₽
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={includePlannedExpenses ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePlannedExpenses}
          >
            {includePlannedExpenses ? '+' : ''} Плановые расходы:{' '}
            {formatMoney(plannedExpenses)} ₽
          </Button>

          <Button
            variant={includeOverdueDebt ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleOverdueDebt}
          >
            {includeOverdueDebt ? '+' : ''} Просроченная задолженность:{' '}
            {formatMoney(overdueDebt)} ₽
          </Button>

          <Button
            variant={includePlannedRepayment ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePlannedRepayment}
          >
            {includePlannedRepayment ? '+' : ''} Задолженность с будущим сроком
            оплаты: {formatMoney(plannedRepayment)} ₽
          </Button>
        </div>

        <div className="mt-auto flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/payables">Открыть</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SaldoMetricCard({
  title,
  incomingValue,
  obligationsValue,
}: {
  title: string
  incomingValue: number
  obligationsValue: number
}) {
  const saldo = incomingValue - obligationsValue

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Выбранные поступления минус выбранные обязательства.
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

function TasksSection({ tasks }: { tasks: DashboardLoaderData['tasks'] }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Задачи</CardTitle>
        <p className="text-sm text-muted-foreground">
          Операции, которые требуют ручного действия.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
            Активных задач нет
          </div>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </CardContent>
    </Card>
  )
}

function TaskRow({ task }: { task: DashboardLoaderData['tasks'][number] }) {
  if (task.kind === 'bank-import') {
    return (
      <div className="flex flex-col gap-3 border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Banknote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{task.title}</p>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{task.count} строк</span>
              <span>{formatMoney(task.amount)} ₽</span>
              <span>Входящие: {formatMoney(task.incomingAmount)} ₽</span>
              <span>Исходящие: {formatMoney(task.outgoingAmount)} ₽</span>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="md:ml-auto">
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
    )
  }

  return (
    <div className="flex flex-col gap-3 border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <Badge variant="secondary">{task.businessLineName}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{task.description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{task.itemCount} договоров</span>
            <span>Создана: {formatShortDate(task.createdAt)}</span>
          </div>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="md:ml-auto">
        <Link to="/price-revisions/$id" params={{ id: task.revisionId }}>
          Открыть
        </Link>
      </Button>
    </div>
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

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU')
}
