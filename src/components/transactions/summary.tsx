import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useMemo } from 'react'

interface FeedItem {
  type: 'expense' | 'income'
  amount: string | number
  paidAt: string | Date | null
}

interface Props {
  feed: FeedItem[]
}

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  })

export function TransactionSummary({ feed }: Props) {
  const stats = useMemo(() => {
    let unpaidExpenses = 0
    let paidExpenses = 0
    let unpaidIncomes = 0
    let paidIncomes = 0

    for (const item of feed) {
      const amount = Number(item.amount)
      const isPaid = item.paidAt !== null
      if (item.type === 'expense') {
        if (isPaid) paidExpenses += amount
        else unpaidExpenses += amount
      } else {
        if (isPaid) paidIncomes += amount
        else unpaidIncomes += amount
      }
    }

    return { unpaidExpenses, paidExpenses, unpaidIncomes, paidIncomes }
  }, [feed])

  return (
    <div className="flex gap-2 mb-4">
      <Card className="w-full sm:width-fit py-4 px-4 gap-2">
        <CardHeader className="p-0">
          <CardTitle className="font-medium">Расходы</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 sm:gap-12 p-0">
          <div>
            <p className="text-[10px] text-muted-foreground leading-none mb-1">
              Не оплачено
            </p>
            <p className="text-sm font-semibold ">
              {fmt(stats.unpaidExpenses)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground  leading-none mb-1">
              Оплачено
            </p>
            <p className="text-sm font-semibold text-destructive">
              {fmt(stats.paidExpenses)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full sm:width-fit py-4 px-4  gap-2">
        <CardHeader className="p-0">
          <CardTitle className="font-medium">Доходы</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 sm:gap-12 p-0">
          <div>
            <p className="text-[10px] text-muted-foreground leading-none mb-1">
              Не оплачено
            </p>
            <p className="text-sm font-semibold">{fmt(stats.unpaidIncomes)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground leading-none mb-1">
              Оплачено
            </p>
            <p className="text-sm font-semibold text-green-600">
              {fmt(stats.paidIncomes)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
