import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import z from 'zod'

import type { Client } from '@/types'
import {
  fetchCounterparties,
  counterpartiesQueryKey,
} from '@/components/counterparties/actions'
import {
  fetchCompanies,
  companiesQueryKey,
} from '@/components/companies/actions'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from '@/components/ui/multi-select-combobox'
import { addClient, clientsQueryKey, updateClient } from './actions'

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  counterpartiesIds: z
    .array(z.string())
    .min(1, 'Выберите хотя бы одного контрагента'),
})

type ClientFormProps =
  | { client?: undefined; onDone?: undefined }
  | { client: Client; onDone: () => void }

export const ClientForm = ({ client: current, onDone }: ClientFormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = current !== undefined
  const { data: counterparties = [] } = useQuery({
    queryKey: counterpartiesQueryKey,
    queryFn: () => fetchCounterparties(),
  })
  const { data: companies = [] } = useQuery({
    queryKey: companiesQueryKey,
    queryFn: () => fetchCompanies(),
  })

  const counterpartyOptions: MultiSelectOption[] = counterparties.map(
    (counterparty) => ({
      value: counterparty.id,
      label: counterparty.name,
      keywords: counterparty.tin ? [counterparty.tin] : undefined,
    }),
  )

  const form = useForm({
    defaultValues: {
      name: current?.name ?? '',
      companyId: current?.companyId ?? '',
      counterpartiesIds: current?.counterparties.map((item) => item.id) ?? [],
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await updateClient({
            data: {
              id: current.id,
              name: value.name,
              companyId: value.companyId || undefined,
              counterpartiesIds: value.counterpartiesIds,
            },
          })
          await router.invalidate()
          await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
          toast.success('Клиент обновлён')
          onDone()
          return
        }

        await addClient({
          data: {
            name: value.name,
            companyId: value.companyId || undefined,
            counterpartiesIds: value.counterpartiesIds,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
        form.reset()
        toast.success('Клиент успешно добавлен')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id={isEdit ? 'edit-client-form' : 'add-client-form'}
      className={
        isEdit
          ? 'flex flex-col gap-3 pt-2'
          : 'flex-1 flex flex-col gap-4 min-h-0'
      }
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <div
        className={
          isEdit
            ? 'flex flex-col gap-3'
            : 'grid flex-1 auto-rows-min gap-4 px-4'
        }
      >
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Имя</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Введите имя клиента"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="companyId">
          {(field) => (
            <Field>
              <FieldLabel>Компания</FieldLabel>
              <Combobox
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val)}
                onBlur={field.handleBlur}
                placeholder="Без компании"
                searchPlaceholder="Поиск компании…"
                allowClear
                clearLabel="Без компании"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="counterpartiesIds">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel>Контрагенты</FieldLabel>
                <MultiSelectCombobox
                  options={counterpartyOptions}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  placeholder="Выберите контрагентов"
                  searchPlaceholder="Поиск контрагента…"
                  emptyText="Контрагенты не найдены"
                  className="h-9 w-full"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

<Button type="submit">{isEdit ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </form>
  )
}

export const AddClientForm = () => <ClientForm />

export const EditClientForm = ({
  client,
  onDone,
}: {
  client: Client
  onDone: () => void
}) => <ClientForm client={client} onDone={onDone} />
