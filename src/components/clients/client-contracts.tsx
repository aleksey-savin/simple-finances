import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Paperclip, Pencil, Plus, Server } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientDetail } from '@/types'
import { AddContractForm, EditContractForm } from '@/components/contracts/form'
import { resolveDocumentUrl } from '@/components/contracts/actions'
import { DeleteContract } from '@/components/contracts/delete'
import { ContractDocuments } from '@/components/contracts/documents'
import { ContractIntegrationsSection } from '@/components/contracts/proxmox-integrations'
import { ContractsTable } from '@/components/contracts/table'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { clientDetailQueryKey } from './actions'
import { sumAmounts } from './client-info-card'

export function ClientContracts({
  clientId,
  counterparties,
  contracts,
}: {
  clientId: string
  counterparties: { id: string }[]
  contracts: ClientDetail['contracts']
}) {
  const queryClient = useQueryClient()
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [docsContractId, setDocsContractId] = useState<string | null>(null)
  const [proxmoxContractId, setProxmoxContractId] = useState<string | null>(
    null,
  )

  const defaultCounterpartyId =
    counterparties.length === 1 ? counterparties[0].id : undefined

  const editingContract = contracts.find((c) => c.id === editingId) ?? null
  const docsContract = contracts.find((c) => c.id === docsContractId) ?? null
  const proxmoxContract =
    contracts.find((c) => c.id === proxmoxContractId) ?? null

  const totals = sumAmounts(contracts)
  const formatTotal = (value: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: clientDetailQueryKey(clientId) })

  const handleContractAdded = async () => {
    setAddOpen(false)
    await refresh()
  }

  const handleContractEdited = async () => {
    setEditingId(null)
    await refresh()
  }

  const handleOpenDocument = async (documentId: string) => {
    const popup = window.open('about:blank', '_blank')
    if (!popup) {
      toast.error('Браузер заблокировал всплывающее окно')
      return
    }
    try {
      setOpeningDocId(documentId)
      const { url } = await resolveDocumentUrl({ data: { documentId } })
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
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Договоры</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              {totals.income > 0 && (
                <span className="text-success">
                  +{formatTotal(totals.income)} ₽
                </span>
              )}
              {totals.expense > 0 && (
                <span className="text-destructive">
                  −{formatTotal(totals.expense)} ₽
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет договоров</p>
        ) : (
          <ContractsTable
            contracts={contracts}
            openingDocId={openingDocId}
            onOpenDocument={(id) => void handleOpenDocument(id)}
            directionMode="cashflow"
            renderActions={(contract) => (
              <>
                {contract.businessLine?.allowServerBindings && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Proxmox"
                    onClick={() => setProxmoxContractId(contract.id)}
                  >
                    <Server className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Документы"
                  onClick={() => setDocsContractId(contract.id)}
                >
                  <Paperclip className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Редактировать"
                  onClick={() => setEditingId(contract.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <DeleteContract entityId={contract.id} onDeleted={refresh} />
              </>
            )}
          />
        )}
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Новый договор</DialogTitle>
          </DialogHeader>
          <AddContractForm
            defaultCounterpartyId={defaultCounterpartyId}
            hideBusinessLineWhenSupplier
            onSuccess={handleContractAdded}
          />
        </DialogContent>
      </Dialog>

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
              onDone={handleContractEdited}
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
              onRefresh={refresh}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet
        open={proxmoxContract !== null}
        onOpenChange={(open) => {
          if (open) return
          setProxmoxContractId(null)
          void refresh()
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Proxmox</SheetTitle>
            <SheetDescription>{proxmoxContract?.name}</SheetDescription>
          </SheetHeader>
          {proxmoxContract && (
            <div className="mt-4">
              <ContractIntegrationsSection contractId={proxmoxContract.id} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
