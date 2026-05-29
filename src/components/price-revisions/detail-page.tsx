import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { formatLongDate } from '@/lib/format'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { DataTable } from '#/components/ui/data-table'
import type { PriceRevisionDetail } from '@/types'
import type { PriceRevisionItemStatus } from '@/db/types'
import { PriceRevisionSummaryCards } from './summary-cards'
import { RevisionBulkActions, RevisionFilters } from './revision-toolbar'
import { buildRevisionColumns } from './columns'
import { AddContractDialog } from './add-contract-dialog'
import {
  applyBulkAdjustment,
  completeRevision,
  reopenRevision,
  revertRevisionToDraft,
  startRevision,
  undoBulkAdjustment,
  priceRevisionQueryKey,
} from './actions'
import {
  REVISION_STATUS_LABELS,
  getRevisionStatus,
  getRevisionStatusVariant,
  hasManualEdits,
} from './utils'

export function PriceRevisionDetailPage({
  revision,
}: {
  revision: PriceRevisionDetail
}) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterStatus, setFilterStatus] = useState<
    PriceRevisionItemStatus | 'all'
  >('all')
  const [filterManagerId, setFilterManagerId] = useState<string>('all')

  const status = getRevisionStatus(revision)
  const isEditable = status !== 'completed'
  const includedItems = revision.items.filter((i) => i.included)
  const canComplete =
    status === 'in_progress' &&
    includedItems.length > 0 &&
    includedItems.every((i) => i.status === 'success')
  const columns = buildRevisionColumns(revision.id, !isEditable)
  const manualEditsPresent = hasManualEdits(revision.items)

  const allManagers = [
    ...new Map(
      revision.items.flatMap((i) => i.managers).map((m) => [m.userId, m]),
    ).values(),
  ]

  const filteredItems = useMemo(() => {
    const q = globalFilter.trim().toLowerCase()
    return revision.items.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (
        filterManagerId !== 'all' &&
        !item.managers.some((m) => m.userId === filterManagerId)
      )
        return false
      if (q) {
        const haystack = [
          item.contract.name,
          item.contract.number ?? '',
          item.contract.counterparty.name,
          item.contract.counterparty.client?.name ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [revision.items, globalFilter, filterStatus, filterManagerId])

  async function handleApplyAdjustment(
    mode: 'percent' | 'fixed' | 'reset',
    value?: string,
  ) {
    await applyBulkAdjustment({
      data: { revisionId: revision.id, mode, value },
    })
    queryClient.invalidateQueries({
      queryKey: priceRevisionQueryKey(revision.id),
    })
  }

  async function handleUndo() {
    setIsPending(true)
    try {
      await undoBulkAdjustment({ data: { revisionId: revision.id } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revision.id),
      })
      toast.success('Последнее изменение отменено')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  async function handleStart() {
    setIsPending(true)
    try {
      await startRevision({ data: { id: revision.id } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revision.id),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  async function handleRevertToDraft() {
    setIsPending(true)
    try {
      await revertRevisionToDraft({ data: { id: revision.id } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revision.id),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  async function handleToggleComplete() {
    setIsPending(true)
    try {
      if (status === 'completed') {
        await reopenRevision({ data: { id: revision.id } })
      } else {
        await completeRevision({ data: { id: revision.id } })
      }
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revision.id),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  const statusBadgeVariant = getRevisionStatusVariant(status)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary">{revision.businessLine.name}</Badge>
        <Badge variant={statusBadgeVariant}>
          {REVISION_STATUS_LABELS[status]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatLongDate(revision.createdAt)}
        </span>
        {status === 'completed' && revision.completedAt && (
          <span className="text-sm text-muted-foreground">
            завершена {formatLongDate(revision.completedAt)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              disabled={isPending}
            >
              <Plus className="mr-1 size-4" />
              Добавить договор
            </Button>
          )}

          {status === 'draft' && (
            <Button
              variant="default"
              size="sm"
              disabled={isPending}
              onClick={handleStart}
            >
              Взять в работу
            </Button>
          )}

          {status === 'in_progress' && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleRevertToDraft}
              >
                Вернуть в черновик
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={isPending || !canComplete}
                onClick={handleToggleComplete}
              >
                Завершить ревизию
              </Button>
            </>
          )}

          {status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleToggleComplete}
            >
              Открыть повторно
            </Button>
          )}
        </div>
      </div>

      <Card className="min-w-0 p-4">
        <RevisionFilters
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          allManagers={allManagers}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          filterManagerId={filterManagerId}
          onFilterManagerId={setFilterManagerId}
        />
      </Card>

      <Card className="min-w-0 flex flex-col gap-4 p-4">
        {isEditable && (
          <RevisionBulkActions
            onApplyAdjustment={handleApplyAdjustment}
            hasManualEdits={manualEditsPresent}
            undoSnapshot={revision.bulkSnapshot}
            onUndo={handleUndo}
            isUndoPending={isPending}
          />
        )}
        <PriceRevisionSummaryCards items={filteredItems} />
      </Card>

      <DataTable columns={columns} data={filteredItems} pagination={false} />

      <AddContractDialog
        revisionId={revision.id}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />
    </div>
  )
}
