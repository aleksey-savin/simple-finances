import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { fetchDashboardData } from '#/components/dashboard/actions'
import { IncomingMetricCard } from '#/components/dashboard/incoming-metric-card'
import { ObligationsMetricCard } from '#/components/dashboard/obligations-metric-card'
import { SaldoMetricCard } from '#/components/dashboard/saldo-metric-card'
import { TasksSection } from '#/components/dashboard/tasks-section'
import { BlockedServicesCard } from '#/components/contracts/blocked-services-card'

export const Route = createFileRoute('/dashboard')({
  loader: () => fetchDashboardData(),
  component: RouteComponent,
})

function RouteComponent() {
  const { accounts, tasks, monthlyOutlook, blockedServices } =
    Route.useLoaderData()
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
          includeOverdueReceivables={includeOverdueReceivables}
          onToggleOverdueReceivables={() =>
            setIncludeOverdueReceivables((current) => !current)
          }
          currentReceivablesAmount={monthlyOutlook.currentReceivablesAmount}
          includeCurrentReceivables={includeCurrentReceivables}
          onToggleCurrentReceivables={() =>
            setIncludeCurrentReceivables((current) => !current)
          }
          unissuedInvoicesAmount={monthlyOutlook.unissuedInvoicesAmount}
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
          includePlannedExpenses={includePlannedExpenses}
          onTogglePlannedExpenses={() =>
            setIncludePlannedExpenses((current) => !current)
          }
          overdueDebt={monthlyOutlook.overduePreviousPeriodDebt}
          includeOverdueDebt={includeOverdueDebt}
          onToggleOverdueDebt={() =>
            setIncludeOverdueDebt((current) => !current)
          }
          plannedRepayment={monthlyOutlook.plannedPreviousPeriodRepayment}
          includePlannedRepayment={includePlannedRepayment}
          onTogglePlannedRepayment={() =>
            setIncludePlannedRepayment((current) => !current)
          }
        />
        <SaldoMetricCard
          incomingValue={selectedIncoming}
          obligationsValue={selectedObligations}
        />
      </div>

      <TasksSection tasks={tasks} />
    </div>
  )
}
