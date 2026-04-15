import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { deletePriceRevision, priceRevisionsQueryKey } from './actions'

export function DeletePriceRevision({ entityId }: { entityId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    setIsPending(true)
    try {
      await deletePriceRevision({ data: { id: entityId } })
      await router.invalidate()
      queryClient.invalidateQueries({ queryKey: priceRevisionsQueryKey })
      toast.success('Ревизия удалена')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-destructive hover:text-destructive"
      disabled={isPending}
      onClick={handleDelete}
      title="Удалить ревизию"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
