import { eq } from 'drizzle-orm'

import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import z from 'zod'

import { db } from '#/db'
import { category } from '#/db/schema'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Field, FieldError, FieldLabel } from '../ui/field'

import { Switch } from '../ui/switch'

type Category = {
  id: string
  name: string
  useForExpenses: boolean
  useForIncome: boolean
}

const updateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Минимум 2 символа'),
  useForExpenses: z.boolean(),
  useForIncome: z.boolean(),
})

const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema)
  .handler(async ({ data }) => {
    await db
      .update(category)
      .set({
        name: data.name,
        useForExpenses: data.useForExpenses,
        useForIncome: data.useForIncome,
      })
      .where(eq(category.id, data.id))
  })

const editFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  useForExpenses: z.boolean(),
  useForIncome: z.boolean(),
})

export const EditCategoryForm = ({
  category,
  onDone,
}: {
  category: Category
  onDone: () => void
}) => {
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      name: category.name,
      useForExpenses: category.useForExpenses,
      useForIncome: category.useForIncome,
    },
    validators: { onSubmit: editFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await updateCategory({
          data: { id: category.id, ...value },
        })
        await router.invalidate()
        toast.success('Категория обновлена')
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

      <div className="flex gap-6">
        <form.Field name="useForExpenses">
          {(field) => (
            <div className="flex items-center gap-2">
              <Switch
                id={`edit-expenses-${category.id}`}
                checked={field.state.value}
                onCheckedChange={(val: boolean) => field.handleChange(val)}
              />
              <FieldLabel htmlFor={`edit-expenses-${category.id}`}>
                Расходы
              </FieldLabel>
            </div>
          )}
        </form.Field>

        <form.Field name="useForIncome">
          {(field) => (
            <div className="flex items-center gap-2">
              <Switch
                id={`edit-income-${category.id}`}
                checked={field.state.value}
                onCheckedChange={(val: boolean) => field.handleChange(val)}
              />
              <FieldLabel htmlFor={`edit-income-${category.id}`}>
                Доходы
              </FieldLabel>
            </div>
          )}
        </form.Field>
      </div>

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
