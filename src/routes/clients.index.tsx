import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Pencil, Search, User, X } from 'lucide-react'

import { EditClientForm } from '@/components/clients'
import { DeleteClient } from '@/components/clients/delete'
import { fetchClients } from '@/components/clients/actions'
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
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/clients/')({
  loader: () => fetchClients(),
  component: ClientsPage,
})

function ClientsPage() {
  const clients = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingClient = clients.find((client) => client.id === editingId) ?? null

  const query = search.trim().toLowerCase()
  const filteredClients = !query
    ? clients
    : clients.filter((client) => {
        const haystack = [
          client.name,
          client.counterparties.map((counterparty) => counterparty.name).join(' '),
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })

  const hasActiveFilters = search.trim() !== ''

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по клиенту или контрагенту"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Сброс
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredClients.length} из {clients.length}
            </span>
          </div>
        </Card>

        {filteredClients.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredClients.map((client) => (
                <Card key={client.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/clients/$id"
                        params={{ id: client.id }}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.counterparties.length > 0
                          ? client.counterparties
                              .map((counterparty) => counterparty.name)
                              .join(', ')
                          : 'Контрагенты не выбраны'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(client.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteClient clientId={client.id} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Клиент</TableHead>
                    <TableHead className="font-bold">Контрагенты</TableHead>
                    <TableHead className="font-bold">Контакты</TableHead>
                    <TableHead className="w-24 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <User className="size-4 text-muted-foreground" />
                          <Link
                            to="/clients/$id"
                            params={{ id: client.id }}
                            className="hover:underline"
                          >
                            {client.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.counterparties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {client.counterparties.map((counterparty) => (
                              <Badge key={counterparty.id} variant="secondary">
                                {counterparty.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Контрагенты не выбраны
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.contacts.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {client.contacts.map((c) => (
                              <span key={c.id} className="text-sm">
                                {c.name}
                                {c.position && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    {c.position}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditingId(client.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteClient clientId={client.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={editingClient !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование клиента</DialogTitle>
            <DialogDescription>{editingClient?.name}</DialogDescription>
          </DialogHeader>
          {editingClient ? (
            <EditClientForm
              client={editingClient}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
