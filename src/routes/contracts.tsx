import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Search,
  X,
} from 'lucide-react'

import type { ContractType } from '@/db/types'
import { EditContractForm } from '@/components/contracts'
import { DeleteContract } from '@/components/contracts/delete'
import {
  fetchContracts,
  resolveContractFileUrl,
} from '@/components/contracts/actions'
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

const contractTypeLabel: Record<ContractType, string> = {
  customer: 'С покупателем',
  supplier: 'С поставщиком',
}

export const Route = createFileRoute('/contracts')({
  loader: () => fetchContracts(),
  component: ContractsPage,
})

function ContractsPage() {
  const contracts = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const editingContract =
    contracts.find((contract) => contract.id === editingId) ?? null

  const query = search.trim().toLowerCase()
  const filteredContracts = contracts.filter((contract) => {
    if (query) {
      const haystack = [
        contract.name,
        contract.number,
        contract.counterparty.name,
        contract.businessLine.name,
        contract.amount.join(' '),
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(query)) return false
    }

    if (typeFilter && contract.contractType !== typeFilter) return false

    return true
  })

  const hasActiveFilters = search.trim() !== '' || typeFilter !== ''

  const openContractFile = async (contractId: string) => {
    const popup = window.open('about:blank', '_blank')

    if (!popup) {
      toast.error('Браузер заблокировал всплывающее окно')
      return
    }

    try {
      setOpeningId(contractId)
      const { url } = await resolveContractFileUrl({
        data: { id: contractId },
      })

      popup.location.replace(url)
    } catch (error) {
      popup.close()
      toast.error(
        error instanceof Error
          ? error.message
          : 'Не удалось открыть файл договора',
      )
    } finally {
      setOpeningId((prev) => (prev === contractId ? null : prev))
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по договору, номеру, контрагенту"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Combobox
              options={[
                { value: 'customer', label: contractTypeLabel.customer },
                { value: 'supplier', label: contractTypeLabel.supplier },
              ]}
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder="Все типы"
              searchPlaceholder="Поиск типа..."
              className="w-60"
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
              {filteredContracts.length} из {contracts.length}
            </span>
          </div>
        </Card>

        {filteredContracts.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredContracts.map((contract) => (
                <Card key={contract.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {`Договор №${contract.number} от ${formatSignedAt(contract.signedAt)}`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {contractTypeLabel[contract.contractType]}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {contract.counterparty.name} · {contract.businessLine.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {contract.amount
                          .map((amount) => `${formatAmount(amount)} ₽`)
                          .join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          void openContractFile(contract.id)
                        }}
                        disabled={openingId === contract.id}
                      >
                        {openingId === contract.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ExternalLink className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(contract.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteContract entityId={contract.id} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Договор</TableHead>
                    <TableHead className="font-bold">Тип</TableHead>
                    <TableHead className="font-bold">Контрагент</TableHead>
                    <TableHead className="font-bold">Направление</TableHead>
                    <TableHead className="font-bold">Суммы</TableHead>
                    <TableHead className="w-28 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="size-4 text-muted-foreground" />
                          {`№${contract.number} от ${formatSignedAt(contract.signedAt)}`}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {contract.name}
                        </p>
                      </TableCell>
                      <TableCell>{contractTypeLabel[contract.contractType]}</TableCell>
                      <TableCell>{contract.counterparty.name}</TableCell>
                      <TableCell>{contract.businessLine.name}</TableCell>
                      <TableCell>
                        {contract.amount
                          .map((amount) => `${formatAmount(amount)} ₽`)
                          .join(', ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              void openContractFile(contract.id)
                            }}
                            disabled={openingId === contract.id}
                          >
                            {openingId === contract.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <ExternalLink className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditingId(contract.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteContract entityId={contract.id} />
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
        open={editingContract !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование договора</DialogTitle>
            <DialogDescription>{editingContract?.name}</DialogDescription>
          </DialogHeader>
          {editingContract ? (
            <EditContractForm
              contract={editingContract}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Outlet />
    </>
  )
}

function formatAmount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(parsed)
}

function formatSignedAt(value: string | Date | null | undefined) {
  if (!value) return '—'

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—'
    return new Intl.DateTimeFormat('ru-RU').format(value)
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value || '—'

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return value || '—'

  return new Intl.DateTimeFormat('ru-RU').format(date)
}
