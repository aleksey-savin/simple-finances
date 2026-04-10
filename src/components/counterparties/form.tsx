import z from 'zod'
import { useState, useEffect, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, UserCheck, UserX, X } from 'lucide-react'

import { counterpartyTypeEnum } from '@/db/schema'
import type { CounterpartyType } from '@/db/types'
import type { Counterparty } from '@/types'

import {
  addCounterparty,
  updateCounterparty,
  searchUserByEmail,
  counterpartiesQueryKey,
} from './actions'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '../ui/field'

// ─── Schema ───────────────────────────────────────────────────────────────────

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  fullName: z.string(),
  type: z.union([z.literal(''), z.enum(counterpartyTypeEnum.enumValues)]),
  tin: z.string(),
  linkedUserId: z.string(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

type FoundUser = { id: string; name: string; email: string }

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
  const queryClient = useQueryClient()
  const isEdit = cp !== undefined

  // ── Linked-user search state ──────────────────────────────────────────────
  const [emailInput, setEmailInput] = useState(cp?.linkedUser?.email ?? '')
  const [foundUser, setFoundUser] = useState<FoundUser | null>(
    cp?.linkedUser ?? null,
  )
  const [notFound, setNotFound] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues: {
      name: cp?.name ?? '',
      fullName: cp?.fullName ?? '',
      type: (cp?.type ?? '') as CounterpartyType | '',
      tin: cp?.tin ?? '',
      linkedUserId: cp?.linkedUserId ?? '',
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const serverData = {
          name: value.name,
          fullName: value.fullName || undefined,
          type: value.type as CounterpartyType | undefined,
          tin: value.tin || undefined,
          linkedUserId: value.linkedUserId || undefined,
        }
        if (isEdit) {
          await updateCounterparty({ data: { id: cp.id, ...serverData } })
          await router.invalidate()
          await queryClient.invalidateQueries({
            queryKey: counterpartiesQueryKey,
          })
          toast.success('Контрагент обновлён')
          onDone()
        } else {
          await addCounterparty({ data: serverData })
          router.invalidate()
          queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey })
          form.reset()
          setEmailInput('')
          setFoundUser(null)
          setNotFound(false)
          toast.success('Контрагент успешно добавлен')
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  // ── Debounced email search ────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = emailInput.trim()

    // If the current foundUser already matches the input, skip search
    if (foundUser && foundUser.email === trimmed) return

    // Clear linked user if input is emptied
    if (!trimmed) {
      setFoundUser(null)
      setNotFound(false)
      setIsSearching(false)
      form.setFieldValue('linkedUserId', '')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }

    setIsSearching(true)
    setNotFound(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchUserByEmail({ data: { email: trimmed } })
        if (result) {
          setFoundUser(result)
          setNotFound(false)
          form.setFieldValue('linkedUserId', result.id)
        } else {
          setFoundUser(null)
          setNotFound(true)
          form.setFieldValue('linkedUserId', '')
        }
      } catch {
        setFoundUser(null)
        setNotFound(false)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailInput])

  const handleClearLinkedUser = () => {
    setEmailInput('')
    setFoundUser(null)
    setNotFound(false)
    form.setFieldValue('linkedUserId', '')
  }

  return (
    <form
      id={isEdit ? 'edit-counterparty-form' : 'add-counterparty-form'}
      className={
        isEdit
          ? 'flex flex-col gap-3 pt-2'
          : 'flex-1 flex flex-col gap-4 min-h-0'
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
            : 'grid flex-1 auto-rows-min gap-4 px-4'
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
                <Combobox
                  options={counterpartyTypeEnum.enumValues.map((val) => ({
                    value: val,
                    label: val,
                  }))}
                  value={field.state.value}
                  onValueChange={(val) =>
                    field.handleChange(val as CounterpartyType | '')
                  }
                  placeholder="Выберите тип"
                  onBlur={field.handleBlur}
                  allowClear
                  clearLabel="Очистить тип"
                />
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

        {/* Linked user by email */}
        <Field>
          <FieldLabel htmlFor="linked-user-email">
            Привязать пользователя
          </FieldLabel>
          <div className="relative">
            <Input
              id="linked-user-email"
              type="email"
              autoComplete="off"
              placeholder="Введите email пользователя"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className={
                foundUser
                  ? 'border-primary pr-8'
                  : notFound
                    ? 'border-destructive pr-8'
                    : emailInput
                      ? 'pr-8'
                      : ''
              }
            />
            {/* Clear button */}
            {emailInput && (
              <button
                type="button"
                onClick={handleClearLinkedUser}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label="Очистить"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status feedback */}
          {isSearching && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Поиск…
            </p>
          )}
          {!isSearching && foundUser && (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <UserCheck className="size-3.5" />
              {foundUser.name} ({foundUser.email})
            </p>
          )}
          {!isSearching && notFound && emailInput && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <UserX className="size-3.5" />
              Пользователь не найден
            </p>
          )}
        </Field>

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
