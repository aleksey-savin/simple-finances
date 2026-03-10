import { useForm } from '@tanstack/react-form'
import { Item, ItemContent, ItemHeader } from '#/components/ui/item'
import z from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { income } from '#/db/schema'
import { auth } from 'utils/auth'
import { getRequest } from '@tanstack/react-start/server'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Button } from '#/components/ui/button'

const incomeFormSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string(),
  currentAccountId: z.string(),
  dueDate: z.string(),
})

const addIncomeSchema = z.object({
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string(),
  currentAccountId: z.string(),
  dueDate: z.string().optional(),
})

const addIncome = createServerFn({ method: 'POST' })
  .inputValidator(addIncomeSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      throw new Error('Не авторизован')
    }

    const [inserted] = await db
      .insert(income)
      .values({
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: income.id })
    return inserted.id
  })

export const IncomeForm = ({
  setAddIncomeIsOpen,
  categories,
  accounts,
}: {
  setAddIncomeIsOpen: (isOpen: boolean) => void
  categories: { useForIncome: boolean; id: string; name: string }[]
  accounts: { id: string; name: string }[]
}) => {
  const router = useRouter()

  const incomeForm = useForm({
    defaultValues: {
      amount: '',
      description: '',
      categoryId: '',
      currentAccountId: '',
      dueDate: '',
    },
    validators: { onSubmit: incomeFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await addIncome({
          data: {
            amount: +value.amount,
            description: value.description,
            categoryId: value.categoryId,
            currentAccountId: value.currentAccountId,
            dueDate: value.dueDate || undefined,
          },
        })
        await router.invalidate()
        toast.success('Доход успешно добавлен')
        incomeForm.reset()
        setAddIncomeIsOpen(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemHeader className="mb-4 text-xl font-semibold">
          Новый доход
        </ItemHeader>
        <form
          id="add-income-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            incomeForm.handleSubmit()
          }}
        >
          <incomeForm.Field name="amount">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Введите сумму"
                    autoComplete="off"
                    type="number"
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </incomeForm.Field>

          <incomeForm.Field name="description">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Описание дохода"
                    autoComplete="off"
                    type="text"
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </incomeForm.Field>

          <incomeForm.Field name="categoryId">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => field.handleChange(val)}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                      onBlur={field.handleBlur}
                    >
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.useForIncome)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </incomeForm.Field>

          <incomeForm.Field name="currentAccountId">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => field.handleChange(val)}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                      onBlur={field.handleBlur}
                    >
                      <SelectValue placeholder="Выберите счёт" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </incomeForm.Field>

          <incomeForm.Field name="dueDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  Оплатить до (необязательно)
                </FieldLabel>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </incomeForm.Field>

          <div className="flex gap-2 justify-end items-center">
            <Button type="submit">Добавить</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddIncomeIsOpen(false)}
            >
              Закрыть
            </Button>
          </div>
        </form>
      </ItemContent>
    </Item>
  )
}
