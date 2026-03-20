import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { Expense } from '@/db/types'

import { addExpense, updateExpense } from './actions'

import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Item, ItemContent, ItemHeader } from '@/components/ui/item'

// ─── Schema ───────────────────────────────────────────────────────────────────

const uiFormSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  counterpartyId: z.string(),
  dueDate: z.string(),
})

// ─── Props ────────────────────────────────────────────────────────────────────

type ExpenseFormProps = {
  expense?: Expense
  onDone: () => void
  categories: { id: string; name: string; useForExpenses: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
  asDialog?: boolean
}

// ─── Unified form component ───────────────────────────────────────────────────

export const ExpenseForm = ({
  expense: exp,
  onDone,
  categories,
  accounts,
  counterparties = [],
  asDialog = false,
}: ExpenseFormProps) => {
  const router = useRouter()
  const isEdit = exp !== undefined

  const form = useForm({
    defaultValues: {
      amount: exp ? String(exp.amount) : '',
      description: exp?.description ?? '',
      categoryId: exp?.categoryId ?? '',
      currentAccountId: exp?.currentAccountId ?? '',
      counterpartyId: exp?.counterpartyId ?? '',
      dueDate: exp?.dueDate
        ? new Date(exp.dueDate).toISOString().split('T')[0]
        : '',
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const serverData = {
          amount: +value.amount,
          description: value.description,
          categoryId: value.categoryId,
          currentAccountId: value.currentAccountId,
          counterpartyId: value.counterpartyId || undefined,
          dueDate: value.dueDate || undefined,
        }

        if (isEdit) {
          await updateExpense({ data: { id: exp.id, ...serverData } })
          await router.invalidate()
          toast.success('Расход обновлён')
          onDone()
        } else {
          await addExpense({ data: serverData })
          await router.invalidate()
          toast.success('Расход успешно добавлен')
          form.reset()
          onDone()
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  const fields = (
    <form
      id={isEdit ? 'edit-expense-form' : 'add-expense-form'}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Amount */}
      <form.Field name="amount">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Сумма</FieldLabel>
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
      </form.Field>

      {/* Description */}
      <form.Field name="description">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Описание</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                placeholder="Описание расхода"
                autoComplete="off"
                type="text"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      {/* Category */}
      <form.Field name="categoryId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Категория</FieldLabel>
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
                    .filter((c) => c.useForExpenses)
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
      </form.Field>

      {/* Account */}
      <form.Field name="currentAccountId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Счёт</FieldLabel>
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
      </form.Field>

      {/* Counterparty (optional) */}
      {counterparties.length > 0 && (
        <form.Field name="counterpartyId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Контрагент</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val)}
              >
                <SelectTrigger
                  id={field.name}
                  className="w-full"
                  onBlur={field.handleBlur}
                >
                  <SelectValue placeholder="Выберите контрагента" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      )}

      {/* Due date */}
      <form.Field name="dueDate">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              Оплатить до (необязательно)
            </FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>

      {/* Actions */}
      {isEdit ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Сохранить
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Отмена
          </Button>
        </div>
      ) : asDialog ? (
        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Отмена
          </Button>
          <Button type="submit">Добавить</Button>
        </DialogFooter>
      ) : (
        <div className="flex gap-2 justify-end items-center">
          <Button type="submit">Добавить</Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Закрыть
          </Button>
        </div>
      )}
    </form>
  )

  if (isEdit) {
    return <div className="flex flex-col gap-3 pt-2">{fields}</div>
  }

  if (asDialog) {
    return <div className="flex flex-col gap-4 overflow-y-auto">{fields}</div>
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemHeader className="mb-4 text-xl font-semibold">
          Новый расход
        </ItemHeader>
        {fields}
      </ItemContent>
    </Item>
  )
}

// ─── Convenience exports ──────────────────────────────────────────────────────

export const AddExpenseForm = (props: Omit<ExpenseFormProps, 'expense'>) => (
  <ExpenseForm {...props} />
)

export const EditExpenseForm = (
  props: ExpenseFormProps & { expense: Expense },
) => <ExpenseForm {...props} />
