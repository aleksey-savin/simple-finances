import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { Income } from '@/db/types'

import { addIncome, updateIncome } from './actions'

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
  createdAt: z.string(),
})

// ─── Props ────────────────────────────────────────────────────────────────────

type IncomeFormProps = {
  income?: Income
  onDone: () => void
  categories: { id: string; name: string; useForIncome: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
  asDialog?: boolean
}

// ─── Unified form component ───────────────────────────────────────────────────

export const IncomeForm = ({
  income: inc,
  onDone,
  categories,
  accounts,
  counterparties = [],
  asDialog = false,
}: IncomeFormProps) => {
  const router = useRouter()
  const isEdit = inc !== undefined

  const toLocalDatetimeString = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const form = useForm({
    defaultValues: {
      amount: inc ? String(inc.amount) : '',
      description: inc?.description ?? '',
      categoryId: inc?.categoryId ?? '',
      currentAccountId: inc?.currentAccountId ?? '',
      counterpartyId: inc?.counterpartyId ?? '',
      dueDate: inc?.dueDate
        ? new Date(inc.dueDate).toISOString().split('T')[0]
        : '',
      createdAt: toLocalDatetimeString(
        inc ? new Date(inc.createdAt) : new Date(),
      ),
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
          createdAt: value.createdAt
            ? new Date(value.createdAt).toISOString()
            : undefined,
        }

        if (isEdit) {
          await updateIncome({ data: { id: inc.id, ...serverData } })
          await router.invalidate()
          toast.success('Доход обновлён')
          onDone()
        } else {
          await addIncome({ data: serverData })
          await router.invalidate()
          toast.success('Доход успешно добавлен')
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
      id={isEdit ? 'edit-income-form' : 'add-income-form'}
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
            <Field data-invalid={isInvalid} className="sm:w-1/2">
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
                placeholder="Описание дохода"
                autoComplete="off"
                type="text"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <div className="flex gap-2">
        {' '}
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
      </div>

      {/* Counterparty (optional) */}
      {counterparties.length > 0 && (
        <form.Field name="counterpartyId">
          {(field) => (
            <Field className="sm:w-1/2 pe-2">
              <FieldLabel htmlFor={field.name}>Контрагент</FieldLabel>
              <Select
                value={field.state.value || '__none__'}
                onValueChange={(val) =>
                  field.handleChange(val === '__none__' ? '' : val)
                }
              >
                <SelectTrigger
                  id={field.name}
                  className="w-full"
                  onBlur={field.handleBlur}
                >
                  <SelectValue placeholder="Выберите контрагента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Не указан</SelectItem>
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

      <div className="flex gap-2">
        {' '}
        {/* Created at */}
        <form.Field name="createdAt">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Дата создания</FieldLabel>
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
        {/* Due date */}
        <form.Field name="dueDate">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Получить до (необязательно)
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
      </div>

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
    return (
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        {fields}
      </div>
    )
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemHeader className="mb-4 text-xl font-semibold">
          Новый доход
        </ItemHeader>
        {fields}
      </ItemContent>
    </Item>
  )
}

// ─── Convenience exports ──────────────────────────────────────────────────────

export const AddIncomeForm = (props: Omit<IncomeFormProps, 'income'>) => (
  <IncomeForm {...props} />
)

export const EditIncomeForm = (props: IncomeFormProps & { income: Income }) => (
  <IncomeForm {...props} />
)
