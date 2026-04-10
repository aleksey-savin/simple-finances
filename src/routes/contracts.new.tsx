import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddContractForm } from '@/components/contracts'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/contracts/new')({
  component: NewContractPage,
})

function NewContractPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/contracts' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новый договор"
      description="Заполните номер, дату, тип, контрагента и суммы договора."
    >
      <AddContractForm />
    </ResponsiveDialog>
  )
}
