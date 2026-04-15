import { useState } from 'react'
import { Scale } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { correctAccountBalance, accountsQueryKey } from './actions'

import type { Account } from '#/types'

export function BalanceCorrection({
  account,
}: {
  account: Pick<Account, 'id' | 'name' | 'balance'>
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [balance, setBalance] = useState(account.balance ?? '0')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentBalance = Number(account.balance ?? 0)
  const normalizedBalance = balance.trim().replace(',', '.')
  const nextBalance =
    normalizedBalance === '' ? Number.NaN : Number(normalizedBalance)
  const isValidBalance = Number.isFinite(nextBalance)
  const difference = isValidBalance ? nextBalance - currentBalance : null

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setBalance(account.balance ?? '0')
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      if (!isValidBalance) {
        throw new Error('Введите корректный баланс')
      }

      await correctAccountBalance({
        data: {
          accountId: account.id,
          balance: nextBalance,
        },
      })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      toast.success('Баланс счёта скорректирован')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Корректировка баланса"
        >
          <Scale className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Корректировка баланса</DialogTitle>
          <DialogDescription>{account.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Текущий баланс</span>
              <span className="font-medium tabular-nums">
                {formatMoney(currentBalance)} ₽
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Изменение</span>
              <span className="font-medium tabular-nums">
                {difference === null
                  ? '—'
                  : `${difference > 0 ? '+' : ''}${formatMoney(difference)} ₽`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`balance-correction-${account.id}`}
              className="text-sm font-medium"
            >
              Новый баланс
            </label>
            <Input
              id={`balance-correction-${account.id}`}
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValidBalance}
            className="w-full"
          >
            Сохранить баланс
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
