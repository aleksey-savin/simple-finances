import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { DataTable } from '#/components/ui/data-table'
import type { PriceRevisionDetail } from '@/types'
import { PriceRevisionSummaryCards } from './summary-cards'
import { RevisionToolbar } from './revision-toolbar'
import { buildRevisionColumns } from './columns'
import {
  applyBulkAdjustment,
  completeRevision,
  reopenRevision,
  priceRevisionQueryKey,
} from './actions'

export function PriceRevisionDetailPage({
  revision,
}: {
  revision: PriceRevisionDetail
}) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const isCompleted = !!revision.completedAt
  const includedItems = revision.items.filter((i) => i.included)
  const canComplete =
    !isCompleted &&
    includedItems.length > 0 &&
    includedItems.every((i) => i.status === 'success')
  const columns = buildRevisionColumns(revision.id, isCompleted)

  async function handleApplyAdjustment(
    mode: 'percent' | 'fixed' | 'reset',
    value?: string,
  ) {
    await applyBulkAdjustment({
      data: { revisionId: revision.id, mode, value },
    })
    queryClient.invalidateQueries({ queryKey: priceRevisionQueryKey(revision.id) })
  }

  async function handleToggleComplete() {
    setIsPending(true)
    try {
      if (isCompleted) {
        await reopenRevision({ data: { id: revision.id } })
      } else {
        await completeRevision({ data: { id: revision.id } })
      }
      queryClient.invalidateQueries({ queryKey: priceRevisionQueryKey(revision.id) })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary">{revision.businessLine.name}</Badge>
        <span className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }).format(new Date(revision.createdAt))}
        </span>
        {isCompleted && (
          <Badge variant="success">
            Завершена{' '}
            {new Intl.DateTimeFormat('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }).format(new Date(revision.completedAt!))}
          </Badge>
        )}
        <div className="ml-auto">
          <Button
            variant={isCompleted ? 'outline' : 'success'}
            size="sm"
            disabled={isPending || (!isCompleted && !canComplete)}
            onClick={handleToggleComplete}
          >
            {isCompleted ? 'Открыть повторно' : 'Завершить ревизию'}
          </Button>
        </div>
      </div>

      <PriceRevisionSummaryCards items={revision.items} />

      <DataTable
        columns={columns}
        data={revision.items}
        pagination={false}
        toolbar={
          isCompleted
            ? undefined
            : (table) => (
                <RevisionToolbar
                  table={table}
                  onApplyAdjustment={handleApplyAdjustment}
                />
              )
        }
      />
    </div>
  )
}
