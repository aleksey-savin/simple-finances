import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddAccountForm } from '@/components/accounts'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/current-accounts/new')({
  component: NewCurrentAccountPage,
})

function NewCurrentAccountPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/current-accounts' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новый расчетный счет"
      description="Заполните данные счета и банка, реквизиты подтянутся по БИК."
    >
      <AddAccountForm />
    </ResponsiveDialog>
  )
}
