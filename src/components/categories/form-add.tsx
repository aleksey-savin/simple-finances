import { useForm } from '@tanstack/react-form'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { Switch } from '../ui/switch'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { addCategory, categoryFormSchema, categoriesQueryKey } from './actions'

export const AddCategoryForm = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      name: '',
      useForIncome: false,
      useForExpenses: false,
      isShared: false,
    },
    validators: { onSubmit: categoryFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await addCategory({
          data: {
            name: value.name,
            useForIncome: value.useForIncome,
            useForExpenses: value.useForExpenses,
            isShared: value.isShared,
          },
        })
        router.invalidate()
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
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
      className="flex-1 flex flex-col gap-4 min-h-0"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid flex-1 auto-rows-min gap-4 px-4">
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
                    <FieldLabel htmlFor={field.name}>Доход</FieldLabel>
                  </div>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />
        </div>

        <form.Field
          name="isShared"
          children={(field) => (
            <Field>
              <div className="flex items-center justify-start gap-2">
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
                <FieldLabel htmlFor={field.name} className="cursor-pointer">
                  Общая категория
                </FieldLabel>
              </div>
              <p className="text-xs text-muted-foreground">
                Общие категории видны всем пользователям
              </p>
            </Field>
          )}
        />

        <Button type="submit">Создать</Button>
      </div>
    </form>
  )
}
