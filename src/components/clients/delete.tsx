import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { clientsQueryKey, deleteClient } from './actions'

export const DeleteClient = ({
  clientId,
  onDeleted,
}: {
  clientId: string
  onDeleted?: () => void
}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    try {
      await deleteClient({ data: { id: clientId } })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
      toast.success('Клиент удалён')
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-destructive hover:text-destructive"
      title="Удалить"
      onClick={handleDelete}
    >
      <Trash2 className="size-3.5" />
    </Button>
  )
}
