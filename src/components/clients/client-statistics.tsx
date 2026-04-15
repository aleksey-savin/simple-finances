import type { ClientDetail } from '@/types'
import { Card } from '@/components/ui/card'

function formatAmount(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(
    value,
  )
}

export function ClientStatistics({
  contracts,
  pendingPayments,
}: {
  contracts: ClientDetail['contracts']
  pendingPayments: ClientDetail['pendingPayments']
}) {
  const totalContractValue = contracts.reduce(
    (sum, c) => sum + Number(c.amount[0] ?? '0'),
    0,
  )

  const customerContracts = contracts.filter(
    (c) => c.contractType === 'customer',
  ).length
  const supplierContracts = contracts.filter(
    (c) => c.contractType === 'supplier',
  ).length

  const pendingTotal = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  )

  const overdueCount = pendingPayments.filter(
    (p) => p.dueDate && new Date(p.dueDate) < new Date(),
  ).length

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Сумма договоров</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {formatAmount(totalContractValue)} ₽
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {contracts.length} договор
          {contracts.length === 1 ? '' : contracts.length < 5 ? 'а' : 'ов'}
        </p>
      </Card>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground">С покупателями</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {customerContracts}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">договоров</p>
      </Card>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground">С поставщиками</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {supplierContracts}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">договоров</p>
      </Card>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Ожидаемые платежи</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {formatAmount(pendingTotal)} ₽
        </p>
        {overdueCount > 0 && (
          <p className="mt-0.5 text-xs font-medium text-destructive">
            {overdueCount} просроч.
          </p>
        )}
      </Card>
    </div>
  )
}
