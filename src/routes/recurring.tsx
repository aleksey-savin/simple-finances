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
import { RecurringForm, ruleFormSchema } from '#/components/reccuring/form'

import { PlusCircle, RefreshCw } from 'lucide-react'
import { RuleCard } from '#/components/reccuring/card'
import { CRON_PRESETS } from '#/components/reccuring/constants'

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

export type RuleWithRelations = Awaited<
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
      <div className="flex items-center justify-end">
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
        <div className="flex flex-col gap-3">
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

// ─── Create / Edit dialog form ────────────────────────────────────────────────

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

        <RecurringForm
          form={form}
          categories={categories}
          accounts={accounts}
          isEdit={isEdit}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
