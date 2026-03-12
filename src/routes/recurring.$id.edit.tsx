import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import { recurringRule, currentAccountUser, currentAccount } from '#/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { Cron } from 'croner'
import z from 'zod'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'

import { ResponsiveDialog } from '#/components/ui/responsive-dialog'
import { RecurringForm, ruleFormSchema } from '#/components/reccuring/form'
import { CRON_PRESETS } from '#/components/reccuring/constants'

// ─── Loader ───────────────────────────────────────────────────────────────────

const fetchEditFormData = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const memberships = await db
      .select({ currentAccountId: currentAccountUser.currentAccountId })
      .from(currentAccountUser)
      .where(eq(currentAccountUser.userId, session.user.id))

    const accountIds = memberships.map((m) => m.currentAccountId)

    const [rule, categories, accounts] = await Promise.all([
      db.query.recurringRule.findFirst({
        where: eq(recurringRule.id, id),
        with: {
          category: { columns: { id: true, name: true } },
          currentAccount: { columns: { id: true, name: true } },
        },
      }),
      db.query.category.findMany({}),
      accountIds.length > 0
        ? db.query.currentAccount.findMany({
            where: inArray(currentAccount.id, accountIds),
          })
        : Promise.resolve([]),
    ])

    if (!rule) throw new Error('Правило не найдено')

    return { rule, categories, accounts }
  })

// ─── Server function ──────────────────────────────────────────────────────────

const updateRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['expense', 'income']),
  amount: z.number().min(0.01, 'Минимум 0.01'),
  description: z.string().min(2, 'Минимум 2 символа'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  currentAccountId: z.string().min(1, 'Выберите счёт'),
  cronExpression: z.string().min(1, 'Введите расписание'),
  dueDaysFromCreation: z.number().nullable(),
})

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

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring/$id/edit')({
  loader: ({ params }) => fetchEditFormData({ data: params.id }),
  component: EditRulePage,
})

// ─── Component ────────────────────────────────────────────────────────────────

function EditRulePage() {
  const router = useRouter()
  const { rule, categories, accounts } = Route.useLoaderData()
  const { id } = Route.useParams()

  const handleClose = () => router.navigate({ to: '/recurring' })

  const initialPreset = CRON_PRESETS.some(
    (p) => p.value === rule.cronExpression && p.value !== 'custom',
  )
    ? rule.cronExpression
    : 'custom'

  const form = useForm({
    defaultValues: {
      type: rule.type as 'expense' | 'income',
      amount: Number(rule.amount).toString(),
      description: rule.description,
      categoryId: rule.categoryId,
      currentAccountId: rule.currentAccountId,
      cronPreset: initialPreset,
      cronCustom: rule.cronExpression,
      dueDaysFromCreation: rule.dueDaysFromCreation
        ? String(rule.dueDaysFromCreation)
        : '',
    },
    validators: { onSubmit: ruleFormSchema },
    onSubmit: async ({ value }) => {
      const cronExpression =
        value.cronPreset === 'custom' ? value.cronCustom : value.cronPreset

      try {
        new Cron(cronExpression, { paused: true })
      } catch {
        toast.error('Некорректное cron-выражение')
        return
      }

      try {
        await updateRecurringRule({
          data: {
            id,
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
          },
        })
        toast.success('Правило обновлено')
        await router.invalidate()
        handleClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Редактировать правило"
      description="Запись будет создаваться автоматически по расписанию. Срок оплаты рассчитывается от даты создания."
    >
      <RecurringForm
        form={form}
        categories={categories}
        accounts={accounts}
        isEdit={true}
        onClose={handleClose}
      />
    </ResponsiveDialog>
  )
}
