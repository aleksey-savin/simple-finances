import { useForm } from '@tanstack/react-form'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { useRouter } from '@tanstack/react-router'
import { addAccountFormSchema, addAccount } from './actions'

export const AddAccountForm = () => {
  const router = useRouter()
  const form = useForm({
    defaultValues: { name: '' },
    validators: { onSubmit: addAccountFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await addAccount({ data: { name: value.name } })
        router.invalidate()
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

        <Button type="submit">Создать</Button>
      </div>
    </form>
  )
}
