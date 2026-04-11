import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Input } from '#/components/ui/input'
import { formatCurrency } from './utils'
import { updateRevisionItem, priceRevisionQueryKey } from './actions'

function amountColorClass(current: string, proposed: string): string {
  const diff = Number(proposed) - Number(current)
  if (diff > 0) return 'text-success'
  if (diff < 0) return 'text-destructive'
  return ''
}

function AmountRow({
  index,
  currentAmount,
  proposedAmount,
  onCommit,
}: {
  index: number
  currentAmount: string
  proposedAmount: string
  onCommit: (index: number, value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(proposedAmount)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setValue(proposedAmount)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commit() {
    setEditing(false)
    const normalized = value.replace(',', '.')
    if (
      normalized === proposedAmount ||
      isNaN(Number(normalized)) ||
      Number(normalized) < 0
    )
      return
    await onCommit(index, Number(normalized).toFixed(2))
  }

  const colorClass = amountColorClass(currentAmount, proposedAmount)

  if (editing) {
    return (
      <Input
        ref={inputRef}
        className="h-6 w-28 text-right text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        inputMode="numeric"
      />
    )
  }

  return (
    <button
      type="button"
      className={`block text-left font-mono text-sm hover:underline cursor-pointer ${colorClass}`}
      onClick={startEditing}
      title="Нажмите, чтобы изменить"
    >
      {formatCurrency(Number(proposedAmount))}
    </button>
  )
}

export function ProposedAmountsCell({
  itemId,
  revisionId,
  currentAmounts,
  proposedAmounts,
}: {
  itemId: string
  revisionId: string
  currentAmounts: string[]
  proposedAmounts: string[]
}) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  async function handleCommit(index: number, newValue: string) {
    const updated = [...proposedAmounts]
    updated[index] = newValue
    setIsPending(true)
    try {
      await updateRevisionItem({
        data: { id: itemId, proposedAmounts: updated },
      })
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
    <div className={`flex flex-col gap-0.5 ${isPending ? 'opacity-50' : ''}`}>
      {proposedAmounts.map((proposed, i) => (
        <AmountRow
          key={i}
          index={i}
          currentAmount={currentAmounts[i] ?? '0'}
          proposedAmount={proposed}
          onCommit={handleCommit}
        />
      ))}
    </div>
  )
}
