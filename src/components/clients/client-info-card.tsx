import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

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

import {
  addContact,
  clientDetailQueryKey,
  clientsQueryKey,
  deleteContact,
  updateContact,
} from './actions'
import { ContactForm } from './contact-form'
import type { ContactFormValues } from './contact-form'
import { DeleteClient } from './delete'
import { EditClientForm } from './form'

type Contact = ClientDetail['contacts'][number]

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
})

export function sumAmounts(contracts: ClientDetail['contracts']) {
  const totals = { income: 0, expense: 0 }
  for (const c of contracts) {
    const sum = c.amount.reduce((acc, raw) => {
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? acc + parsed : acc
    }, 0)
    if (c.contractType === 'customer') totals.income += sum
    else totals.expense += sum
  }
  return totals
}

export function ClientInfoCard({ client }: { client: ClientDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null,
  )

  const totals = sumAmounts(client.contracts)

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

  const invalidateClient = () =>
    queryClient.invalidateQueries({ queryKey: clientDetailQueryKey(client.id) })

  const handleAddContact = async (values: ContactFormValues) => {
    try {
      await addContact({ data: { clientId: client.id, ...values } })
      await invalidateClient()
      setAddContactOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const handleEditContact = async (values: ContactFormValues) => {
    if (!editingContact) return
    try {
      await updateContact({
        data: { id: editingContact.id, clientId: client.id, ...values },
      })
      await invalidateClient()
      setEditingContact(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const handleDeleteContact = async (id: string) => {
    setDeletingContactId(id)
    try {
      await deleteContact({ data: { id } })
      await invalidateClient()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDeletingContactId(null)
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Клиент</p>
            <h2 className="mt-0.5 text-xl font-semibold">{client.name}</h2>
            {(totals.income > 0 || totals.expense > 0) && (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-mono tabular-nums">
                {totals.income > 0 && (
                  <span className="text-success">
                    +{numberFormatter.format(totals.income)} ₽
                  </span>
                )}
                {totals.expense > 0 && (
                  <span className="text-destructive">
                    −{numberFormatter.format(totals.expense)} ₽
                  </span>
                )}
              </div>
            )}
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Контакты</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setAddContactOpen(true)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          {client.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет контактов</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {client.contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 py-1.5"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{c.name}</p>
                    {c.position && (
                      <p className="text-xs text-muted-foreground">
                        {c.position}
                      </p>
                    )}
                    {(c.phone || c.email) && (
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="size-3" />
                            {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <Mail className="size-3" />
                            {c.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => setEditingContact(c)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive hover:text-destructive"
                      disabled={deletingContactId === c.id}
                      onClick={() => void handleDeleteContact(c.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
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

      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Новый контакт</DialogTitle>
          </DialogHeader>
          <ContactForm
            onSubmit={handleAddContact}
            onCancel={() => setAddContactOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingContact !== null}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null)
        }}
      >
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Редактировать контакт</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              defaultValues={{
                name: editingContact.name,
                position: editingContact.position ?? '',
                phone: editingContact.phone ?? '',
                email: editingContact.email ?? '',
              }}
              onSubmit={handleEditContact}
              onCancel={() => setEditingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
