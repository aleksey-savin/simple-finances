import { useState } from 'react'
import { Undo2 } from 'lucide-react'
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
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { PriceRevisionItemStatus } from '@/types'

type AdjustmentMode = 'percent' | 'fixed'

const STATUS_LABELS: Record<PriceRevisionItemStatus, string> = {
  draft: 'Черновик',
  agreed: 'Согласовано',
  notified: 'Документы отправлены',
  signed: 'Документы подписаны',
  success: 'Завершён',
}

type PendingConfirm =
  | { kind: 'apply'; mode: AdjustmentMode; value: string }
  | { kind: 'reset' }
  | { kind: 'undo'; label: string }
  | null

export function RevisionFilters({
  globalFilter,
  onGlobalFilterChange,
  allManagers,
  filterStatus,
  onFilterStatus,
  filterManagerId,
  onFilterManagerId,
}: {
  globalFilter: string
  onGlobalFilterChange: (v: string) => void
  allManagers: { userId: string; name: string }[]
  filterStatus: PriceRevisionItemStatus | 'all'
  onFilterStatus: (v: PriceRevisionItemStatus | 'all') => void
  filterManagerId: string
  onFilterManagerId: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Поиск по договору, контрагенту..."
        value={globalFilter}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        className="max-w-xs"
      />

      <Select
        value={filterStatus}
        onValueChange={(v) =>
          onFilterStatus(v as PriceRevisionItemStatus | 'all')
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {(
            Object.entries(STATUS_LABELS) as [PriceRevisionItemStatus, string][]
          ).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allManagers.length > 0 && (
        <Select value={filterManagerId} onValueChange={onFilterManagerId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Менеджер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все менеджеры</SelectItem>
            {allManagers.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function RevisionBulkActions({
  onApplyAdjustment,
  hasManualEdits,
  undoSnapshot,
  onUndo,
  isUndoPending,
}: {
  onApplyAdjustment: (
    mode: 'percent' | 'fixed' | 'reset',
    value?: string,
  ) => Promise<void>
  hasManualEdits: boolean
  undoSnapshot: { actionLabel: string } | null
  onUndo: () => void | Promise<void>
  isUndoPending: boolean
}) {
  const [mode, setMode] = useState<AdjustmentMode>('percent')
  const [adjValue, setAdjValue] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null)

  async function runApply(m: AdjustmentMode, value: string) {
    setIsPending(true)
    try {
      await onApplyAdjustment(m, value)
      toast.success('Предложенные суммы обновлены')
    } finally {
      setIsPending(false)
    }
  }

  async function runReset() {
    setIsPending(true)
    try {
      await onApplyAdjustment('reset')
      toast.success('Предложенные суммы сброшены')
    } finally {
      setIsPending(false)
    }
  }

  function handleApplyClick() {
    if (!adjValue.trim()) {
      toast.error('Введите значение')
      return
    }
    const num = Number(adjValue.replace(',', '.'))
    if (isNaN(num)) {
      toast.error('Введите число')
      return
    }
    if (hasManualEdits) {
      setPendingConfirm({ kind: 'apply', mode, value: String(num) })
      return
    }
    void runApply(mode, String(num))
  }

  function handleResetClick() {
    if (hasManualEdits) {
      setPendingConfirm({ kind: 'reset' })
      return
    }
    void runReset()
  }

  async function handleConfirm() {
    if (!pendingConfirm) return
    const c = pendingConfirm
    setPendingConfirm(null)
    if (c.kind === 'apply') {
      await runApply(c.mode, c.value)
    } else if (c.kind === 'reset') {
      await runReset()
    } else {
      await onUndo()
    }
  }

  function dialogConfig(c: NonNullable<PendingConfirm>): {
    title: string
    description: string
  } {
    if (c.kind === 'reset')
      return {
        title: 'Сбросить все предложенные суммы?',
        description:
          'Есть ручные изменения предложенных сумм. Они будут сброшены. Это действие можно будет отменить кнопкой «Отменить».',
      }
    if (c.kind === 'undo')
      return {
        title: `Отменить «${c.label}»?`,
        description:
          'Предложенные суммы будут возвращены к состоянию до последнего массового изменения.',
      }
    return {
      title: 'Применить массовое изменение?',
      description:
        'Есть ручные изменения предложенных сумм. Они будут перезаписаны. Это действие можно будет отменить кнопкой «Отменить».',
    }
  }

  const activeDialog = pendingConfirm ? dialogConfig(pendingConfirm) : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={mode} onValueChange={(v) => setMode(v as AdjustmentMode)}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="percent">%</SelectItem>
          <SelectItem value="fixed">фикс. ₽</SelectItem>
        </SelectContent>
      </Select>

      <Input
        className="w-28"
        value={adjValue}
        onChange={(e) => setAdjValue(e.target.value)}
        placeholder={mode === 'percent' ? '10' : '5000'}
        inputMode="numeric"
        disabled={isPending}
      />

      <Button onClick={handleApplyClick} disabled={isPending} variant="default">
        Применить ко всем включённым
      </Button>

      <Button onClick={handleResetClick} disabled={isPending} variant="outline">
        Сбросить суммы
      </Button>

      {undoSnapshot && (
        <Button
          onClick={() =>
            setPendingConfirm({
              kind: 'undo',
              label: undoSnapshot.actionLabel,
            })
          }
          disabled={isPending || isUndoPending}
          variant="outline"
          title={`Отменить: ${undoSnapshot.actionLabel}`}
        >
          <Undo2 className="mr-1 size-4" />
          Отменить ({undoSnapshot.actionLabel})
        </Button>
      )}

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(o) => {
          if (!o) setPendingConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{activeDialog?.title ?? ''}</AlertDialogTitle>
            <AlertDialogDescription>
              {activeDialog?.description ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant={
                pendingConfirm?.kind === 'reset' ? 'destructive' : 'default'
              }
              onClick={handleConfirm}
            >
              Продолжить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
