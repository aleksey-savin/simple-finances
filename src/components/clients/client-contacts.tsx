import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import type { ClientDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  addContact,
  updateContact,
  deleteContact,
  clientDetailQueryKey,
} from './actions'

type Contact = ClientDetail['contacts'][number]

const contactSchema = z.object({
  name: z.string().min(1, 'Введите имя'),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
})

function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: {
    name: string
    position: string
    phone: string
    email: string
  }
  onSubmit: (values: {
    name: string
    position: string
    phone: string
    email: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const form = useForm({
    defaultValues: defaultValues ?? {
      name: '',
      position: '',
      phone: '',
      email: '',
    },
    validators: { onSubmit: contactSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Имя *</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Иван Иванов"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="position">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Должность</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Директор"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Телефон</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="+7 900 000 00 00"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="ivan@example.com"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="sm" disabled={isSubmitting}>
              Сохранить
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

export function ClientContacts({
  clientId,
  contacts,
}: {
  clientId: string
  contacts: Contact[]
}) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: clientDetailQueryKey(clientId) })

  const handleAdd = async (values: {
    name: string
    position: string
    phone: string
    email: string
  }) => {
    try {
      await addContact({ data: { clientId, ...values } })
      await invalidate()
      setAddOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const handleEdit = async (values: {
    name: string
    position: string
    phone: string
    email: string
  }) => {
    if (!editingContact) return
    try {
      await updateContact({
        data: { id: editingContact.id, clientId, ...values },
      })
      await invalidate()
      setEditingContact(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteContact({ data: { id } })
      await invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Контакты</h3>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет контактов</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Имя</TableHead>
                <TableHead className="font-bold">Должность</TableHead>
                <TableHead className="font-bold">Телефон</TableHead>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.position ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="size-3" />
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="size-3" />
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditingContact(c)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        disabled={deletingId === c.id}
                        onClick={() => void handleDelete(c.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Новый контакт</DialogTitle>
          </DialogHeader>
          <ContactForm
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
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
              onSubmit={handleEdit}
              onCancel={() => setEditingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
