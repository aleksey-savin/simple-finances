import { eq } from 'drizzle-orm'

import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import z from 'zod'

import { db } from '#/db'
import { currentAccount } from '#/db/schema'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Field, FieldError, FieldLabel } from '../ui/field'

type Account = {
  id: string
  name: string
}

const updateAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Минимум 2 символа'),
})

const updateAccount = createServerFn({ method: 'POST' })
  .inputValidator(updateAccountSchema)
  .handler(async ({ data }) => {
    await db
      .update(currentAccount)
      .set({
        name: data.name,
      })
      .where(eq(currentAccount.id, data.id))
  })

const editFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
})

export const EditAccountForm = ({
  account,
  onDone,
}: {
  account: Account
  onDone: () => void
}) => {
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      name: account.name,
    },
    validators: { onSubmit: editFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await updateAccount({
          data: { id: account.id, ...value },
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
