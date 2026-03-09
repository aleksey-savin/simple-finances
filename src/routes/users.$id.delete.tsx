import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { authClient } from 'utils/auth-client'
import { useState } from 'react'
import { toast } from 'sonner'

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

const fetchUser = createServerFn()
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const request = getRequest()
    const data = await auth.api.getUser({
      query: { id: userId },
      headers: request.headers,
    })
    return data
  })

export const Route = createFileRoute('/users/$id/delete')({
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
      await authClient.admin.removeUser(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success(`${user.name} удалён`)
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
          <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
          <AlertDialogDescription>
            Пользователь «{user?.name}» будет удалён без возможности
            восстановления. Это действие необратимо.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={handleClose}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isLoading ? 'Удаление...' : 'Удалить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
