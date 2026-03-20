import { Trash2 } from 'lucide-react'

import { useRouter } from '@tanstack/react-router'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { deleteCounterparty } from './actions'

export const DeleteCounterparty = ({
  counterpartyId,
}: {
  counterpartyId: string
}) => {
  const router = useRouter()

  const handleDelete = async () => {
    try {
      await deleteCounterparty({ data: { id: counterpartyId } })
      await router.invalidate()
      toast.success('Получатель удалён')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
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
