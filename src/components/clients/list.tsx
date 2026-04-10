import { useState } from 'react'
import { Pencil, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { DeleteClient } from './delete'
import { clientsQueryKey, fetchClients } from './actions'
import { EditClientForm } from './form'

function ClientRow({
  client,
  editingId,
  setEditingId,
}: {
  client: Client
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const isEditing = editingId === client.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <User className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>{client.name}</ItemTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {client.counterparties.length > 0
              ? client.counterparties.map((item) => item.name).join(', ')
              : 'Контрагенты не выбраны'}
          </p>
        </ItemContent>

        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : client.id)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteClient clientId={client.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="-mt-0.5 rounded-b-md border border-t-0 bg-muted/30 px-4 pb-4">
          <EditClientForm client={client} onDone={() => setEditingId(null)} />
        </div>
      )}
    </div>
  )
}

export const ClientsList = () => {
  const { data: clients = [] } = useQuery({
    queryKey: clientsQueryKey,
    queryFn: () => fetchClients(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">
          Все клиенты ({clients.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {clients.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Нет добавленных клиентов
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
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
