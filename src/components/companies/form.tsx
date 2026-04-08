import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import z from 'zod'

import type { Company } from '@/types'
import { fetchAccounts, accountsQueryKey } from '@/components/accounts/actions'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from '@/components/ui/multi-select-combobox'
import {
  addCompany,
  companiesQueryKey,
  fetchCompanies,
  updateCompany,
} from './actions'

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  accountIds: z.array(z.string()).min(1, 'Выберите хотя бы один счёт'),
})

type CompanyFormProps =
  | { company?: undefined; onDone?: undefined }
  | { company: Company; onDone: () => void }

export const CompanyForm = ({
  company: current,
  onDone,
}: CompanyFormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = current !== undefined
  const { data: accounts = [] } = useQuery({
    queryKey: accountsQueryKey,
    queryFn: () => fetchAccounts(),
  })
  const { data: companies = [] } = useQuery({
    queryKey: companiesQueryKey,
    queryFn: () => fetchCompanies(),
  })

  const selectedAccountIds = new Set(current?.accounts.map((item) => item.id) ?? [])
  const assignedAccountIds = new Set(
    companies
      .filter((company) => company.id !== current?.id)
      .flatMap((company) => company.accounts.map((account) => account.id)),
  )

  const accountOptions: MultiSelectOption[] = accounts
    .filter(
      (account) =>
        selectedAccountIds.has(account.id) || !assignedAccountIds.has(account.id),
    )
    .map((account) => ({
      value: account.id,
      label: account.name,
      keywords: account.bankNameInitials ? [account.bankNameInitials] : undefined,
    }))

  const form = useForm({
    defaultValues: {
      name: current?.name ?? '',
      accountIds: current?.accounts.map((item) => item.id) ?? [],
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await updateCompany({
            data: {
              id: current.id,
              name: value.name,
              accountIds: value.accountIds,
            },
          })
          await router.invalidate()
          await queryClient.invalidateQueries({ queryKey: companiesQueryKey })
          toast.success('Компания обновлена')
          onDone()
          return
        }

        await addCompany({
          data: {
            name: value.name,
            accountIds: value.accountIds,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({ queryKey: companiesQueryKey })
        form.reset()
        toast.success('Компания успешно добавлена')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id={isEdit ? 'edit-company-form' : 'add-company-form'}
      className={
        isEdit
          ? 'flex flex-col gap-3 pt-2'
          : 'flex-1 flex flex-col gap-6 min-h-0'
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
            : 'grid flex-1 auto-rows-min gap-6 px-4'
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
                  placeholder="Введите название компании"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="accountIds">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel>Счета</FieldLabel>
                <MultiSelectCombobox
                  options={accountOptions}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  placeholder="Выберите счета"
                  searchPlaceholder="Поиск счёта…"
                  emptyText="Свободные счета не найдены"
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

export const AddCompanyForm = () => <CompanyForm />

export const EditCompanyForm = ({
  company,
  onDone,
}: {
  company: Company
  onDone: () => void
}) => <CompanyForm company={company} onDone={onDone} />
