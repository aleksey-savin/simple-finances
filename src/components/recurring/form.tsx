import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { CRON_PRESETS } from '@/components/recurring/constants'
import { fetchPaymentAccounts } from '@/components/invoices'
import {
  contractsQueryKey,
  fetchContracts,
} from '@/components/contracts/actions'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { decodeHtmlEntities } from '@/lib/html-entities'
import type { CurrentAccount } from '#/db/types'

type FormCategory = {
  id: string
  name: string
  useForExpenses: boolean
  useForIncome: boolean
  isShared: boolean
}

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
  contractId: z.string(),
  selectedAmountIndex: z.string(),
})

export type RuleFormValues = z.infer<typeof ruleFormSchema>

export function parseDueDays(raw: string): number | null {
  const n = +raw
  return raw.trim() !== '' && !isNaN(n) && n > 0 ? n : null
}

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
  categories: FormCategory[]
  accounts: CurrentAccount[]
  counterparties: { id: string; name: string; linkedUserId: string | null }[]
  isEdit: boolean
  onClose: () => void
}) => {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [isFetchingPayments, setIsFetchingPayments] = useState(false)
  // Custom (free-typed) amount instead of picking one of the contract's amounts.
  const [customSum, setCustomSum] = useState(
    () =>
      defaultValues.contractId !== '' &&
      defaultValues.selectedAmountIndex === '',
  )

  const { data: contracts = [] } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => fetchContracts(),
    select: (data) =>
      data.map((c) => ({
        id: c.id,
        name: c.name,
        counterpartyId: c.counterpartyId,
        amount: c.amount,
      })),
  })

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
  }, [])

  const handleCounterpartyChange = async (
    val: string,
    fieldChange: (v: string) => void,
    resetPaymentAccount: () => void,
    resetPaymentCategory: () => void,
    resetContract: () => void,
  ) => {
    fieldChange(val)
    resetPaymentAccount()
    resetPaymentCategory()
    resetContract()
    setPaymentAccounts([])

    if (!val) return

    const cp = counterparties.find((c) => c.id === val)
    if (!cp?.linkedUserId) return

    setIsFetchingPayments(true)
    try {
      const fetched = await fetchPaymentAccounts({
        data: { linkedUserId: cp.linkedUserId },
      })
      setPaymentAccounts(fetched)
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
      <form.Field name="type">
        {(field) => (
          <Field>
            <FieldLabel>Тип</FieldLabel>
            <div className="flex border overflow-hidden divide-x text-sm">
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

      {/* Counterparty */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(type) => (
          <form.Field name="counterpartyId">
            {(field) => (
              <Field>
                <FieldLabel>Контрагент</FieldLabel>
                <Combobox
                  options={[
                    { value: '__none__', label: 'Не указан' },
                    ...counterparties.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                  value={field.state.value || '__none__'}
                  onValueChange={(v) => {
                    const val = v === '__none__' ? '' : v
                    form.setFieldValue('selectedAmountIndex', '')
                    setCustomSum(false)
                    if (type === 'payable') {
                      handleCounterpartyChange(
                        val,
                        field.handleChange,
                        () => form.setFieldValue('paymentAccountId', ''),
                        () => form.setFieldValue('paymentCategoryId', ''),
                        () => form.setFieldValue('contractId', ''),
                      )
                    } else {
                      field.handleChange(val)
                      form.setFieldValue('contractId', '')
                    }
                  }}
                  placeholder="Выберите контрагента (необязательно)"
                />
              </Field>
            )}
          </form.Field>
        )}
      </form.Subscribe>

      {/* Contract — shown when the selected counterparty has contracts */}
      <form.Subscribe selector={(s) => s.values.counterpartyId}>
        {(counterpartyId) => {
          const filtered = contracts.filter(
            (c) => counterpartyId && c.counterpartyId === counterpartyId,
          )
          if (!counterpartyId || filtered.length === 0) return null
          return (
            <form.Field name="contractId">
              {(field) => (
                <Field>
                  <FieldLabel>Договор</FieldLabel>
                  <Combobox
                    options={[
                      { value: '__none__', label: 'Не указан' },
                      ...filtered.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={field.state.value || '__none__'}
                    onValueChange={(v) => {
                      field.handleChange(v === '__none__' ? '' : v)
                      form.setFieldValue('amount', '')
                      form.setFieldValue('selectedAmountIndex', '')
                      setCustomSum(false)
                    }}
                    placeholder="Выберите договор (необязательно)"
                    onBlur={field.handleBlur}
                  />
                </Field>
              )}
            </form.Field>
          )
        }}
      </form.Subscribe>

      {/* Amount — pick one of the contract's amounts, or a custom value */}
      <form.Subscribe
        selector={(s) => ({
          contractId: s.values.contractId,
          selectedAmountIndex: s.values.selectedAmountIndex,
        })}
      >
        {({ contractId, selectedAmountIndex }) => {
          const selectedContract = contracts.find((c) => c.id === contractId)
          const contractAmounts = selectedContract?.amount ?? []
          const hasContractAmounts = !!contractId && contractAmounts.length > 0
          const showChooser = hasContractAmounts && !customSum
          return (
            <form.Field name="amount">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Сумма</FieldLabel>
                    {showChooser ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {contractAmounts.map((a, i) => {
                            const active = selectedAmountIndex === String(i)
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  form.setFieldValue(
                                    'selectedAmountIndex',
                                    String(i),
                                  )
                                  field.handleChange(a)
                                }}
                                className={`border px-4 py-2 text-sm transition-colors ${
                                  active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                {Number(a).toLocaleString('ru-RU')}
                              </button>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSum(true)
                            form.setFieldValue('selectedAmountIndex', '')
                          }}
                          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                          Указать свою сумму
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
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
                        {hasContractAmounts && (
                          <button
                            type="button"
                            onClick={() => setCustomSum(false)}
                            className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                          >
                            Выбрать сумму из договора
                          </button>
                        )}
                      </div>
                    )}
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          )
        }}
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
                <div className="flex flex-col gap-3 border border-dashed p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ArrowRight className="size-3.5" />
                    Зачислить доход контрагенту
                  </p>

                  <form.Field name="paymentAccountId">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Счёт получателя
                        </FieldLabel>
                        <Combobox
                          options={paymentAccounts.map((a) => ({
                            value: a.id,
                            label: a.name,
                          }))}
                          value={field.state.value}
                          onValueChange={(val) => field.handleChange(val)}
                          placeholder="Выберите счёт"
                          onBlur={field.handleBlur}
                        />
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
                              <Combobox
                                options={paymentIncomeCategories.map((c) => ({
                                  value: c.id,
                                  label: c.name,
                                }))}
                                value={field.state.value}
                                onValueChange={(val) => field.handleChange(val)}
                                placeholder="Выберите категорию"
                                onBlur={field.handleBlur}
                              />
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
                  <Combobox
                    options={filtered.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    placeholder="Выберите категорию"
                    onBlur={field.handleBlur}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="currentAccountId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Счёт</FieldLabel>
              <Combobox
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  badge:
                    decodeHtmlEntities(a.bankNameInitials ?? a.bankName) ??
                    undefined,
                }))}
                value={field.state.value}
                onValueChange={field.handleChange}
                placeholder="Выберите счёт"
                onBlur={field.handleBlur}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="cronPreset">
        {(field) => (
          <Field>
            <FieldLabel>Расписание</FieldLabel>
            <Combobox
              options={CRON_PRESETS.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
              value={field.state.value}
              onValueChange={field.handleChange}
              placeholder="Выберите расписание"
            />
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
