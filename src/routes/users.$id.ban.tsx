import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from 'utils/auth-client'
import { useState } from 'react'
import { toast } from 'sonner'

import { fetchUser } from '@/components/users/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/users/$id/ban')({
  loader: ({ params }) => fetchUser({ data: params.id }),
  component: RouteComponent,
})

function RouteComponent() {
  const user = Route.useLoaderData()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = () => {
    router.navigate({ to: '/users' })
  }

  const handleConfirm = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      await authClient.admin.banUser(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success(`${user.name} заблокирован`)
            router.invalidate()
            router.navigate({ to: '/users' })
          },
          onError: (ctx) => {
            toast.error(ctx.error.message)
          },
        },
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Заблокировать пользователя?</AlertDialogTitle>
          <AlertDialogDescription>
            Пользователь «{user?.name}» будет заблокирован и не сможет войти в
            систему.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={handleClose}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isLoading ? 'Загрузка...' : 'Заблокировать'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
