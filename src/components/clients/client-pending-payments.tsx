import type { ClientDetail } from '@/types'
import { Card } from '@/components/ui/card'

function formatAmount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(
    parsed,
  )
}

function formatDate(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat('ru-RU').format(new Date(date))
}

function isOverdue(dueDate: Date | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function formatTotal(total: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(
    total,
  )
}

export function ClientPendingPayments({
  payments,
}: {
  payments: ClientDetail['pendingPayments']
}) {
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Ожидаемые платежи</h3>
        {payments.length > 0 && (
          <span className="font-mono text-sm font-bold tabular-nums">
            {formatTotal(total)} ₽
          </span>
        )}
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет ожидаемых платежей</p>
      ) : (
        <div className="flex flex-col divide-y">
          {payments.map((p) => {
            const overdue = isOverdue(p.dueDate)
            const formattedDate = formatDate(p.dueDate)

            return (
              <div
                key={p.id}
                className="flex items-start justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.description}</p>
                  {p.counterpartyName && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.counterpartyName}
                    </p>
                  )}
                  {formattedDate && (
                    <p
                      className={`mt-0.5 text-xs ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                    >
                      {overdue ? 'Просрочен: ' : 'До: '}
                      {formattedDate}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums">
                  {formatAmount(p.amount)} ₽
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
