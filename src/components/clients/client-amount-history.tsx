import { ArrowRight } from 'lucide-react'

import type { ClientDetail } from '@/types'
import { Card } from '@/components/ui/card'

function formatAmount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(parsed)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function ClientAmountHistory({
  amountHistory,
}: {
  amountHistory: ClientDetail['amountHistory']
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">История изменений сумм</h3>
      {amountHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">История пуста</p>
      ) : (
        <div className="flex flex-col divide-y">
          {amountHistory.map((h) => (
            <div key={h.id} className="py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{h.contractName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {h.changedByName} · {formatDate(h.changedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs tabular-nums">
                <div className="flex flex-col gap-0.5">
                  {h.previousAmounts.map((amt, i) => (
                    <span key={i} className="font-mono text-muted-foreground line-through">
                      {formatAmount(amt)} ₽
                    </span>
                  ))}
                </div>
                <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  {h.newAmounts.map((amt, i) => {
                    const diff = Number(amt) - Number(h.previousAmounts[i] ?? '0')
                    const colorClass =
                      diff > 0
                        ? 'text-success'
                        : diff < 0
                          ? 'text-destructive'
                          : ''
                    return (
                      <span key={i} className={`font-mono font-medium ${colorClass}`}>
                        {formatAmount(amt)} ₽
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
