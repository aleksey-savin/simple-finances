import { useForm } from '@tanstack/react-form'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { addAccountFormSchema, addAccount, accountsQueryKey } from './actions'

export const AddAccountForm = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      name: '',
      bankBik: '',
      accountNumber: '',
      acceptPayments: false,
    },
    validators: { onSubmit: addAccountFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await addAccount({
          data: {
            name: value.name,
            bankBik: value.bankBik,
            accountNumber: value.accountNumber,
            acceptPayments: value.acceptPayments,
          },
        })
        router.invalidate()
        queryClient.invalidateQueries({ queryKey: accountsQueryKey })
        form.reset()
        toast.success('Счёт успешно добавлен')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id="add-account-form"
      className="flex-1 flex flex-col gap-6 min-h-0"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid flex-1 auto-rows-min gap-6 px-4">
        <form.Field
          name="name"
          children={(field) => {
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Введите имя счёта"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="bankBik"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>БИК</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(e.target.value.replace(/\D/g, ''))
                  }
                  aria-invalid={isInvalid}
                  placeholder="Введите БИК банка"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={9}
                  type="text"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Банк, коррсчёт и сокращение будут загружены автоматически по
                  БИК.
                </p>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="accountNumber"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Номер счёта</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(e.target.value.replace(/\D/g, ''))
                  }
                  aria-invalid={isInvalid}
                  placeholder="Введите номер счёта"
                  autoComplete="off"
                  inputMode="numeric"
                  type="text"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        <form.Field
          name="acceptPayments"
          children={(field) => (
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor={field.name} className="cursor-pointer">
                  Принимать платежи
                </FieldLabel>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Другие пользователи смогут направлять расходы на этот счёт как
                доход
              </p>
            </Field>
          )}
        />

        <Button type="submit">Создать</Button>
      </div>
    </form>
  )
}
