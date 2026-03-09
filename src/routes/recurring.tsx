import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import { recurringRule, currentAccountUser, currentAccount } from '#/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { Cron } from 'croner'
import z from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { Item, ItemContent, ItemFooter, ItemHeader } from '#/components/ui/item'
import {
  Calendar,
  Clock,
  PenLine,
  PlusCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'

// ─── Cron presets ─────────────────────────────────────────────────────────────

const CRON_PRESETS = [
  { label: 'Ежедневно (9:00)', value: '0 9 * * *' },
  { label: 'Еженедельно в пн (9:00)', value: '0 9 * * 1' },
  { label: 'Раз в 2 недели в пн (9:00)', value: '0 9 * * 1/2' },
  { label: 'Ежемесячно (1-е число, 9:00)', value: '0 9 1 * *' },
  { label: 'Ежеквартально (9:00)', value: '0 9 1 1,4,7,10 *' },
  { label: 'Ежегодно (1 янв, 9:00)', value: '0 9 1 1 *' },
  { label: 'Свой вариант', value: 'custom' },
] as const

function getCronLabel(expr: string): string {
  const found = CRON_PRESETS.find(
    (p) => p.value === expr && p.value !== 'custom',
  )
  return found ? found.label : expr
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Server functions ──────────────────────────────────────────────────────────

const fetchRecurringData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const userId = session.user.id

  const memberships = await db
    .select({
      currentAccountId: currentAccountUser.currentAccountId,
      role: currentAccountUser.role,
    })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  const accountIds = memberships.map((m) => m.currentAccountId)

  if (accountIds.length === 0) {
    const cats = await db.query.category.findMany({})
    return { rules: [], categories: cats, accounts: [] }
  }

  const [rules, cats, accounts] = await Promise.all([
    db.query.recurringRule.findMany({
      where: inArray(recurringRule.currentAccountId, accountIds),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
      },
    }),
    db.query.category.findMany({}),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
    }),
  ])

  return { rules, categories: cats, accounts }
})

// ── Create ─────────────────────────────────────────────────────────────────────

const createRuleSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronExpression: z.string().min(1, 'Введите расписание'),
  dueDaysFromCreation: z.number().nullable(),
})

const createRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(createRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const job = new Cron(data.cronExpression, { paused: true })
    const nextRunAt = job.nextRun()

    await db.insert(recurringRule).values({
      type: data.type,
      amount: data.amount.toString(),
      description: data.description,
      categoryId: data.categoryId,
      currentAccountId: data.currentAccountId,
      cronExpression: data.cronExpression,
      dueDaysFromCreation: data.dueDaysFromCreation,
      nextRunAt,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
  })

// ── Update ─────────────────────────────────────────────────────────────────────

const updateRuleSchema = createRuleSchema.extend({ id: z.string() })

const updateRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(updateRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const job = new Cron(data.cronExpression, { paused: true })
    const nextRunAt = job.nextRun()

    await db
      .update(recurringRule)
      .set({
        type: data.type,
        amount: data.amount.toString(),
        description: data.description,
        categoryId: data.categoryId,
        currentAccountId: data.currentAccountId,
        cronExpression: data.cronExpression,
        dueDaysFromCreation: data.dueDaysFromCreation,
        nextRunAt,
        updatedBy: session.user.id,
      })
      .where(eq(recurringRule.id, data.id))
  })

// ── Delete ─────────────────────────────────────────────────────────────────────

const deleteRuleSchema = z.object({ id: z.string() })

const deleteRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(deleteRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.delete(recurringRule).where(eq(recurringRule.id, data.id))
  })

// ── Toggle active ──────────────────────────────────────────────────────────────

const toggleRuleSchema = z.object({ id: z.string(), isActive: z.boolean() })

const toggleRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(toggleRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    // When re-activating, recalculate nextRunAt so it fires at the proper future time
    let nextRunAt: Date | null = null
    if (data.isActive) {
      const existing = await db.query.recurringRule.findFirst({
        where: eq(recurringRule.id, data.id),
        columns: { cronExpression: true },
      })
      if (existing) {
        const job = new Cron(existing.cronExpression, { paused: true })
        nextRunAt = job.nextRun() ?? null
      }
    }

    await db
      .update(recurringRule)
      .set({
        isActive: data.isActive,
        ...(data.isActive && nextRunAt ? { nextRunAt } : {}),
      })
      .where(eq(recurringRule.id, data.id))
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring')({
  component: RecurringPage,
  loader: () => fetchRecurringData(),
})

// ─── Main component ───────────────────────────────────────────────────────────

type RuleWithRelations = Awaited<
  ReturnType<typeof fetchRecurringData>
>['rules'][number]

function RecurringPage() {
  const router = useRouter()
  const { rules, categories, accounts } = Route.useLoaderData()

  // Dialog state — null = closed, 'new' = create, rule = edit
  const [dialogTarget, setDialogTarget] = useState<
    null | 'new' | RuleWithRelations
  >(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RuleWithRelations | null>(
    null,
  )

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteRecurringRule({ data: { id: deleteTarget.id } })
      await router.invalidate()
      toast.success('Правило удалено')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleToggle = async (rule: RuleWithRelations, isActive: boolean) => {
    try {
      await toggleRecurringRule({ data: { id: rule.id, isActive } })
      await router.invalidate()
      toast.success(
        isActive ? 'Правило активировано' : 'Правило приостановлено',
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Повторяющиеся записи</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Автоматическое создание доходов и расходов по расписанию
          </p>
        </div>
        <Button onClick={() => setDialogTarget('new')}>
          <PlusCircle className="size-4" />
          Добавить правило
        </Button>
      </div>

      {/* ── Rules list ─────────────────────────────────────────────────────── */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="size-10 opacity-30" />
          <p className="text-sm">Нет ни одного правила. Создайте первое!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => setDialogTarget(rule)}
              onDelete={() => setDeleteTarget(rule)}
              onToggle={(v) => handleToggle(rule, v)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit dialog ────────────────────────────────────────────── */}
      {dialogTarget !== null && (
        <RuleDialog
          rule={dialogTarget === 'new' ? undefined : dialogTarget}
          categories={categories}
          accounts={accounts}
          onClose={() => setDialogTarget(null)}
          onSaved={async () => {
            setDialogTarget(null)
            await router.invalidate()
          }}
        />
      )}

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить правило?</DialogTitle>
            <DialogDescription>
              Правило «{deleteTarget?.description}» будет удалено безвозвратно.
              Уже созданные записи останутся.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: RuleWithRelations
  onEdit: () => void
  onDelete: () => void
  onToggle: (v: boolean) => void
}) {
  const isExpense = rule.type === 'expense'

  return (
    <Item variant="outline" className="flex-col items-stretch gap-0 p-0">
      {/* Card header */}
      <ItemHeader className="px-4 pt-4 pb-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant={isExpense ? 'destructive' : 'default'}
            className="shrink-0"
          >
            {isExpense ? 'Расход' : 'Доход'}
          </Badge>
          <span className="font-medium truncate">{rule.description}</span>
        </div>
        <Switch
          checked={rule.isActive}
          onCheckedChange={onToggle}
          aria-label="Активность правила"
        />
      </ItemHeader>

      {/* Card body */}
      <ItemContent className="px-4 py-3 gap-2.5">
        {/* Amount */}
        <div className="text-xl font-semibold tabular-nums">
          {Number(rule.amount).toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          ₽
        </div>

        {/* Category & account */}
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">
            {rule.category.name}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5">
            {rule.currentAccount.name}
          </span>
        </div>

        {/* Schedule */}
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5 mt-0.5 shrink-0" />
          <span>{getCronLabel(rule.cronExpression)}</span>
        </div>

        {/* Due days */}
        {rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>
              Срок оплаты: {rule.dueDaysFromCreation}{' '}
              {pluralDays(rule.dueDaysFromCreation)} от создания
            </span>
          </div>
        ) : null}

        {/* Last / next run */}
        <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="opacity-60">Последний запуск:</span>
          <span>{formatDate(rule.lastRunAt)}</span>
          <span className="opacity-60">Следующий запуск:</span>
          <span
            className={!rule.isActive ? 'line-through opacity-40' : undefined}
          >
            {rule.isActive ? formatDate(rule.nextRunAt) : 'Приостановлено'}
          </span>
        </div>
      </ItemContent>

      {/* Card footer */}
      <ItemFooter className="px-4 py-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={onEdit}
        >
          <PenLine className="size-3.5" />
          Изменить
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          Удалить
        </Button>
      </ItemFooter>
    </Item>
  )
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}

// ─── Create / Edit dialog form ────────────────────────────────────────────────

const ruleFormSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.string().refine((v) => !isNaN(+v) && +v >= 0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronPreset: z.string(),
  cronCustom: z.string(),
  dueDaysFromCreation: z.string(),
})

function RuleDialog({
  rule,
  categories,
  accounts,
  onClose,
  onSaved,
}: {
  rule?: RuleWithRelations
  categories: {
    id: string
    name: string
    useForExpenses: boolean
    useForIncome: boolean
  }[]
  accounts: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const isEdit = rule !== undefined

  // Determine initial preset value
  const initialPreset = rule
    ? CRON_PRESETS.some(
        (p) => p.value === rule.cronExpression && p.value !== 'custom',
      )
      ? rule.cronExpression
      : 'custom'
    : '0 9 1 * *'

  const form = useForm({
    defaultValues: {
      type: (rule?.type as 'expense' | 'income') ?? 'expense',
      amount: rule ? Number(rule.amount).toString() : '',
      description: rule?.description ?? '',
      categoryId: rule?.categoryId ?? '',
      currentAccountId: rule?.currentAccountId ?? '',
      cronPreset: initialPreset,
      cronCustom: rule ? rule.cronExpression : '',
      dueDaysFromCreation: rule?.dueDaysFromCreation
        ? String(rule.dueDaysFromCreation)
        : '',
    },
    validators: { onSubmit: ruleFormSchema },
    onSubmit: async ({ value }) => {
      const cronExpression =
        value.cronPreset === 'custom' ? value.cronCustom : value.cronPreset

      // Validate cron expression before submitting
      try {
        new Cron(cronExpression, { paused: true })
      } catch {
        toast.error('Некорректное cron-выражение')
        return
      }

      const payload = {
        type: value.type,
        amount: +value.amount,
        description: value.description,
        categoryId: value.categoryId,
        currentAccountId: value.currentAccountId,
        cronExpression,
        dueDaysFromCreation:
          value.dueDaysFromCreation.trim() !== '' &&
          !isNaN(+value.dueDaysFromCreation) &&
          +value.dueDaysFromCreation > 0
            ? +value.dueDaysFromCreation
            : null,
      }

      try {
        if (isEdit) {
          await updateRecurringRule({ data: { ...payload, id: rule.id } })
          toast.success('Правило обновлено')
        } else {
          await createRecurringRule({ data: payload })
          toast.success('Правило создано')
        }
        await onSaved()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редактировать правило' : 'Новое правило'}
          </DialogTitle>
          <DialogDescription>
            Запись будет создаваться автоматически по расписанию. Срок оплаты
            рассчитывается от даты создания записи.
          </DialogDescription>
        </DialogHeader>

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

          {/* Category */}
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
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
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

          {/* Custom cron expression input (shown only when preset = 'custom') */}
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
                  {isSubmitting
                    ? 'Сохранение…'
                    : isEdit
                      ? 'Сохранить'
                      : 'Создать'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
