import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddCompanyForm } from '@/components/companies'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/companies/new')({
  component: NewCompanyPage,
})

function NewCompanyPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/companies' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новая компания"
      description="Объедините счета в компанию для отчетности и dashboard."
    >
      <AddCompanyForm />
    </ResponsiveDialog>
  )
}
