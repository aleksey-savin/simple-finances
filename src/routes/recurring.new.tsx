import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { Cron } from 'croner'
import { toast } from 'sonner'

import { ResponsiveDialog } from '#/components/ui/responsive-dialog'
import { RecurringForm } from '#/components/reccuring/form'
import type { RuleFormValues } from '#/components/reccuring/form'
import { createRecurringRule } from '#/components/reccuring/actions'

const recurringRoute = getRouteApi('/recurring')

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring/new')({
  component: NewRulePage,
})

// ─── Component ────────────────────────────────────────────────────────────────

function NewRulePage() {
  const router = useRouter()
  const { categories, accounts, counterparties } =
    recurringRoute.useLoaderData()

  const handleClose = () => router.navigate({ to: '/recurring' })

  const defaultValues: RuleFormValues = {
    type: 'payable',
    amount: '',
    description: '',
    categoryId: '',
    counterpartyId: '',
    currentAccountId: '',
    cronPreset: '0 9 1 * *',
    cronCustom: '',
    dueDaysFromCreation: '',
    paymentAccountId: '',
    paymentCategoryId: '',
  }

  const handleSubmit = async (value: RuleFormValues) => {
    const cronExpression =
      value.cronPreset === 'custom' ? value.cronCustom : value.cronPreset

    new Cron(cronExpression, { paused: true })

    await createRecurringRule({
      data: {
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
    toast.success('Правило создано')
    await router.invalidate()
    handleClose()
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Новое правило"
      description="Запись будет создаваться автоматически по расписанию. Срок оплаты рассчитывается от даты создания."
    >
      <RecurringForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        categories={categories}
        accounts={accounts}
        counterparties={counterparties}
        isEdit={false}
        onClose={handleClose}
      />
    </ResponsiveDialog>
  )
}
