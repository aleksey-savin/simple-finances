import { createFileRoute, useRouter } from '@tanstack/react-router'

import { PriceRevisionForm } from '@/components/price-revisions/form'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/price-revisions/new')({
  component: NewPriceRevisionPage,
})

function NewPriceRevisionPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/price-revisions' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новая ревизия цен"
      description="Выберите бизнес-направление — все договоры по нему будут добавлены в ревизию."
    >
      <PriceRevisionForm onDone={handleClose} />
    </ResponsiveDialog>
  )
}
