import { Trash2 } from 'lucide-react'

import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { removeCounterpartyFromScope, counterpartiesQueryKey } from './actions'

export const DeleteCounterparty = ({
  counterpartyId,
}: {
  counterpartyId: string
}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    try {
      await removeCounterpartyFromScope({ data: { counterpartyId } })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey })
      toast.success('Контрагент удалён из списка')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-destructive hover:text-destructive"
      title="Удалить из списка"
      onClick={handleDelete}
    >
      <Trash2 className="size-3.5" />
    </Button>
  )
}
