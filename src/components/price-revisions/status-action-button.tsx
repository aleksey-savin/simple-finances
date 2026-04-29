import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import type { PriceRevisionItemStatus } from '@/types'
import {
  advanceRevisionItemStatus,
  revertRevisionItemStatus,
  priceRevisionQueryKey,
} from './actions'

type TargetStatus = 'notified' | 'agreed' | 'signed' | 'success'

const NEXT_ACTIONS: Partial<
  Record<PriceRevisionItemStatus, { label: string; status: TargetStatus }[]>
> = {
  draft: [{ label: 'Согласовано', status: 'agreed' }],
  agreed: [{ label: 'Документы отправлены', status: 'notified' }],
  notified: [{ label: 'Документы подписаны', status: 'signed' }],
  signed: [{ label: 'Завершить', status: 'success' }],
}

export function RevisionItemStatusActionButton({
  itemId,
  status,
  revisionId,
}: {
  itemId: string
  status: PriceRevisionItemStatus
  revisionId: string
}) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const nextActions = NEXT_ACTIONS[status]

  async function handleAdvance(targetStatus: TargetStatus) {
    setIsPending(true)
    try {
      await advanceRevisionItemStatus({ data: { id: itemId, targetStatus } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revisionId),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  async function handleRevert() {
    setIsPending(true)
    try {
      await revertRevisionItemStatus({ data: { id: itemId } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revisionId),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      {nextActions?.map((action) => (
        <Button
          key={action.status}
          size="sm"
          disabled={isPending}
          onClick={() => handleAdvance(action.status)}
        >
          {action.label}
        </Button>
      ))}
      {status !== 'draft' && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={handleRevert}
          title="Отменить последний шаг"
        >
          <Undo2 className="size-4" />
        </Button>
      )}
    </div>
  )
}
