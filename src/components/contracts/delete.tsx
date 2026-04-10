import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { businessLinesQueryKey } from '@/components/business-lines/actions'
import { Button } from '@/components/ui/button'
import { contractsQueryKey, deleteContract } from './actions'

export const DeleteContract = ({ entityId }: { entityId: string }) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    try {
      await deleteContract({ data: { id: entityId } })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: contractsQueryKey })
      await queryClient.invalidateQueries({
        queryKey: businessLinesQueryKey,
      })
      toast.success('Договор удалён')
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
