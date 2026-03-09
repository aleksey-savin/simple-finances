import { createFileRoute, useRouter } from '@tanstack/react-router'

import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import UserForm from '@/components/user-form'

export const Route = createFileRoute('/users/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  const handleClose = () => {
    router.navigate({ to: '/users' })
  }

  const handleSuccess = () => {
    router.invalidate()
    router.navigate({ to: '/users' })
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="Новый пользователь"
      description="Создание нового пользователя"
    >
      <UserForm onSuccess={handleSuccess} />
    </ResponsiveDialog>
  )
}
