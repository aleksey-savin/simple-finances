import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { counterpartyTypeEnum } from '@/db/schema'
import type { CounterpartyType } from '@/db/types'
import type { Counterparty } from '@/types'

import { addCounterparty, updateCounterparty } from './actions'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '../ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

// ─── Schema ───────────────────────────────────────────────────────────────────

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  fullName: z.string(),
  type: z.enum(counterpartyTypeEnum.enumValues),
  tin: z.string(),
})

// ─── Props ────────────────────────────────────────────────────────────────────

type CounterpartyFormProps =
  | { counterparty?: undefined; onDone?: undefined }
  | { counterparty: Counterparty; onDone: () => void }

// ─── Unified form component ───────────────────────────────────────────────────

export const CounterpartyForm = ({
  counterparty: cp,
  onDone,
}: CounterpartyFormProps) => {
  const router = useRouter()
  const isEdit = cp !== undefined

  const form = useForm({
    defaultValues: {
      name: cp?.name ?? '',
      fullName: cp?.fullName ?? '',
      type: (cp?.type ?? '') as CounterpartyType | '',
      tin: cp?.tin ?? '',
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const serverData = {
          name: value.name,
          fullName: value.fullName || undefined,
          type: value.type as CounterpartyType,
          tin: value.tin || undefined,
        }
        if (isEdit) {
          await updateCounterparty({ data: { id: cp.id, ...serverData } })
          await router.invalidate()
          toast.success('Контрагент обновлён')
          onDone()
        } else {
          await addCounterparty({ data: serverData })
          router.invalidate()
          form.reset()
          toast.success('Контрагент успешно добавлен')
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id={isEdit ? 'edit-counterparty-form' : 'add-counterparty-form'}
      className={
        isEdit
          ? 'flex flex-col gap-3 pt-2'
          : 'flex-1 flex flex-col gap-6 min-h-0'
      }
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div
        className={
          isEdit
            ? 'flex flex-col gap-3'
            : 'grid flex-1 auto-rows-min gap-6 px-4'
        }
      >
        {/* Name */}
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
                  placeholder="Введите имя контрагента"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        {/* Full name */}
        <form.Field
          name="fullName"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Полное наименование
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Введите полное наименование"
                  autoComplete="off"
                  type="text"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        {/* Type */}
        <form.Field
          name="type"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Тип</FieldLabel>
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(val) =>
                    field.handleChange(val as CounterpartyType)
                  }
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={isInvalid}
                    className="w-full"
                    onBlur={field.handleBlur}
                  >
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {counterpartyTypeEnum.enumValues.map((val) => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

        {/* TIN */}
        <form.Field
          name="tin"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>ИНН</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Введите ИНН"
                  autoComplete="off"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />

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
        ) : (
          <Button type="submit">Создать</Button>
        )}
      </div>
    </form>
  )
}

// ─── Convenience exports ──────────────────────────────────────────────────────

export const AddCounterpartyForm = () => <CounterpartyForm />

export const EditCounterpartyForm = ({
  counterparty,
  onDone,
}: {
  counterparty: Counterparty
  onDone: () => void
}) => <CounterpartyForm counterparty={counterparty} onDone={onDone} />
