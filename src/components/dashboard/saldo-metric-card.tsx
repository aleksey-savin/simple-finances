import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { formatMoney } from '@/lib/format'

export function SaldoMetricCard({
  incomingValue,
  obligationsValue,
}: {
  incomingValue: number
  obligationsValue: number
}) {
  const saldo = incomingValue - obligationsValue

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Сальдо</CardTitle>
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
