import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { fetchDashboardData } from '#/components/dashboard/actions'
import { Skeleton } from '#/components/ui/skeleton'
import { IncomingMetricCard } from '#/components/dashboard/incoming-metric-card'
import { ObligationsMetricCard } from '#/components/dashboard/obligations-metric-card'
import { DashboardSummary } from '#/components/dashboard/summary'
import { TasksSection } from '#/components/dashboard/tasks-section'
import { PendingBlocksCard } from '#/components/dashboard/pending-blocks-card'
import { BlockedServicesCard } from '#/components/contracts/blocked-services-card'

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="border bg-card">
        <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 short-landscape:grid-cols-3 short-landscape:divide-x short-landscape:divide-y-0">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="min-w-0 px-4 py-3 sm:py-4 flex flex-col gap-2"
            >
              <Skeleton className="h-5 w-32 max-w-full" />
              <Skeleton className="h-9 w-40 max-w-full" />
              <Skeleton className="h-5 w-44 max-w-full short-landscape:hidden" />
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-3">
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
      </div>
      <div className="border p-4 flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/dashboard')({
  loader: () => fetchDashboardData(),
  component: RouteComponent,
  pendingComponent: DashboardSkeleton,
  pendingMs: 0,
})

function RouteComponent() {
  const {
    accounts,
    tasks,
    monthlyOutlook,
    blockedServices,
    pendingBlockedServices,
  } = Route.useLoaderData()
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
  const [includeProjectedPayables, setIncludeProjectedPayables] = useState(true)
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

  const lastStatementDate = accounts.reduce<string | null>(
    (latest, account) => {
      const date = account.lastImportedAt
      return date && (!latest || new Date(date) > new Date(latest))
        ? date
        : latest
    },
    null,
  )

  const selectedIncoming =
    (includeOverdueReceivables ? monthlyOutlook.overdueReceivablesAmount : 0) +
    (includeCurrentReceivables ? monthlyOutlook.currentReceivablesAmount : 0) +
    (includeUnissuedInvoices ? monthlyOutlook.unissuedInvoicesAmount : 0) +
    includedAccountsBalance

  const selectedObligations =
    (includePlannedExpenses ? monthlyOutlook.plannedExpenses : 0) +
    (includeProjectedPayables ? monthlyOutlook.projectedPayablesAmount : 0) +
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
      <DashboardSummary
        incomingValue={selectedIncoming}
        obligationsValue={selectedObligations}
        expensesAmount={monthlyOutlook.expensesWithDebt}
        receivablesAmount={monthlyOutlook.receivablesAmount}
        overdueReceivablesAmount={monthlyOutlook.overdueReceivablesAmount}
        lastStatementDate={lastStatementDate}
      >
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
          projectedPayablesAmount={monthlyOutlook.projectedPayablesAmount}
          includeProjectedPayables={includeProjectedPayables}
          onToggleProjectedPayables={() =>
            setIncludeProjectedPayables((current) => !current)
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
      </DashboardSummary>

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

      <PendingBlocksCard services={pendingBlockedServices} />

      <TasksSection tasks={tasks} />
    </div>
  )
}
