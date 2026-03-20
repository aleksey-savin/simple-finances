import { useRouter } from '@tanstack/react-router'

import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Field, FieldError, FieldLabel } from '../ui/field'

import type { CurrentAccountUpdate } from '#/db/types'
import { updateAccount, updateAccountSchema } from './actions'

export const EditAccountForm = ({
  account,
  onDone,
}: {
  account: CurrentAccountUpdate
  onDone: () => void
}) => {
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      name: account.name,
    },
    validators: { onSubmit: updateAccountSchema },
    onSubmit: async ({ value }) => {
      try {
        await updateAccount({
          data: { id: account.id, name: value.name || '' },
        })
        await router.invalidate()
        toast.success('Счёт обновлен')
        onDone()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-3 pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Название</FieldLabel>
              <Input
                id={field.name}
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

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Сохранить
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
