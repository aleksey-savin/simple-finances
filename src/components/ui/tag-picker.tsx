import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Tag, Plus, X, Check, Loader2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TagItem = {
  id: string
  name: string
  color: string
}

// ─── Color palette for new tags ────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#64748b', // slate
]

// ─── TagPicker ─────────────────────────────────────────────────────────────────

interface TagPickerProps {
  /** Tags currently attached to this row */
  assignedTags: TagItem[]
  /** All available tags in the system */
  allTags: TagItem[]
  onAdd: (tag: TagItem) => Promise<void>
  onRemove: (tag: TagItem) => Promise<void>
  onCreate: (name: string, color: string) => Promise<TagItem>
}

export function TagPicker({
  assignedTags,
  allTags,
  onAdd,
  onRemove,
  onCreate,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [isPending, startTransition] = useTransition()

  const assignedIds = new Set(assignedTags.map((t) => t.id))

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  const showCreate =
    search.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase())

  function handleAdd(t: TagItem) {
    startTransition(async () => {
      try {
        await onAdd(t)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка')
      }
    })
  }

  function handleRemove(t: TagItem) {
    startTransition(async () => {
      try {
        await onRemove(t)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка')
      }
    })
  }

  function handleCreate() {
    const name = search.trim()
    if (!name) return
    startTransition(async () => {
      try {
        const created = await onCreate(name, newColor)
        await onAdd(created)
        setSearch('')
        setCreating(false)
        setNewColor(PALETTE[0])
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка')
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground shrink-0"
          title="Теги"
        >
          <Tag className="size-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3" align="end">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Теги
        </p>

        {/* Assigned tags */}
        {assignedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {assignedTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100"
                  onClick={() => handleRemove(t)}
                  disabled={isPending}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search / new tag input */}
        <Input
          placeholder="Найти или создать тег…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCreating(false)
          }}
          className="h-8 text-sm mb-2"
          autoFocus
        />

        {/* Tag list */}
        <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
          {filtered.map((t) => {
            const isAssigned = assignedIds.has(t.id)
            return (
              <button
                key={t.id}
                type="button"
                disabled={isPending}
                onClick={() => (isAssigned ? handleRemove(t) : handleAdd(t))}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1 text-sm text-left transition-colors',
                  'hover:bg-muted',
                  isAssigned && 'font-medium',
                )}
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="flex-1 truncate">{t.name}</span>
                {isAssigned && (
                  <Check className="size-3.5 shrink-0 text-primary" />
                )}
              </button>
            )
          })}

          {filtered.length === 0 && !showCreate && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Теги не найдены
            </p>
          )}
        </div>

        {/* Create new tag */}
        {showCreate && (
          <div className="mt-2 border-t pt-2">
            {!creating ? (
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
                onClick={() => setCreating(true)}
              >
                <Plus className="size-3.5" />
                Создать «{search.trim()}»
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Выберите цвет:</p>
                <div className="flex flex-wrap gap-1">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        'size-5 rounded-full border-2 transition-transform hover:scale-110',
                        newColor === c
                          ? 'border-foreground scale-110'
                          : 'border-transparent',
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={handleCreate}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      'Создать'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setCreating(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Inline tag chips (read-only display in table cell) ────────────────────────

export function TagChips({ tags }: { tags: TagItem[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {tags.map((t) => (
        <Badge
          key={t.id}
          className="px-1.5 py-0 text-[10px] font-medium text-white border-0 h-4"
          style={{ backgroundColor: t.color }}
        >
          {t.name}
        </Badge>
      ))}
    </div>
  )
}
