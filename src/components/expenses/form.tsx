import z from 'zod'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'

import type { Expense } from '@/db/types'

import { addExpense, updateExpense, fetchPaymentAccounts } from './actions'

import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Item, ItemContent, ItemHeader } from '@/components/ui/item'

// ─── Schema ───────────────────────────────────────────────────────────────────

const uiFormSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string(),
  dueDate: z.string(),
  createdAt: z.string(),
  paymentAccountId: z.string(),
  paymentCategoryId: z.string(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

type CounterpartyOption = {
  id: string
  name: string
  linkedUserId?: string | null
}

type PaymentAccount = { id: string; name: string }

// ─── Props ────────────────────────────────────────────────────────────────────

type ExpenseFormProps = {
  expense?: Expense
  onDone: () => void
  categories: {
    id: string
    name: string
    useForExpenses: boolean
    useForIncome: boolean
    isShared: boolean
  }[]
  accounts: { id: string; name: string }[]
  counterparties?: CounterpartyOption[]
  asDialog?: boolean
}

// ─── Unified form component ───────────────────────────────────────────────────

export const ExpenseForm = ({
  expense: exp,
  onDone,
  categories,
  accounts,
  counterparties = [],
  asDialog = false,
}: ExpenseFormProps) => {
  const router = useRouter()
  const isEdit = exp !== undefined

  // ── Payment state (add mode only) ─────────────────────────────────────────
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [isFetchingPayments, setIsFetchingPayments] = useState(false)

  const sharedIncomeCategories = categories.filter(
    (c) => c.useForIncome && c.isShared,
  )

  const toLocalDatetimeString = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleCounterpartyChange = async (
    val: string,
    fieldChange: (v: string) => void,
    resetPaymentAccount: () => void,
    resetPaymentCategory: () => void,
  ) => {
    fieldChange(val)
    resetPaymentAccount()
    resetPaymentCategory()
    setPaymentAccounts([])

    if (!val) return

    const cp = counterparties.find((c) => c.id === val)
    if (!cp?.linkedUserId) return

    setIsFetchingPayments(true)
    try {
      const accounts = await fetchPaymentAccounts({
        data: { linkedUserId: cp.linkedUserId },
      })
      setPaymentAccounts(accounts)
    } catch {
      // silently ignore — no payment section shown
    } finally {
      setIsFetchingPayments(false)
    }
  }

  const form = useForm({
    defaultValues: {
      amount: exp ? String(exp.amount) : '',
      description: exp?.description ?? '',
      categoryId: exp?.categoryId ?? '',
      currentAccountId: exp?.currentAccountId ?? '',
      counterpartyId: exp?.counterpartyId ?? '',
      dueDate: exp?.dueDate
        ? new Date(exp.dueDate).toISOString().split('T')[0]
        : '',
      createdAt: toLocalDatetimeString(
        exp ? new Date(exp.createdAt) : new Date(),
      ),
      paymentAccountId: '',
      paymentCategoryId: '',
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const serverData = {
          amount: +value.amount,
          description: value.description,
          categoryId: value.categoryId,
          currentAccountId: value.currentAccountId,
          counterpartyId: value.counterpartyId || undefined,
          dueDate: value.dueDate || undefined,
          createdAt: value.createdAt
            ? new Date(value.createdAt).toISOString()
            : undefined,
          paymentAccountId: value.paymentAccountId || undefined,
          paymentCategoryId: value.paymentCategoryId || undefined,
        }

        if (isEdit) {
          await updateExpense({ data: { id: exp.id, ...serverData } })
          await router.invalidate()
          toast.success('Расход обновлён')
          onDone()
        } else {
          await addExpense({ data: serverData })
          await router.invalidate()
          toast.success('Расход успешно добавлен')
          form.reset()
          setPaymentAccounts([])
          onDone()
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  const fields = (
    <form
      id={isEdit ? 'edit-expense-form' : 'add-expense-form'}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Amount */}
      <form.Field name="amount">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid} className="w-1/2 sm:pe-2">
              <FieldLabel htmlFor={field.name}>Сумма</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                placeholder="Введите сумму"
                autoComplete="off"
                type="number"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      {/* Description */}
      <form.Field name="description">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Описание</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                placeholder="Описание расхода"
                autoComplete="off"
                type="text"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <div className="flex gap-2">
        {/* Category */}
        <form.Field name="categoryId">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Категория</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={isInvalid}
                    className="w-full"
                    onBlur={field.handleBlur}
                  >
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.useForExpenses)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
        {/* Account */}
        <form.Field name="currentAccountId">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Счёт</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={isInvalid}
                    className="w-full"
                    onBlur={field.handleBlur}
                  >
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
      </div>

      {/* Counterparty (optional) */}
      {counterparties.length > 0 && (
        <form.Field name="counterpartyId">
          {(field) => (
            <form.Field name="paymentAccountId">
              {(paymentAccountField) => (
                <form.Field name="paymentAccountId">
                  {(paymentCategoryField) => (
                    <Field className="sm:w-1/2 sm:pe-2">
                      <FieldLabel htmlFor={field.name}>Контрагент</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) =>
                          handleCounterpartyChange(
                            val,
                            field.handleChange,
                            () => paymentAccountField.handleChange(''),
                            () => paymentCategoryField.handleChange(''),
                          )
                        }
                      >
                        <SelectTrigger
                          id={field.name}
                          className="w-full"
                          onBlur={field.handleBlur}
                        >
                          <SelectValue placeholder="Выберите контрагента" />
                        </SelectTrigger>
                        <SelectContent>
                          {counterparties.map((cp) => (
                            <SelectItem key={cp.id} value={cp.id}>
                              {cp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>
              )}
            </form.Field>
          )}
        </form.Field>
      )}

      {/* Payment section — add mode only, shown when counterparty has linked user */}
      {!isEdit && (
        <>
          {isFetchingPayments && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Loader2 className="size-3 animate-spin" />
              Загрузка счетов для оплаты…
            </div>
          )}

          {!isFetchingPayments && paymentAccounts.length > 0 && (
            <div className="flex flex-col gap-3 rounded-md border border-dashed p-3 sm:w-1/2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ArrowRight className="size-3.5" />
                Зачислить доход контрагенту
              </p>

              {/* Payment account */}
              <form.Field name="paymentAccountId">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Счёт получателя
                    </FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                    >
                      <SelectTrigger
                        id={field.name}
                        className="w-full"
                        onBlur={field.handleBlur}
                      >
                        <SelectValue placeholder="Выберите счёт" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>

              {/* Income category — shown once a payment account is picked */}
              <form.Subscribe selector={(s) => s.values.paymentAccountId}>
                {(paymentAccountId) =>
                  paymentAccountId ? (
                    <form.Field name="paymentCategoryId">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Категория дохода
                          </FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(val) => field.handleChange(val)}
                          >
                            <SelectTrigger
                              id={field.name}
                              className="w-full"
                              onBlur={field.handleBlur}
                            >
                              <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                            <SelectContent>
                              {sharedIncomeCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </form.Field>
                  ) : null
                }
              </form.Subscribe>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        {/* Created at */}
        <form.Field name="createdAt">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Дата создания</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
        {/* Due date */}
        <form.Field name="dueDate">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Оплатить до</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
      </div>

      {/* Actions */}
      {isEdit ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Сохранить
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Отмена
          </Button>
        </div>
      ) : asDialog ? (
        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Отмена
          </Button>
          <Button type="submit">Добавить</Button>
        </DialogFooter>
      ) : (
        <div className="flex gap-2 justify-end items-center">
          <Button type="submit">Добавить</Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Закрыть
          </Button>
        </div>
      )}
    </form>
  )

  if (isEdit) {
    return <div className="flex flex-col gap-3 pt-2">{fields}</div>
  }

  if (asDialog) {
    return (
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        {fields}
      </div>
    )
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemHeader className="mb-4 text-xl font-semibold">
          Новый расход
        </ItemHeader>
        {fields}
      </ItemContent>
    </Item>
  )
}

// ─── Convenience exports ──────────────────────────────────────────────────────

export const AddExpenseForm = (props: Omit<ExpenseFormProps, 'expense'>) => (
  <ExpenseForm {...props} />
)

export const EditExpenseForm = (
  props: ExpenseFormProps & { expense: Expense },
) => <ExpenseForm {...props} />
