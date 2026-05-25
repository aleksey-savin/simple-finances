import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import type { Invoice } from '@/db/types'

import { addInvoice, fetchPaymentAccounts, updateInvoice } from './actions'
import {
  contractsQueryKey,
  fetchContracts,
} from '@/components/contracts/actions'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemHeader } from '@/components/ui/item'
import { Switch } from '@/components/ui/switch'

const uiFormSchema = z.object({
  amount: z
    .string()
    .refine((value) => !isNaN(+value) && +value >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string(),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string(),
  dueDate: z.string(),
  createdAt: z.string(),
  isPaid: z.boolean(),
  paymentAccountId: z.string(),
  paymentCategoryId: z.string(),
  contractId: z.string(),
})

type CounterpartyOption = {
  id: string
  name: string
  linkedUserId?: string | null
}

type PaymentAccount = { id: string; name: string }

type InvoiceFormProps = {
  invoice?: Invoice
  defaultKind?: 'payable' | 'receivable'
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
  entryMode?: 'full' | 'quick'
}

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function InvoiceForm({
  invoice: currentInvoice,
  defaultKind = 'payable',
  onDone,
  categories,
  accounts,
  counterparties = [],
  asDialog = false,
  entryMode = 'full',
}: InvoiceFormProps) {
  const { data: contracts = [] } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => fetchContracts(),
    select: (data) =>
      data.map((c) => ({
        id: c.id,
        name: c.name,
        counterpartyId: c.counterpartyId,
      })),
  })
  const router = useRouter()
  const isEdit = currentInvoice !== undefined
  const kind = currentInvoice?.kind ?? defaultKind

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [isFetchingPayments, setIsFetchingPayments] = useState(false)
  const [submitMode, setSubmitMode] = useState<'close' | 'add-more'>('close')
  const isQuickCreate = !isEdit && entryMode === 'quick'

  const sharedReceivableCategories = categories.filter(
    (category) => category.useForIncome && category.isShared,
  )

  const handleCounterpartyChange = async (
    value: string,
    fieldChange: (nextValue: string) => void,
    resetPaymentAccount: () => void,
    resetPaymentCategory: () => void,
    resetContract: () => void,
  ) => {
    fieldChange(value)
    resetPaymentAccount()
    resetPaymentCategory()
    resetContract()
    setPaymentAccounts([])

    if (kind !== 'payable' || !value) return

    const counterparty = counterparties.find((item) => item.id === value)
    if (!counterparty?.linkedUserId) return

    setIsFetchingPayments(true)
    try {
      const nextAccounts = await fetchPaymentAccounts({
        data: { linkedUserId: counterparty.linkedUserId },
      })
      setPaymentAccounts(nextAccounts)
    } catch {
      setPaymentAccounts([])
    } finally {
      setIsFetchingPayments(false)
    }
  }

  const form = useForm({
    defaultValues: {
      amount: currentInvoice ? String(currentInvoice.amount) : '',
      description: currentInvoice?.description ?? '',
      categoryId: currentInvoice?.categoryId ?? '',
      currentAccountId: currentInvoice?.currentAccountId ?? '',
      counterpartyId: currentInvoice?.counterpartyId ?? '',
      dueDate: currentInvoice
        ? toDateInputValue(currentInvoice.dueDate)
        : toDateInputValue(addDays(new Date(), 10)),
      createdAt: toDateInputValue(currentInvoice?.createdAt ?? new Date()),
      isPaid:
        currentInvoice?.paidAt !== null && currentInvoice?.paidAt !== undefined,
      paymentAccountId: '',
      paymentCategoryId: '',
      contractId: currentInvoice?.contractId ?? '',
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const includeDetails = !isQuickCreate
        const serverData = {
          kind,
          amount: +value.amount,
          description: value.description,
          categoryId: includeDetails
            ? value.categoryId || undefined
            : undefined,
          currentAccountId: value.currentAccountId,
          counterpartyId: includeDetails
            ? value.counterpartyId || undefined
            : undefined,
          dueDate:
            includeDetails && value.dueDate
              ? new Date(`${value.dueDate}T00:00:00.000Z`).toISOString()
              : undefined,
          createdAt: value.createdAt
            ? new Date(`${value.createdAt}T00:00:00.000Z`).toISOString()
            : undefined,
          paidAt: value.isPaid ? new Date().toISOString() : null,
          paymentAccountId: includeDetails
            ? value.paymentAccountId || undefined
            : undefined,
          paymentCategoryId: includeDetails
            ? value.paymentCategoryId || undefined
            : undefined,
          contractId: includeDetails
            ? value.contractId || undefined
            : undefined,
        } as const

        if (isEdit) {
          await updateInvoice({
            data: { id: currentInvoice.id, ...serverData },
          })
          await router.invalidate()
          toast.success(
            kind === 'payable' ? 'Расход обновлён' : 'Доход обновлён',
          )
          onDone()
          return
        }

        await addInvoice({ data: serverData })
        await router.invalidate()
        toast.success(
          kind === 'payable'
            ? 'Расход успешно добавлен'
            : 'Доход успешно добавлен',
        )
        if (submitMode === 'add-more') {
          form.setFieldValue('amount', '')
          form.setFieldValue('description', '')
          return
        }

        form.reset()
        setPaymentAccounts([])
        onDone()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  const filteredCategories = categories.filter((category) =>
    kind === 'payable' ? category.useForExpenses : category.useForIncome,
  )

  const title =
    kind === 'payable'
      ? isEdit
        ? 'Редактировать расход'
        : 'Новый расход'
      : isEdit
        ? 'Редактировать доход'
        : 'Новый доход'

  const submitLabel = isEdit ? 'Сохранить' : 'Добавить'

  const fields = (
    <form
      id={isEdit ? 'edit-invoice-form' : 'add-invoice-form'}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="amount">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid} className="sm:w-1/2">
              <FieldLabel htmlFor={field.name}>Сумма</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={isInvalid}
                placeholder="Введите сумму"
                autoComplete="off"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

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
                type="text"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={isInvalid}
                placeholder={
                  kind === 'payable' ? 'Описание расхода' : 'Описание дохода'
                }
                autoComplete="off"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      {isQuickCreate && (
        <>
          <div className="flex gap-2">
            <form.Field name="currentAccountId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Расчётный счёт</FieldLabel>
                    <Combobox
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: account.name,
                      }))}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                      placeholder="Выберите счёт"
                      onBlur={field.handleBlur}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>

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
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="isPaid">
            {(field) => (
              <Field orientation="horizontal" className="w-fit">
                <FieldLabel htmlFor={field.name}>Оплачено</FieldLabel>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </Field>
            )}
          </form.Field>
        </>
      )}

      {!isQuickCreate && (
        <>
          <div className="flex gap-2">
            <form.Field name="categoryId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Категория</FieldLabel>
                    <Combobox
                      options={filteredCategories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                      placeholder="Выберите категорию"
                      onBlur={field.handleBlur}
                      allowClear
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="currentAccountId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Счёт</FieldLabel>
                    <Combobox
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: account.name,
                      }))}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                      placeholder="Выберите счёт"
                      onBlur={field.handleBlur}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          </div>

          <div className="flex gap-2">
            {counterparties.length > 0 && (
              <form.Field name="counterpartyId">
                {(field) => (
                  <form.Field name="paymentAccountId">
                    {(paymentAccountField) => (
                      <form.Field name="paymentCategoryId">
                        {(paymentCategoryField) => (
                          <form.Field name="contractId">
                            {(contractField) => (
                              <Field className="sm:w-1/2 sm:pe-2">
                                <FieldLabel htmlFor={field.name}>
                                  Контрагент
                                </FieldLabel>
                                <Combobox
                                  options={[
                                    { value: '__none__', label: 'Не указан' },
                                    ...counterparties.map((counterparty) => ({
                                      value: counterparty.id,
                                      label: counterparty.name,
                                    })),
                                  ]}
                                  value={field.state.value || '__none__'}
                                  onValueChange={(value) =>
                                    handleCounterpartyChange(
                                      value === '__none__' ? '' : value,
                                      field.handleChange,
                                      () =>
                                        paymentAccountField.handleChange(''),
                                      () =>
                                        paymentCategoryField.handleChange(''),
                                      () => contractField.handleChange(''),
                                    )
                                  }
                                  placeholder="Выберите контрагента"
                                  onBlur={field.handleBlur}
                                />
                              </Field>
                            )}
                          </form.Field>
                        )}
                      </form.Field>
                    )}
                  </form.Field>
                )}
              </form.Field>
            )}

            {!isEdit && kind === 'payable' && (
              <>
                {isFetchingPayments && (
                  <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
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

                    <form.Field name="paymentAccountId">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Счёт получателя
                          </FieldLabel>
                          <Combobox
                            options={paymentAccounts.map((account) => ({
                              value: account.id,
                              label: account.name,
                            }))}
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                            placeholder="Выберите счёт"
                            onBlur={field.handleBlur}
                          />
                        </Field>
                      )}
                    </form.Field>

                    <form.Subscribe
                      selector={(state) => state.values.paymentAccountId}
                    >
                      {(paymentAccountId) =>
                        paymentAccountId ? (
                          <form.Field name="paymentCategoryId">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor={field.name}>
                                  Категория дохода
                                </FieldLabel>
                                <Combobox
                                  options={sharedReceivableCategories.map(
                                    (category) => ({
                                      value: category.id,
                                      label: category.name,
                                    }),
                                  )}
                                  value={field.state.value}
                                  onValueChange={(value) =>
                                    field.handleChange(value)
                                  }
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
            )}

            <form.Subscribe selector={(s) => s.values.counterpartyId}>
              {(counterpartyId) => {
                const filtered = contracts.filter(
                  (c) => counterpartyId && c.counterpartyId === counterpartyId,
                )
                if (!counterpartyId || filtered.length === 0) return null
                return (
                  <form.Field name="contractId">
                    {(field) => (
                      <Field className="sm:w-1/2">
                        <FieldLabel htmlFor={field.name}>Договор</FieldLabel>
                        <Combobox
                          options={[
                            { value: '__none__', label: 'Не указан' },
                            ...filtered.map((c) => ({
                              value: c.id,
                              label: c.name,
                            })),
                          ]}
                          value={field.state.value || '__none__'}
                          onValueChange={(value) =>
                            field.handleChange(
                              value === '__none__' ? '' : value,
                            )
                          }
                          placeholder="Выберите договор"
                          onBlur={field.handleBlur}
                        />
                      </Field>
                    )}
                  </form.Field>
                )
              }}
            </form.Subscribe>
          </div>

          <div className="flex gap-2">
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
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="dueDate">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    {kind === 'payable' ? 'Оплатить до' : 'Получить до'}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="isPaid">
            {(field) => (
              <Field orientation="horizontal" className="w-fit">
                <FieldLabel htmlFor={field.name}>Оплачено</FieldLabel>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </Field>
            )}
          </form.Field>
        </>
      )}

      {isEdit ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            {submitLabel}
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
          <Button
            type="submit"
            variant="outline"
            onClick={() => setSubmitMode('add-more')}
          >
            Сохранить и добавить ещё
          </Button>
          <Button type="submit" onClick={() => setSubmitMode('close')}>
            {submitLabel}
          </Button>
        </DialogFooter>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            variant="outline"
            onClick={() => setSubmitMode('add-more')}
          >
            Сохранить и добавить ещё
          </Button>
          <Button type="submit" onClick={() => setSubmitMode('close')}>
            {submitLabel}
          </Button>
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
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {fields}
      </div>
    )
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemHeader className="mb-4 text-xl font-semibold">{title}</ItemHeader>
        {fields}
      </ItemContent>
    </Item>
  )
}

export const AddInvoiceForm = (
  props: Omit<InvoiceFormProps, 'invoice'> & {
    defaultKind: 'payable' | 'receivable'
  },
) => <InvoiceForm {...props} />

export const EditInvoiceForm = (
  props: InvoiceFormProps & { invoice: Invoice },
) => <InvoiceForm {...props} />
