import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddBusinessLineForm } from '@/components/business-lines'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/business-lines/new')({
  component: NewBusinessLinePage,
})

function NewBusinessLinePage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/business-lines' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новое направление"
      description="Создайте бизнес-направление для связки с договорами."
    >
      <AddBusinessLineForm onDone={handleClose} />
    </ResponsiveDialog>
  )
}
