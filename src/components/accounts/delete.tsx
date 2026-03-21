import { Trash2 } from 'lucide-react'

import { useRouter } from '@tanstack/react-router'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { useQueryClient } from '@tanstack/react-query'
import { deleteAccount, accountsQueryKey } from './actions'

export const DeleteAccount = ({ accountId }: { accountId: string }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const handleDelete = async () => {
    try {
      await deleteAccount({ data: { id: accountId } })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      toast.success('Счёт удалён')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-destructive hover:text-destructive"
        title="Удалить"
        onClick={handleDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </>
  )
}
