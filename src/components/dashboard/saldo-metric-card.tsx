import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils'
import { formatMoney } from '@/lib/format'

export function SaldoMetricCard({
  incomingValue,
  obligationsValue,
  children,
}: {
  incomingValue: number
  obligationsValue: number
  children: ReactNode
}) {
  const saldo = incomingValue - obligationsValue

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 flex-col gap-1 border-l-2 border-l-primary bg-primary/5 px-4 py-3 sm:py-4 text-left outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex w-full items-center justify-between gap-2 text-sm font-medium">
            Сальдо
            <ChevronRight
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </span>
          <span
            className={cn(
              'text-3xl font-bold tabular-nums [overflow-wrap:anywhere] short-landscape:text-xl',
              saldo >= 0 && 'text-accent-text',
            )}
          >
            {formatMoney(saldo)} ₽
          </span>
          <span className="text-sm text-muted-foreground short-landscape:hidden">
            Расчёт на текущий месяц
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl motion-reduce:animate-none">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Расчёт сальдо</DialogTitle>
          <DialogDescription>
            Остатки на счетах и ожидаемые поступления минус обязательства.
            Выберите, что учитывать в расчёте.
          </DialogDescription>
        </DialogHeader>
        <div className="border bg-muted/30 p-4">
          <p
            className={cn(
              'text-3xl font-bold tabular-nums [overflow-wrap:anywhere]',
              saldo >= 0 && 'text-accent-text',
            )}
          >
            {formatMoney(saldo)} ₽
          </p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums [overflow-wrap:anywhere]">
            {formatMoney(incomingValue)} ₽ − {formatMoney(obligationsValue)} ₽
          </p>
        </div>
        <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
