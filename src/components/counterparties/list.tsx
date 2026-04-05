import { useMemo, useState } from 'react'
import { Pencil, Search, User, UserCheck, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '../ui/item'

import { EditCounterpartyForm } from './form'
import { DeleteCounterparty } from './delete'

import { fetchCounterparties, counterpartiesQueryKey } from './actions'
import type { Counterparty } from '#/types'

function CounterpartyRow({
  counterparty,
  editingId,
  setEditingId,
}: {
  counterparty: Counterparty
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const isEditing = editingId === counterparty.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <User className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>{counterparty.name}</ItemTitle>
          {counterparty.linkedUser && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <UserCheck className="size-3 shrink-0 text-green-500" />
              <span className="truncate">
                <span className="text-muted-foreground/60 ml-1">
                  ({counterparty.linkedUser.email})
                </span>
              </span>
            </p>
          )}
        </ItemContent>

        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : counterparty.id)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteCounterparty counterpartyId={counterparty.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="border border-t-0 rounded-b-md px-4 pb-4 -mt-0.5 bg-muted/30">
          <EditCounterpartyForm
            counterparty={counterparty}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  )
}

export const CounterpartiesList = () => {
  const { data: counterparties = [] } = useQuery({
    queryKey: counterpartiesQueryKey,
    queryFn: () => fetchCounterparties(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredCounterparties = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return counterparties
    }

    return counterparties.filter((counterparty) => {
      const haystack = [
        counterparty.name,
        counterparty.fullName ?? '',
        counterparty.tin ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [counterparties, search])

  return (
    <>
      <div className="px-6 py-3 shrink-0">
        <p className="text-sm font-medium text-muted-foreground">
          Все контрагенты ({counterparties.length})
        </p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию или ИНН"
            className="pr-9 pl-9"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
              onClick={() => setSearch('')}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {counterparties.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Нет добавленных контрагентов
          </p>
        ) : filteredCounterparties.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Ничего не найдено
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredCounterparties.map((c) => (
              <CounterpartyRow
                key={c.id}
                counterparty={c}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
