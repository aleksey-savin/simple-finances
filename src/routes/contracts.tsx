import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { Paperclip, Pencil, Search, Server, X } from 'lucide-react'

import type { ContractType } from '@/db/types'
import { EditContractForm } from '@/components/contracts'
import { DeleteContract } from '@/components/contracts/delete'
import {
  fetchContracts,
  resolveDocumentUrl,
} from '@/components/contracts/actions'
import { ContractDocuments } from '@/components/contracts/documents'
import { ContractIntegrationsSection } from '@/components/contracts/proxmox-integrations'
import { ContractsTable } from '@/components/contracts/table'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'

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
  const [docsContractId, setDocsContractId] = useState<string | null>(null)
  const [proxmoxContractId, setProxmoxContractId] = useState<string | null>(
    null,
  )
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

  const editingContract =
    contracts.find((contract) => contract.id === editingId) ?? null
  const docsContract =
    contracts.find((contract) => contract.id === docsContractId) ?? null

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

  const openDocumentFile = async (documentId: string) => {
    const popup = window.open('about:blank', '_blank')

    if (!popup) {
      toast.error('Браузер заблокировал всплывающее окно')
      return
    }

    try {
      setOpeningDocId(documentId)
      const { url } = await resolveDocumentUrl({
        data: { documentId },
      })

      popup.location.replace(url)
    } catch (error) {
      popup.close()
      toast.error(
        error instanceof Error ? error.message : 'Не удалось открыть документ',
      )
    } finally {
      setOpeningDocId((prev) => (prev === documentId ? null : prev))
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
              {filteredContracts.map((contract) => {
                const blockedVmCount = contract.blockedVmCount
                const isBlocked = blockedVmCount > 0

                return (
                  <Card
                    key={contract.id}
                    className={`p-4 ${
                      isBlocked ? 'border-destructive/40 bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium">
                            {`Договор №${contract.number} от ${formatSignedAt(contract.signedAt)}`}
                          </p>
                          {isBlocked && (
                            <Badge
                              variant="destructive"
                              className="h-5 px-1.5 text-[10px]"
                            >
                              Блок
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {contractTypeLabel[contract.contractType]}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {contract.counterparty.name} ·{' '}
                          {contract.businessLine.name}
                        </p>
                        {isBlocked && (
                          <p className="mt-1 text-xs text-destructive">
                            Заблокировано ВМ: {blockedVmCount}
                          </p>
                        )}
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
                          title="Proxmox"
                          onClick={() => setProxmoxContractId(contract.id)}
                        >
                          <Server className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Документы"
                          onClick={() => setDocsContractId(contract.id)}
                        >
                          <Paperclip className="size-4" />
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
                )
              })}
            </div>

            <Card className="hidden p-4 sm:block">
              <ContractsTable
                contracts={filteredContracts}
                openingDocId={openingDocId}
                onOpenDocument={(id) => void openDocumentFile(id)}
                showType
                highlightBlocked
                renderActions={(contract) => (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Proxmox"
                      onClick={() => setProxmoxContractId(contract.id)}
                    >
                      <Server className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Документы"
                      onClick={() => setDocsContractId(contract.id)}
                    >
                      <Paperclip className="size-4" />
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
                  </>
                )}
              />
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

      <Dialog
        open={docsContract !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDocsContractId(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Документы</DialogTitle>
            <DialogDescription>{docsContract?.name}</DialogDescription>
          </DialogHeader>
          {docsContract ? (
            <ContractDocuments
              contractId={docsContract.id}
              documents={docsContract.documents}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet
        open={proxmoxContractId !== null}
        onOpenChange={(open) => {
          if (!open) setProxmoxContractId(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Proxmox</SheetTitle>
            <SheetDescription>
              {contracts.find((c) => c.id === proxmoxContractId)?.name}
            </SheetDescription>
          </SheetHeader>
          {proxmoxContractId && (
            <div className="mt-4">
              <ContractIntegrationsSection contractId={proxmoxContractId} />
            </div>
          )}
        </SheetContent>
      </Sheet>

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
