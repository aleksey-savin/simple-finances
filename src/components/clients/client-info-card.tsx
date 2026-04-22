import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Users } from 'lucide-react'

import type { ClientDetail } from '@/types'
import { Badge } from '@/components/ui/badge'
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

export function ClientInfoCard({ client }: { client: ClientDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const clientForForm = {
    id: client.id,
    name: client.name,
    companyId: client.companyId,
    createdBy: client.createdBy,
    counterparties: client.counterparties.map((c) => ({
      id: c.id,
      name: c.name,
    })),
    managers: client.managers,
    contacts: client.contacts,
    blockedServicesCount: client.blockedServices.length,
  }

  const handleEditDone = async () => {
    setEditOpen(false)
    await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
    await router.invalidate()
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Клиент</p>
            <h2 className="mt-0.5 text-xl font-semibold">{client.name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <DeleteClient
              clientId={client.id}
              onDeleted={() => router.navigate({ to: '/clients' })}
            />
          </div>
        </div>

        {client.managers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              Менеджеры
            </div>
            <div className="flex flex-wrap gap-1.5">
              {client.managers.map((m) => (
                <Badge key={m.userId} variant="secondary">
                  {m.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
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
