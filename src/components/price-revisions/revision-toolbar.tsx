import { useState } from 'react'
import type { Table as ReactTable } from '@tanstack/react-table'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { PriceRevisionItemRow, PriceRevisionItemStatus } from '@/types'

type AdjustmentMode = 'percent' | 'fixed'

const STATUS_LABELS: Record<PriceRevisionItemStatus, string> = {
  draft: 'Черновик',
  notified: 'Уведомлён',
  agreed: 'Согласован',
  signed: 'Подписан',
  success: 'Завершён',
}

export function RevisionToolbar({
  table,
  isCompleted,
  onApplyAdjustment,
  allManagers,
  filterStatus,
  onFilterStatus,
  filterManagerId,
  onFilterManagerId,
  filterIncluded,
  onFilterIncluded,
}: {
  table: ReactTable<PriceRevisionItemRow>
  isCompleted: boolean
  onApplyAdjustment: (
    mode: 'percent' | 'fixed' | 'reset',
    value?: string,
  ) => Promise<void>
  allManagers: { userId: string; name: string }[]
  filterStatus: PriceRevisionItemStatus | 'all'
  onFilterStatus: (v: PriceRevisionItemStatus | 'all') => void
  filterManagerId: string
  onFilterManagerId: (v: string) => void
  filterIncluded: 'all' | 'included' | 'excluded'
  onFilterIncluded: (v: 'all' | 'included' | 'excluded') => void
}) {
  const [mode, setMode] = useState<AdjustmentMode>('percent')
  const [adjValue, setAdjValue] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function handleApply() {
    if (!adjValue.trim()) {
      toast.error('Введите значение')
      return
    }
    const num = Number(adjValue.replace(',', '.'))
    if (isNaN(num)) {
      toast.error('Введите число')
      return
    }
    setIsPending(true)
    try {
      await onApplyAdjustment(mode, String(num))
      toast.success('Предложенные суммы обновлены')
    } finally {
      setIsPending(false)
    }
  }

  async function handleReset() {
    setIsPending(true)
    try {
      await onApplyAdjustment('reset')
      toast.success('Предложенные суммы сброшены')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Поиск по договору, контрагенту..."
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
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
              Object.entries(STATUS_LABELS) as [
                PriceRevisionItemStatus,
                string,
              ][]
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

        <Select
          value={filterIncluded}
          onValueChange={(v) =>
            onFilterIncluded(v as 'all' | 'included' | 'excluded')
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="included">Включённые</SelectItem>
            <SelectItem value="excluded">Исключённые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as AdjustmentMode)}
          >
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

          <Button onClick={handleApply} disabled={isPending} variant="default">
            Применить ко всем включённым
          </Button>

          <Button onClick={handleReset} disabled={isPending} variant="outline">
            Сбросить суммы
          </Button>
        </div>
      )}
    </div>
  )
}
