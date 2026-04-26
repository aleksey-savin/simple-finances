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
  fetchCompanyMembers,
  companyMembersQueryKey,
} from '@/components/companies/actions'
import { appScopesQueryKey } from '@/components/layout/app-sidebar'
import { fetchAppScopes } from '@/components/layout/actions'
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
  managerIds: z.array(z.string()),
})

// ─── Add form (no company field — auto from scope) ────────────────────────────

export const AddClientForm = ({ onDone }: { onDone?: () => void } = {}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: scopeData } = useQuery({
    queryKey: appScopesQueryKey,
    queryFn: () => fetchAppScopes(),
  })
  const { data: counterparties = [] } = useQuery({
    queryKey: counterpartiesQueryKey,
    queryFn: () => fetchCounterparties(),
  })

  const selectedScope = scopeData?.scopes.find(
    (s) => s.id === scopeData.selectedScopeId,
  )
  const scopeCompanyId =
    selectedScope?.kind === 'company' ? selectedScope.id : undefined

  const { data: companyMembers = [] } = useQuery({
    queryKey: companyMembersQueryKey(scopeCompanyId ?? ''),
    queryFn: () =>
      fetchCompanyMembers({ data: { companyId: scopeCompanyId! } }),
    enabled: !!scopeCompanyId,
  })

  const counterpartyOptions: MultiSelectOption[] = counterparties.map((c) => ({
    value: c.id,
    label: c.name,
    keywords: c.tin ? [c.tin] : undefined,
  }))

  const form = useForm({
    defaultValues: {
      name: '',
      counterpartiesIds: [] as string[],
      managerIds: [] as string[],
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await addClient({
          data: {
            name: value.name,
            companyId: scopeCompanyId,
            counterpartiesIds: value.counterpartiesIds,
            managerIds: value.managerIds,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
        toast.success('Клиент успешно добавлен')
        onDone?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id="add-client-form"
      className="flex-1 flex flex-col gap-4 min-h-0"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid flex-1 auto-rows-min gap-4 px-4">
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Имя</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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

        {companyMembers.length > 0 && (
          <form.Field name="managerIds">
            {(field) => (
              <Field>
                <FieldLabel>Ответственные менеджеры</FieldLabel>
                <MultiSelectCombobox
                  options={companyMembers.map((m) => ({
                    value: m.userId,
                    label: m.name,
                  }))}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  placeholder="Выберите менеджеров"
                  searchPlaceholder="Поиск…"
                  emptyText="Менеджеры не найдены"
                  className="h-9 w-full"
                />
              </Field>
            )}
          </form.Field>
        )}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              Создать
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

// ─── Edit form (company field kept) ──────────────────────────────────────────

export const EditClientForm = ({
  client: current,
  onDone,
}: {
  client: Client
  onDone: () => void
}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: counterparties = [] } = useQuery({
    queryKey: counterpartiesQueryKey,
    queryFn: () => fetchCounterparties(),
  })
  const { data: companies = [] } = useQuery({
    queryKey: companiesQueryKey,
    queryFn: () => fetchCompanies(),
  })

  const companyId = current.companyId ?? null
  const { data: companyMembers = [] } = useQuery({
    queryKey: companyMembersQueryKey(companyId ?? ''),
    queryFn: () => fetchCompanyMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  })

  const counterpartyOptions: MultiSelectOption[] = counterparties.map((c) => ({
    value: c.id,
    label: c.name,
    keywords: c.tin ? [c.tin] : undefined,
  }))

  const form = useForm({
    defaultValues: {
      name: current.name,
      companyId: current.companyId ?? '',
      counterpartiesIds: current.counterparties.map((item) => item.id),
      managerIds: current.managers.map((m) => m.userId),
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await updateClient({
          data: {
            id: current.id,
            name: value.name,
            companyId: value.companyId || undefined,
            counterpartiesIds: value.counterpartiesIds,
            managerIds: value.managerIds,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
        toast.success('Клиент обновлён')
        onDone()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id="edit-client-form"
      className="flex flex-col gap-3 pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-3">
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Имя</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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

        {companyMembers.length > 0 && (
          <form.Field name="managerIds">
            {(field) => (
              <Field>
                <FieldLabel>Ответственные менеджеры</FieldLabel>
                <MultiSelectCombobox
                  options={companyMembers.map((m) => ({
                    value: m.userId,
                    label: m.name,
                  }))}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  placeholder="Выберите менеджеров"
                  searchPlaceholder="Поиск…"
                  emptyText="Менеджеры не найдены"
                  className="h-9 w-full"
                />
              </Field>
            )}
          </form.Field>
        )}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              Сохранить
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

// Legacy export alias
export const ClientForm = AddClientForm
