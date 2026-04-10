import { createFileRoute, useRouter } from '@tanstack/react-router'

import { AddCategoryForm } from '@/components/categories'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

export const Route = createFileRoute('/categories/new')({
  component: NewCategoryPage,
})

function NewCategoryPage() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/categories' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новая категория"
      description="Создайте категорию для операций дохода и расхода."
    >
      <AddCategoryForm />
    </ResponsiveDialog>
  )
}
