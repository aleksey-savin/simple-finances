import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '#/db'
import { category } from '#/db/schema'
import { auth } from 'utils/auth'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { Switch } from '../ui/switch'
import { useRouter } from '@tanstack/react-router'

const formSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  useForIncome: z.boolean(),
  useForExpenses: z.boolean(),
})

const addCategory = createServerFn({ method: 'POST' })
  .inputValidator(formSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(category)
      .values({
        name: data.name,
        useForIncome: data.useForIncome,
        useForExpenses: data.useForExpenses,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: category.id })
    return inserted.id
  })

export const AddCategoryForm = () => {
  const router = useRouter()
  const form = useForm({
    defaultValues: { name: '', useForIncome: false, useForExpenses: false },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      try {
        await addCategory({
          data: {
            name: value.name,
            useForIncome: value.useForIncome,
            useForExpenses: value.useForExpenses,
          },
        })
        router.invalidate()
        form.reset()
        toast.success('Категория успешно добавлена')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })
  return (
    <form
      id="add-category-form"
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
                  placeholder="Введите имя категории"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />
        <div className="flex">
          <form.Field
            name="useForExpenses"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <div className="flex gap-2">
                    <Switch
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={(val: boolean) => {
                        field.handleChange(val)
                      }}
                    />
                    <FieldLabel htmlFor={field.name}>Расходы</FieldLabel>
                  </div>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />
          <form.Field
            name="useForIncome"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <div className="flex gap-2">
                    <Switch
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={(val: boolean) => {
                        field.handleChange(val)
                      }}
                    />
                    <FieldLabel htmlFor={field.name}>Доходы</FieldLabel>
                  </div>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />
        </div>

        <Button type="submit">Создать</Button>
      </div>
    </form>
  )
}
