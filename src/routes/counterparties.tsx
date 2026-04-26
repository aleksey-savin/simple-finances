import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'

import { Pencil, Search, User, UserCheck, X } from 'lucide-react'

import { counterpartyTypeEnum } from '@/db/schema'
import { EditCounterpartyForm } from '@/components/counterparties/form'
import { DeleteCounterparty } from '@/components/counterparties/delete'
import { fetchCounterparties } from '@/components/counterparties/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
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

export const Route = createFileRoute('/counterparties')({
  loader: () => fetchCounterparties(),
  component: CounterpartiesPage,
})

function CounterpartiesPage() {
  const counterparties = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingCounterparty =
    counterparties.find((counterparty) => counterparty.id === editingId) ?? null

  const query = search.trim().toLowerCase()
  const filteredCounterparties = counterparties.filter((counterparty) => {
    if (query) {
      const haystack = [
        counterparty.name,
        counterparty.fullName ?? '',
        counterparty.tin ?? '',
        counterparty.linkedUser?.email ?? '',
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(query)) return false
    }

    if (typeFilter && counterparty.type !== typeFilter) return false

    return true
  })

  const hasActiveFilters = search.trim() !== '' || typeFilter !== ''

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, ИНН или email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Combobox
              options={counterpartyTypeEnum.enumValues.map((value) => ({
                value,
                label: value,
              }))}
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder="Все типы"
              searchPlaceholder="Поиск типа..."
              className="w-72"
              allowClear
              clearLabel="Очистить тип"
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('')
                }}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Сброс
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredCounterparties.length} из {counterparties.length}
            </span>
          </div>
        </Card>

        {filteredCounterparties.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredCounterparties.map((counterparty) => (
                <Card key={counterparty.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{counterparty.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {counterparty.type && (
                          <Badge variant="secondary">{counterparty.type}</Badge>
                        )}
                        {counterparty.tin && (
                          <Badge variant="outline">
                            ИНН: {counterparty.tin}
                          </Badge>
                        )}
                      </div>
                      {counterparty.linkedUser && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {counterparty.linkedUser.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(counterparty.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteCounterparty counterpartyId={counterparty.id} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Контрагент</TableHead>
                    <TableHead className="font-bold">Тип</TableHead>
                    <TableHead className="font-bold">ИНН</TableHead>
                    <TableHead className="font-bold">Привязка</TableHead>
                    <TableHead className="w-24 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCounterparties.map((counterparty) => (
                    <TableRow key={counterparty.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <User className="size-4 text-muted-foreground" />
                          {counterparty.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {counterparty.type ? (
                          <Badge variant="secondary">{counterparty.type}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{counterparty.tin ?? '—'}</TableCell>
                      <TableCell>
                        {counterparty.linkedUser ? (
                          <div className="flex items-center gap-1 text-sm">
                            <UserCheck className="size-4 text-primary" />
                            <span>{counterparty.linkedUser.email}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditingId(counterparty.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteCounterparty
                            counterpartyId={counterparty.id}
                          />
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
        open={editingCounterparty !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование контрагента</DialogTitle>
            <DialogDescription>{editingCounterparty?.name}</DialogDescription>
          </DialogHeader>
          {editingCounterparty ? (
            <EditCounterpartyForm
              counterparty={editingCounterparty}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Outlet />
    </>
  )
}
