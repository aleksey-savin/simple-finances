import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { Cron } from 'croner'
import { toast } from 'sonner'
import { ResponsiveDialog } from '#/components/ui/responsive-dialog'
import { RecurringForm } from '#/components/reccuring/form'
import type { RuleFormValues } from '#/components/reccuring/form'
import { CRON_PRESETS } from '#/components/reccuring/constants'
import {
  fetchRuleById,
  updateRecurringRule,
} from '#/components/reccuring/actions'

const recurringRoute = getRouteApi('/recurring')

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring/$id/edit')({
  loader: ({ params }) => fetchRuleById({ data: params.id }),
  component: EditRulePage,
})

// ─── Component ────────────────────────────────────────────────────────────────

function EditRulePage() {
  const router = useRouter()
  const { rule } = Route.useLoaderData()
  const { id } = Route.useParams()
  const { categories, accounts, counterparties } =
    recurringRoute.useLoaderData()

  const handleClose = () => router.navigate({ to: '/recurring' })

  const initialPreset = CRON_PRESETS.some(
    (p) => p.value === rule.cronExpression && p.value !== 'custom',
  )
    ? rule.cronExpression
    : 'custom'

  const defaultValues: RuleFormValues = {
    type: rule.type as 'payable' | 'receivable',
    amount: Number(rule.amount).toString(),
    description: rule.description,
    categoryId: rule.categoryId,
    counterpartyId: rule.counterpartyId ?? '',
    currentAccountId: rule.currentAccountId,
    cronPreset: initialPreset,
    cronCustom: rule.cronExpression,
    dueDaysFromCreation: rule.dueDaysFromCreation
      ? String(rule.dueDaysFromCreation)
      : '',
    paymentAccountId: rule.paymentAccountId ?? '',
    paymentCategoryId: rule.paymentCategoryId ?? '',
  }

  const handleSubmit = async (value: RuleFormValues) => {
    const cronExpression =
      value.cronPreset === 'custom' ? value.cronCustom : value.cronPreset

    new Cron(cronExpression, { paused: true })

    await updateRecurringRule({
      data: {
        id,
        type: value.type,
        amount: +value.amount,
        description: value.description,
        categoryId: value.categoryId,
        counterpartyId: value.counterpartyId ?? '',
        currentAccountId: value.currentAccountId,
        cronExpression,
        dueDaysFromCreation:
          value.dueDaysFromCreation.trim() !== '' &&
          !isNaN(+value.dueDaysFromCreation) &&
          +value.dueDaysFromCreation > 0
            ? +value.dueDaysFromCreation
            : null,
        paymentAccountId: value.paymentAccountId || undefined,
        paymentCategoryId: value.paymentCategoryId || undefined,
      },
    })
    toast.success('Правило обновлено')
    await router.invalidate()
    handleClose()
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Редактировать правило"
      description="Запись будет создаваться автоматически по расписанию. Срок оплаты рассчитывается от даты создания."
    >
      <RecurringForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        categories={categories}
        accounts={accounts}
        counterparties={counterparties}
        isEdit={true}
        onClose={handleClose}
      />
    </ResponsiveDialog>
  )
}
