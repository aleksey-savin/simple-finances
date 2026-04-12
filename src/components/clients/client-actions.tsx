import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'

import type { ClientDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clientsQueryKey } from './actions'
import { DeleteClient } from './delete'
import { EditClientForm } from './form'

export function ClientActions({ client }: { client: ClientDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  // EditClientForm expects the Client shape (id, name, companyId, createdBy, counterparties, managers)
  const clientForForm = {
    id: client.id,
    name: client.name,
    companyId: client.companyId,
    createdBy: client.createdBy,
    counterparties: client.counterparties.map((c) => ({ id: c.id, name: c.name })),
    managers: client.managers,
  }

  const handleEditDone = async () => {
    setEditOpen(false)
    await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
    await router.invalidate()
  }

  return (
    <>
      <Card className="flex flex-col gap-2 p-4">
        <p className="text-xs font-medium text-muted-foreground">Действия</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            Редактировать
          </Button>
          <DeleteClient
            clientId={client.id}
            onDeleted={() => router.navigate({ to: '/clients' })}
          />
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование клиента</DialogTitle>
            <DialogDescription>{client.name}</DialogDescription>
          </DialogHeader>
          <EditClientForm client={clientForForm} onDone={handleEditDone} />
        </DialogContent>
      </Dialog>
    </>
  )
}
