import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddClientForm } from '@/components/clients'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/clients/new')({
  component: NewClientPage,
})

function NewClientPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/clients' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новый клиент"
      description="Привяжите к клиенту одного или нескольких контрагентов."
    >
      <AddClientForm />
    </ResponsiveDialog>
  )
}
