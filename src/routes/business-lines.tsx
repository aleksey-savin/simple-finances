import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'

import { Briefcase, Pencil, Search, X } from 'lucide-react'

import { EditBusinessLineForm } from '@/components/business-lines'
import { DeleteBusinessLine } from '@/components/business-lines/delete'
import { fetchBusinessLines } from '@/components/business-lines/actions'
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

export const Route = createFileRoute('/business-lines')({
  loader: () => fetchBusinessLines(),
  component: BusinessLinesPage,
})

function BusinessLinesPage() {
  const businessLines = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingBusinessLine =
    businessLines.find((businessLine) => businessLine.id === editingId) ?? null

  const query = search.trim().toLowerCase()
  const filteredBusinessLines = !query
    ? businessLines
    : businessLines.filter((businessLine) => {
        const haystack = [
          businessLine.name,
          businessLine.contracts.map((contract) => contract.name).join(' '),
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
              placeholder="Поиск по направлению или договору"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-4">
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
              {filteredBusinessLines.length} из {businessLines.length}
            </span>
          </div>
        </Card>

        {filteredBusinessLines.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredBusinessLines.map((businessLine) => (
                <Card key={businessLine.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{businessLine.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Договоров: {businessLine.contracts.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Серверы:{' '}
                        {businessLine.allowServerBindings
                          ? 'разрешены'
                          : 'запрещены'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(businessLine.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteBusinessLine entityId={businessLine.id} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Направление</TableHead>
                    <TableHead className="font-bold">Договоры</TableHead>
                    <TableHead className="w-24 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinessLines.map((businessLine) => (
                    <TableRow key={businessLine.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <Briefcase className="size-4 text-muted-foreground" />
                          {businessLine.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-muted-foreground">
                          <span>Договоров: {businessLine.contracts.length}</span>
                          <span>
                            Серверы:{' '}
                            {businessLine.allowServerBindings
                              ? 'разрешены'
                              : 'запрещены'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditingId(businessLine.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteBusinessLine entityId={businessLine.id} />
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
        open={editingBusinessLine !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование направления</DialogTitle>
            <DialogDescription>{editingBusinessLine?.name}</DialogDescription>
          </DialogHeader>
          {editingBusinessLine ? (
            <EditBusinessLineForm
              businessLine={editingBusinessLine}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Outlet />
    </>
  )
}
