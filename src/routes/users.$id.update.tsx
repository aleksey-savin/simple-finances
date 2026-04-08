import { createFileRoute, useRouter } from '@tanstack/react-router'

import { fetchUser } from '@/components/users/actions'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import UserForm from '@/components/user-form'

export const Route = createFileRoute('/users/$id/update')({
  loader: ({ params }) =>
    fetchUser({
      data: params.id,
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const user = Route.useLoaderData()
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
      title="Изменить пользователя"
      description="Редактирование параметров пользователя"
    >
      <UserForm user={user} onSuccess={handleSuccess} />
    </ResponsiveDialog>
  )
}
