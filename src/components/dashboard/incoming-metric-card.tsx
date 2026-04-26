import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { DashboardLoaderData } from '#/types'
import { formatMoney } from '@/lib/format'

export function IncomingMetricCard({
  total,
  overdueReceivablesAmount,
  includeOverdueReceivables,
  onToggleOverdueReceivables,
  currentReceivablesAmount,
  includeCurrentReceivables,
  onToggleCurrentReceivables,
  unissuedInvoicesAmount,
  includeUnissuedInvoices,
  onToggleUnissuedInvoices,
  accounts,
  includedAccountIds,
  onToggleAccount,
}: {
  total: number
  overdueReceivablesAmount: number
  includeOverdueReceivables: boolean
  onToggleOverdueReceivables: () => void
  currentReceivablesAmount: number
  includeCurrentReceivables: boolean
  onToggleCurrentReceivables: () => void
  unissuedInvoicesAmount: number
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
