import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { addAccountTransfer } from '#/components/transactions/actions'
import { Button } from '#/components/ui/button'
import { Combobox } from '#/components/ui/combobox'
import { DialogFooter } from '#/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'

type TransferFormProps = {
  accounts: { id: string; name: string }[]
  onDone: () => void
}

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function TransferForm({ accounts, onDone }: TransferFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [transferredAt, setTransferredAt] = useState(
    toDateInputValue(new Date()),
  )
  const [isPaid, setIsPaid] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMode, setSubmitMode] = useState<'close' | 'add-more'>('close')

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }))

  const canSubmit = accounts.length >= 2 && !isSubmitting

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)

        const numericAmount = Number(amount)
        if (!Number.isFinite(numericAmount) || numericAmount < 0.01) {
          setError('Введите сумму не меньше 0.01')
          return
        }
        if (description.trim().length < 2) {
          setError('Описание должно быть не короче 2 символов')
          return
        }
        if (!fromAccountId || !toAccountId) {
          setError('Выберите оба счёта')
          return
        }
        if (fromAccountId === toAccountId) {
          setError('Выберите разные счета')
          return
        }

        try {
          setIsSubmitting(true)
          await addAccountTransfer({
            data: {
              amount: numericAmount,
              description: description.trim(),
              fromAccountId,
              toAccountId,
              transferredAt: transferredAt
                ? new Date(`${transferredAt}T00:00:00.000Z`).toISOString()
                : undefined,
              paidAt: isPaid ? new Date().toISOString() : null,
            },
          })
          await router.invalidate()
          toast.success('Перевод добавлен')
          if (submitMode === 'add-more') {
            setAmount('')
            setDescription('')
            return
          }
          onDone()
        } catch (submitError) {
          toast.error(
            submitError instanceof Error
              ? submitError.message
              : 'Произошла ошибка',
          )
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      {accounts.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Для перевода нужно минимум два счёта.
        </p>
      ) : null}

      <Field className="sm:w-1/2">
        <FieldLabel htmlFor="transfer-amount">Сумма</FieldLabel>
        <Input
          id="transfer-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Введите сумму"
          autoComplete="off"
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="transfer-description">Описание</FieldLabel>
        <Input
          id="transfer-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Например: перевод на резервный счёт"
          autoComplete="off"
          required
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <Field>
          <FieldLabel>Счёт списания</FieldLabel>
          <Combobox
            options={accountOptions}
            value={fromAccountId}
            onValueChange={setFromAccountId}
            placeholder="Выберите счёт"
            disabled={accounts.length < 2}
          />
        </Field>

        <ArrowRight className="hidden size-4 text-muted-foreground sm:mb-2 sm:block" />

        <Field>
          <FieldLabel>Счёт зачисления</FieldLabel>
          <Combobox
            options={accountOptions}
            value={toAccountId}
            onValueChange={setToAccountId}
            placeholder="Выберите счёт"
            disabled={accounts.length < 2}
          />
        </Field>
      </div>

      <Field className="sm:w-1/2">
        <FieldLabel htmlFor="transfer-date">Дата создания</FieldLabel>
        <Input
          id="transfer-date"
          type="date"
          value={transferredAt}
          onChange={(event) => setTransferredAt(event.target.value)}
        />
      </Field>

      <Field orientation="horizontal" className="justify-between">
        <FieldLabel htmlFor="transfer-paid">Оплачено</FieldLabel>
        <Switch
          id="transfer-paid"
          checked={isPaid}
          onCheckedChange={setIsPaid}
        />
      </Field>

      {error ? <FieldError>{error}</FieldError> : null}

      <DialogFooter className="mt-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Отмена
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={!canSubmit}
          onClick={() => setSubmitMode('add-more')}
        >
          Сохранить и добавить ещё
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          onClick={() => setSubmitMode('close')}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Добавление
            </>
          ) : (
            'Добавить'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
