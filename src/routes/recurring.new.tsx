import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import { recurringRule } from '#/db/schema'
import { Cron } from 'croner'
import z from 'zod'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'

import { ResponsiveDialog } from '#/components/ui/responsive-dialog'
import { RecurringForm, ruleFormSchema } from '#/components/reccuring/form'
import {
  useAppStore,
  selectCategories,
  selectAccounts,
  selectCounterparties,
} from '@/store/app-store'

// ─── Server function ──────────────────────────────────────────────────────────

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

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring/new')({
  component: NewRulePage,
})

// ─── Component ────────────────────────────────────────────────────────────────

function NewRulePage() {
  const router = useRouter()
  const categories = useAppStore(selectCategories)
  const accounts = useAppStore(selectAccounts)
  const counterparties = useAppStore(selectCounterparties)

  const handleClose = () => router.navigate({ to: '/recurring' })

  const form = useForm({
    defaultValues: {
      type: 'expense' as 'expense' | 'income',
      amount: '',
      description: '',
      categoryId: '',
      counterpartyId: '',
      currentAccountId: '',
      cronPreset: '0 9 1 * *',
      cronCustom: '',
      dueDaysFromCreation: '',
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
        await createRecurringRule({
          data: {
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
        toast.success('Правило создано')
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
      title="Новое правило"
      description="Запись будет создаваться автоматически по расписанию. Срок оплаты рассчитывается от даты создания."
    >
      <RecurringForm
        form={form}
        categories={categories}
        accounts={accounts}
        counterparties={counterparties}
        isEdit={false}
        onClose={handleClose}
      />
    </ResponsiveDialog>
  )
}
