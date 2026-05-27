import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import {
  addContractsToRevision,
  fetchAvailableContractsForRevision,
  priceRevisionQueryKey,
} from './actions'

export function AddContractDialog({
  revisionId,
  open,
  onOpenChange,
}: {
  revisionId: string
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['price-revisions', revisionId, 'available-contracts'],
    queryFn: () => fetchAvailableContractsForRevision({ data: { revisionId } }),
    enabled: open,
  })

  const filtered = useMemo(() => {
    if (!contracts) return []
    const q = query.trim().toLowerCase()
    if (!q) return contracts
    return contracts.filter((c) =>
      [c.name, c.number ?? '', c.counterpartyName]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [contracts, query])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function reset() {
    setQuery('')
    setSelected(new Set())
  }

  async function handleSubmit() {
    if (selected.size === 0) return
    setIsSubmitting(true)
    try {
      await addContractsToRevision({
        data: { revisionId, contractIds: [...selected] },
      })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revisionId),
      })
      queryClient.invalidateQueries({
        queryKey: ['price-revisions', revisionId, 'available-contracts'],
      })
      toast.success(`Добавлено: ${selected.size}`)
      reset()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось добавить')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить договор в ревизию</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по договору, контрагенту..."
              className="h-9 pl-8 text-sm"
            />
          </div>

          <div className="max-h-80 overflow-y-auto border bg-background">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Загрузка...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {contracts && contracts.length === 0
                  ? 'Все договоры уже добавлены'
                  : 'Ничего не найдено'}
              </div>
            ) : (
              <div className="flex flex-col">
                {filtered.map((c) => {
                  const isSelected = selected.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        'flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'bg-accent/60',
                      )}
                    >
                      <Check
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">
                          {c.name}
                          {c.number ? ` №${c.number}` : ''}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {c.counterpartyName}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Добавить
            {selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
