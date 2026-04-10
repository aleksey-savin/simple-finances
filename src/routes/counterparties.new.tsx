import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddCounterpartyForm } from '@/components/counterparties/form'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/counterparties/new')({
  component: NewCounterpartyPage,
})

function NewCounterpartyPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/counterparties' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новый контрагент"
      description="Создайте контрагента и при необходимости привяжите пользователя."
    >
      <AddCounterpartyForm />
    </ResponsiveDialog>
  )
}
