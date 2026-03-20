import { useState } from 'react'
import { Pencil, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '../ui/item'

import { EditCounterpartyForm } from './form'
import { DeleteCounterparty } from './delete'

import { selectCounterparties, useAppStore } from '#/store/app-store'
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
  const counterparties = useAppStore(selectCounterparties)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <>
      <div className="px-6 py-3 shrink-0">
        <p className="text-sm font-medium text-muted-foreground">
          Все контрагенты ({counterparties.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {counterparties.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Нет добавленных контрагентов
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {counterparties.map((c) => (
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
