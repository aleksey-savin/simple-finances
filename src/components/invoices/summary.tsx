import { useMemo } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

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
    <div className="flex gap-6">
      <Card className="gap-2 px-4 py-4 sm:width-fit">
        <CardHeader className="p-0">
          <CardTitle className="font-medium">Расходы</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-0 sm:flex-row sm:gap-12">
          <div>
            <p className="mb-1 text-[10px] leading-none text-muted-foreground">
              Не оплачено
            </p>
            <p className="text-sm font-semibold">{fmt(stats.unpaidPayables)}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] leading-none text-muted-foreground">
              Оплачено
            </p>
            <p className="text-sm font-semibold text-destructive">
              {fmt(stats.paidPayables)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="gap-2 px-4 py-4 sm:width-fit">
        <CardHeader className="p-0">
          <CardTitle className="font-medium">Доходы</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-0 sm:flex-row sm:gap-12">
          <div>
            <p className="mb-1 text-[10px] leading-none text-muted-foreground">
              Не оплачено
            </p>
            <p className="text-sm font-semibold">
              {fmt(stats.unpaidReceivables)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[10px] leading-none text-muted-foreground">
              Оплачено
            </p>
            <p className="text-sm font-semibold text-success">
              {fmt(stats.paidReceivables)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
