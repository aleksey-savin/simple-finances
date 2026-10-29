import { useMemo } from 'react'

interface FeedItem {
  kind: 'payable' | 'receivable'
  amount: string | number
  paidAt: string | Date | null
  settledAmount?: number
  outstandingAmount?: number
  paymentStatus?: 'unpaid' | 'partial' | 'paid'
}

interface Props {
  feed: FeedItem[]
}

const fmt = (value: number) =>
  value.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  })

export function InvoiceSummary({ feed }: Props) {
  const stats = useMemo(() => {
    let unpaidPayables = 0
    let paidPayables = 0
    let unpaidReceivables = 0
    let paidReceivables = 0

    for (const item of feed) {
      const amount = Number(item.amount)
      const paymentStatus =
        item.paymentStatus ?? (item.paidAt !== null ? 'paid' : 'unpaid')
      const settledAmount =
        item.settledAmount ??
        (paymentStatus === 'paid'
          ? amount
          : item.outstandingAmount !== undefined
            ? Math.max(amount - item.outstandingAmount, 0)
            : 0)
      const outstandingAmount =
        item.outstandingAmount ??
        (paymentStatus === 'paid' ? 0 : Math.max(amount - settledAmount, 0))

      if (item.kind === 'payable') {
        if (paymentStatus === 'paid') {
          paidPayables += amount
        } else if (paymentStatus === 'partial') {
          paidPayables += settledAmount
          unpaidPayables += outstandingAmount
        } else {
          unpaidPayables += amount
        }
      } else {
        if (paymentStatus === 'paid') {
          paidReceivables += amount
        } else if (paymentStatus === 'partial') {
          paidReceivables += settledAmount
          unpaidReceivables += outstandingAmount
        } else {
          unpaidReceivables += amount
        }
      }
    }

    return {
      unpaidPayables,
      paidPayables,
      unpaidReceivables,
      paidReceivables,
    }
  }, [feed])

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex w-full flex-col gap-3 border bg-card px-5 py-4 sm:w-auto">
        <h2 className="text-sm font-medium text-muted-foreground">Расходы</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-12">
          <div>
            <p className="mb-1 text-xs leading-none text-muted-foreground">
              Не оплачено
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(stats.unpaidPayables)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs leading-none text-muted-foreground">
              Оплачено
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(stats.paidPayables)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3 border bg-card px-5 py-4 sm:w-auto">
        <h2 className="text-sm font-medium text-muted-foreground">Доходы</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-12">
          <div>
            <p className="mb-1 text-xs leading-none text-muted-foreground">
              Не оплачено
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(stats.unpaidReceivables)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs leading-none text-muted-foreground">
              Оплачено
            </p>
            <p className="text-3xl font-bold tabular-nums text-accent-text">
              {fmt(stats.paidReceivables)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
