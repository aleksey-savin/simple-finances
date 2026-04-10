import z from 'zod'
import { useState, useEffect, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Plus, UserCheck, UserX, X } from 'lucide-react'

import { counterpartyTypeEnum } from '@/db/schema'
import type { CounterpartyType } from '@/db/types'
import type { Counterparty } from '@/types'

import {
  addCounterparty,
  addCounterpartyToScope,
  counterpartiesQueryKey,
  searchCounterparties,
  updateCounterparty,
  searchUserByEmail,
} from './actions'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { useDebounce } from '#/hooks/use-debounce'

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  fullName: z.string(),
  type: z.union([z.literal(''), z.enum(counterpartyTypeEnum.enumValues)]),
  tin: z.string(),
  linkedUserId: z.string(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

type FoundUser = { id: string; name: string; email: string }

// ─── Add form: find-or-create ─────────────────────────────────────────────────

export function AddCounterpartyForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [addingId, setAddingId] = useState<string | null>(null)

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['counterparty-search', debouncedQuery],
    queryFn: () => searchCounterparties({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.trim().length >= 2,
    placeholderData: (prev) => prev,
  })

  async function handleAddToScope(counterpartyId: string) {
    setAddingId(counterpartyId)
    try {
      await addCounterpartyToScope({ data: { counterpartyId } })
      await queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey })
      router.invalidate()
      toast.success('Контрагент добавлен в список')
      onDone?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    } finally {
      setAddingId(null)
    }
  }

  if (mode === 'create') {
    return (
      <CreateCounterpartyFields
        initialName={query}
        onDone={onDone}
        onBack={() => setMode('search')}
      />
    )
  }

  const showResults = debouncedQuery.trim().length >= 2

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>Поиск по названию или ИНН</FieldLabel>
        <div className="relative">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Начните вводить название или ИНН..."
          />
          {isFetching && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </Field>

      {showResults && (
        <div className="flex flex-col gap-1.5">
          {results.length === 0 && !isFetching ? (
            <p className="text-sm text-muted-foreground">Ничего не найдено</p>
          ) : (
            results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {r.tin && (
                      <Badge variant="outline" className="text-xs">
                        ИНН {r.tin}
                      </Badge>
                    )}
                    {r.type && (
                      <Badge variant="secondary" className="text-xs">
                        {r.type}
                      </Badge>
                    )}
                  </div>
                </div>
                {r.inScope ? (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    В списке
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    disabled={addingId === r.id}
                    onClick={() => handleAddToScope(r.id)}
                  >
                    {addingId === r.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Добавить
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="border-t pt-3">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => setMode('create')}
        >
          <Plus className="size-4" />
          Создать нового контрагента
        </Button>
      </div>
    </div>
  )
}

// ─── Create sub-form ──────────────────────────────────────────────────────────

function CreateCounterpartyFields({
  initialName,
  onDone,
  onBack,
}: {
  initialName?: string
  onDone?: () => void
  onBack: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [emailInput, setEmailInput] = useState('')
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm({
    defaultValues: {
      name: initialName ?? '',
      fullName: '',
      type: '' as CounterpartyType | '',
      tin: '',
      linkedUserId: '',
    },
    validators: { onSubmit: createSchema },
    onSubmit: async ({ value }) => {
      try {
        await addCounterparty({
          data: {
            name: value.name,
            fullName: value.fullName || undefined,
            type: value.type as CounterpartyType | undefined,
            tin: value.tin || undefined,
            linkedUserId: value.linkedUserId || undefined,
          },
        })
        await queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey })
        router.invalidate()
        toast.success('Контрагент создан и добавлен в список')
        onDone?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  useEffect(() => {
    const trimmed = emailInput.trim()
    if (foundUser && foundUser.email === trimmed) return

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

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Назад к поиску
      </button>

      <form.Field name="name">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Имя *</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Введите имя контрагента"
                autoComplete="off"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="fullName">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Полное наименование</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Введите полное наименование"
              autoComplete="off"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <Field>
            <FieldLabel>Тип</FieldLabel>
            <Combobox
              options={counterpartyTypeEnum.enumValues.map((val) => ({
                value: val,
                label: val,
              }))}
              value={field.state.value}
              onValueChange={(val) => field.handleChange(val as CounterpartyType | '')}
              onBlur={field.handleBlur}
              placeholder="Выберите тип"
              allowClear
              clearLabel="Очистить тип"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="tin">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>ИНН</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Введите ИНН"
              autoComplete="off"
            />
          </Field>
        )}
      </form.Field>

      <Field>
        <FieldLabel htmlFor="linked-user-email">Привязать пользователя</FieldLabel>
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
          {emailInput && (
            <button
              type="button"
              onClick={() => {
                setEmailInput('')
                setFoundUser(null)
                setNotFound(false)
                form.setFieldValue('linkedUserId', '')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
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

      <Button type="submit" size="sm">
        Создать
      </Button>
    </form>
  )
}

// ─── Edit form ────────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  fullName: z.string(),
  type: z.union([z.literal(''), z.enum(counterpartyTypeEnum.enumValues)]),
  tin: z.string(),
  linkedUserId: z.string(),
})

export function EditCounterpartyForm({
  counterparty: cp,
  onDone,
}: {
  counterparty: Counterparty
  onDone: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [emailInput, setEmailInput] = useState(cp.linkedUser?.email ?? '')
  const [foundUser, setFoundUser] = useState<FoundUser | null>(cp.linkedUser ?? null)
  const [notFound, setNotFound] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm({
    defaultValues: {
      name: cp.name,
      fullName: cp.fullName ?? '',
      type: (cp.type ?? '') as CounterpartyType | '',
      tin: cp.tin ?? '',
      linkedUserId: cp.linkedUserId ?? '',
    },
    validators: { onSubmit: editSchema },
    onSubmit: async ({ value }) => {
      try {
        await updateCounterparty({
          data: {
            id: cp.id,
            name: value.name,
            fullName: value.fullName || undefined,
            type: value.type as CounterpartyType | undefined,
            tin: value.tin || undefined,
            linkedUserId: value.linkedUserId || undefined,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey })
        toast.success('Контрагент обновлён')
        onDone()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  useEffect(() => {
    const trimmed = emailInput.trim()
    if (foundUser && foundUser.email === trimmed) return

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
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Имя</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Введите имя контрагента"
                autoComplete="off"
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="fullName">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Полное наименование</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Введите полное наименование"
              autoComplete="off"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <Field>
            <FieldLabel>Тип</FieldLabel>
            <Combobox
              options={counterpartyTypeEnum.enumValues.map((val) => ({
                value: val,
                label: val,
              }))}
              value={field.state.value}
              onValueChange={(val) => field.handleChange(val as CounterpartyType | '')}
              onBlur={field.handleBlur}
              placeholder="Выберите тип"
              allowClear
              clearLabel="Очистить тип"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="tin">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>ИНН</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Введите ИНН"
              autoComplete="off"
            />
          </Field>
        )}
      </form.Field>

      <Field>
        <FieldLabel htmlFor="edit-linked-user-email">Привязать пользователя</FieldLabel>
        <div className="relative">
          <Input
            id="edit-linked-user-email"
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
          {emailInput && (
            <button
              type="button"
              onClick={() => {
                setEmailInput('')
                setFoundUser(null)
                setNotFound(false)
                form.setFieldValue('linkedUserId', '')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
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

      <div className="flex gap-2">
        <Button type="submit" size="sm">Сохранить</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Отмена</Button>
      </div>
    </form>
  )
}
