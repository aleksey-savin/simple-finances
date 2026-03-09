import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'

import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import UserForm from '@/components/user-form'

const fetchUser = createServerFn()
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const request = getRequest()
    const [authUser] = await Promise.all([
      auth.api.getUser({ query: { id: userId }, headers: request.headers }),
    ])
    return authUser
  })

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
      title={user?.name ?? 'Изменить пользователя'}
      description="Редактирование параметров пользователя"
    >
      {user && <UserForm user={user} onSuccess={handleSuccess} />}
    </ResponsiveDialog>
  )
}
