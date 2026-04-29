import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Textarea } from '#/components/ui/textarea'
import { updateRevisionItem, priceRevisionQueryKey } from './actions'

export function RevisionItemNotesCell({
  itemId,
  revisionId,
  notes,
  readOnly = false,
}: {
  itemId: string
  revisionId: string
  notes: string | null
  readOnly?: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(notes ?? '')
  const [isPending, setIsPending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function startEditing() {
    if (readOnly || isPending) return
    setValue(notes ?? '')
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  async function commit() {
    setEditing(false)
    if (value === (notes ?? '')) return

    setIsPending(true)
    try {
      await updateRevisionItem({
        data: { id: itemId, notes: value },
      })
      await queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revisionId),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  if (editing) {
    return (
      <Textarea
        ref={textareaRef}
        className="min-h-20 w-56 resize-y text-sm whitespace-pre-wrap break-words"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={`block max-w-56 text-left text-sm whitespace-pre-wrap break-words ${
        readOnly
          ? 'cursor-default'
          : 'cursor-pointer hover:text-primary hover:underline'
      } ${isPending ? 'opacity-50' : ''}`}
      onClick={startEditing}
      title={readOnly ? undefined : 'Нажмите, чтобы изменить'}
    >
      {notes?.trim() ? (
        notes
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </button>
  )
}
