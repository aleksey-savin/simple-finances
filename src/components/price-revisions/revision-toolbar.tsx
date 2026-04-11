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
import type { PriceRevisionItemRow } from '@/types'

type AdjustmentMode = 'percent' | 'fixed'

export function RevisionToolbar({
  table,
  onApplyAdjustment,
}: {
  table: ReactTable<PriceRevisionItemRow>
  onApplyAdjustment: (
    mode: 'percent' | 'fixed' | 'reset',
    value?: string,
  ) => Promise<void>
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
      <Input
        placeholder="Поиск по договору, контрагенту..."
        value={(table.getState().globalFilter as string) ?? ''}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

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
    </div>
  )
}
