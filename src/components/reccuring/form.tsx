import z from 'zod'
import type { ReactFormExtendedApi } from '@tanstack/react-form'
import { CRON_PRESETS } from '#/components/reccuring/constants'
import { Button } from '#/components/ui/button'
import { DialogFooter } from '#/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

// ─── Schema ───────────────────────────────────────────────────────────────────

export const ruleFormSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.string().refine((v) => !isNaN(+v) && +v >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronPreset: z.string(),
  cronCustom: z.string(),
  dueDaysFromCreation: z.string(),
})

export type RuleFormValues = z.infer<typeof ruleFormSchema>

// Convenience alias for the fully-typed form instance returned by useForm(...)
// with RuleFormValues as the data shape. Validator generics are relaxed to any
// to match whatever useForm infers at the call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RuleForm = ReactFormExtendedApi<
  RuleFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

// ─── Component ────────────────────────────────────────────────────────────────

export const RecurringForm = ({
  form,
  categories,
  accounts,
  isEdit,
  onClose,
}: {
  form: RuleForm
  categories: {
    id: string
    name: string
    useForExpenses: boolean
    useForIncome: boolean
  }[]
  accounts: { id: string; name: string }[]
  isEdit: boolean
  onClose: () => void
}) => {
  return (
    <form
      className="flex flex-col gap-4 mt-2"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Type */}
      <form.Field name="type">
        {(field) => (
          <Field>
            <FieldLabel>Тип</FieldLabel>
            <div className="flex rounded-md border overflow-hidden divide-x text-sm">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    field.handleChange(t)
                    // Reset category when type changes
                    form.setFieldValue('categoryId', '')
                  }}
                  className={`flex-1 px-4 py-2 transition-colors ${
                    field.state.value === t
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {t === 'expense' ? 'Расход' : 'Доход'}
                </button>
              ))}
            </div>
          </Field>
        )}
      </form.Field>

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
                type="number"
                step="0.01"
                placeholder="0.00"
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
                type="text"
                placeholder="Например: Аренда офиса"
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

      {/* Category — filtered by selected type */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(type) => (
          <form.Field name="categoryId">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              const filtered = categories.filter((c) =>
                type === 'expense' ? c.useForExpenses : c.useForIncome,
              )
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel>Категория</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger
                      className="w-full"
                      onBlur={field.handleBlur}
                      aria-invalid={isInvalid}
                    >
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {filtered.map((c) => (
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
        )}
      </form.Subscribe>

      {/* Account */}
      <form.Field name="currentAccountId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Счёт</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={field.handleChange}
              >
                <SelectTrigger
                  className="w-full"
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
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

      {/* Cron preset */}
      <form.Field name="cronPreset">
        {(field) => (
          <Field>
            <FieldLabel>Расписание</FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите расписание" />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      {/* Custom cron expression — shown only when preset = 'custom' */}
      <form.Subscribe selector={(s) => s.values.cronPreset}>
        {(preset) =>
          preset === 'custom' ? (
            <form.Field name="cronCustom">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Cron-выражение{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        (5 полей: мин час день мес день_недели)
                      </span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="text"
                      placeholder="0 9 1 * *"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      className="font-mono"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          ) : null
        }
      </form.Subscribe>

      {/* Due days from creation */}
      <form.Field name="dueDaysFromCreation">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              Срок оплаты (дней от создания)
              <span className="text-xs text-muted-foreground font-normal ml-1">
                — необязательно
              </span>
            </FieldLabel>
            <Input
              id={field.name}
              type="number"
              min="1"
              step="1"
              placeholder="Например: 5 (срок — через 5 дней после создания)"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Оставьте пустым, если срок оплаты не нужен.
            </p>
          </Field>
        )}
      </form.Field>

      <DialogFooter className="mt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
