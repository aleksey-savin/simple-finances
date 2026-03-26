import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { CRON_PRESETS } from '@/components/reccuring/constants'
import { fetchPaymentAccounts } from '@/components/invoices'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category } from '@/types'
import type { CurrentAccount } from '#/db/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

export const ruleFormSchema = z.object({
  type: z.enum(['payable', 'receivable']),
  amount: z.string().refine((v) => !isNaN(+v) && +v >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  counterpartyId: z.string(),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronPreset: z.string(),
  cronCustom: z.string(),
  dueDaysFromCreation: z.string(),
  paymentAccountId: z.string(),
  paymentCategoryId: z.string(),
})

export type RuleFormValues = z.infer<typeof ruleFormSchema>

type PaymentAccount = { id: string; name: string }

// ─── Component ────────────────────────────────────────────────────────────────

export const RecurringForm = ({
  defaultValues,
  onSubmit,
  categories,
  accounts,
  counterparties,
  isEdit,
  onClose,
}: {
  defaultValues: RuleFormValues
  onSubmit: (value: RuleFormValues) => Promise<void>
  categories: Category[]
  accounts: CurrentAccount[]
  counterparties: { id: string; name: string; linkedUserId: string | null }[]
  isEdit: boolean
  onClose: () => void
}) => {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [isFetchingPayments, setIsFetchingPayments] = useState(false)

  const paymentIncomeCategories = categories.filter(
    (c) => c.useForIncome && c.isShared,
  )

  // In edit mode, auto-fetch payment accounts if a counterparty with linkedUserId is pre-selected
  useEffect(() => {
    if (!defaultValues.counterpartyId) return
    const cp = counterparties.find((c) => c.id === defaultValues.counterpartyId)
    if (!cp?.linkedUserId) return

    setIsFetchingPayments(true)
    fetchPaymentAccounts({ data: { linkedUserId: cp.linkedUserId } })
      .then(setPaymentAccounts)
      .catch(() => {})
      .finally(() => setIsFetchingPayments(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    defaultValues,
    validators: { onSubmit: ruleFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-4 mt-2 flex-1 min-h-0 overflow-y-auto"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Type */}
      <form.Field name="type">
        {(field) => (
          <Field>
            <FieldLabel>Тип</FieldLabel>
            <div className="flex rounded-md border overflow-hidden divide-x text-sm">
              {(['payable', 'receivable'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    field.handleChange(t)
                    form.setFieldValue('categoryId', '')
                    form.setFieldValue('paymentAccountId', '')
                    form.setFieldValue('paymentCategoryId', '')
                    setPaymentAccounts([])
                  }}
                  className={`flex-1 px-4 py-2 transition-colors ${
                    field.state.value === t
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {t === 'payable' ? 'Расход' : 'Доход'}
                </button>
              ))}
            </div>
          </Field>
        )}
      </form.Field>

      {/* Amount */}
      <form.Field name="amount">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Сумма</FieldLabel>
              <Input
                id={field.name}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                autoComplete="off"
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
                type="text"
                placeholder="Например: Аренда офиса"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                autoComplete="off"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      {/* Category — filtered by selected type */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(type) => (
          <form.Field name="categoryId">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              const filtered = categories.filter((c) =>
                type === 'payable' ? c.useForExpenses : c.useForIncome,
              )
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel>Категория</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger
                      className="w-full"
                      onBlur={field.handleBlur}
                      aria-invalid={isInvalid}
                    >
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {filtered.map((c) => (
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
        )}
      </form.Subscribe>

      {/* Counterparty */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(type) => (
          <form.Field name="counterpartyId">
            {(field) => (
              <form.Field name="paymentAccountId">
                {(paymentAccountField) => (
                  <form.Field name="paymentCategoryId">
                    {(paymentCategoryField) => (
                      <Field>
                        <FieldLabel>Контрагент</FieldLabel>
                        <Select
                          value={field.state.value || '__none__'}
                          onValueChange={(v) => {
                            const val = v === '__none__' ? '' : v
                            if (type === 'payable') {
                              handleCounterpartyChange(
                                val,
                                field.handleChange,
                                () => paymentAccountField.handleChange(''),
                                () => paymentCategoryField.handleChange(''),
                              )
                            } else {
                              field.handleChange(val)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Выберите контрагента (необязательно)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Не указан</SelectItem>
                            {counterparties.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
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
      </form.Subscribe>

      {/* Payment section — payable rules only, shown when counterparty has linked accounts */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(type) =>
          type === 'payable' ? (
            <>
              {isFetchingPayments && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <Loader2 className="size-3 animate-spin" />
                  Загрузка счетов для оплаты…
                </div>
              )}

              {!isFetchingPayments && paymentAccounts.length > 0 && (
                <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
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
                                  {paymentIncomeCategories.map((c) => (
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
          ) : null
        }
      </form.Subscribe>

      {/* Account */}
      <form.Field name="currentAccountId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Счёт</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={field.handleChange}
              >
                <SelectTrigger
                  className="w-full"
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
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

      {/* Cron preset */}
      <form.Field name="cronPreset">
        {(field) => (
          <Field>
            <FieldLabel>Расписание</FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите расписание" />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      {/* Custom cron expression — shown only when preset = 'custom' */}
      <form.Subscribe selector={(s) => s.values.cronPreset}>
        {(preset) =>
          preset === 'custom' ? (
            <form.Field name="cronCustom">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Cron-выражение{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        (мин час день мес день_недели)
                      </span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="text"
                      placeholder="0 9 1 * *"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Шаг: <code className="font-mono">*/3</code> или диапазон{' '}
                      <code className="font-mono">6-12/3</code>; список:{' '}
                      <code className="font-mono">6,9,12</code>. Синтаксис{' '}
                      <code className="font-mono">6/3</code> не поддерживается.
                    </p>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          ) : null
        }
      </form.Subscribe>

      {/* Due days from creation */}
      <form.Field name="dueDaysFromCreation">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              Срок оплаты (дней от создания)
              <span className="text-xs text-muted-foreground font-normal ml-1">
                — необязательно
              </span>
            </FieldLabel>
            <Input
              id={field.name}
              type="number"
              min="1"
              step="1"
              placeholder="Например: 5 (срок — через 5 дней после создания)"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Оставьте пустым, если срок оплаты не нужен.
            </p>
          </Field>
        )}
      </form.Field>

      <DialogFooter className="mt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
