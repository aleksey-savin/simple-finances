import { useState } from 'react'
import { FileText, Loader2, Paperclip, Pencil, Server } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ContractType } from '@/db/types'
import type { Contract } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  contractsQueryKey,
  fetchContracts,
  resolveDocumentUrl,
} from './actions'
import { DeleteContract } from './delete'
import { EditContractForm } from './form'
import { ContractIntegrationsSection } from './proxmox-integrations'

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

const contractTypeLabel: Record<ContractType, string> = {
  customer: 'С покупателем',
  supplier: 'С поставщиком',
}

function ContractRow({
  contract,
  editingId,
  integrationsId,
  openingDocId,
  onOpenDocument,
  setEditingId,
  setIntegrationsId,
}: {
  contract: Contract
  editingId: string | null
  integrationsId: string | null
  openingDocId: string | null
  onOpenDocument: (documentId: string) => Promise<void>
  setEditingId: (id: string | null) => void
  setIntegrationsId: (id: string | null) => void
}) {
  const isEditing = editingId === contract.id
  const isIntegrationsOpen = integrationsId === contract.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing || isIntegrationsOpen ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <FileText className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>
            {`Договор №${contract.number} от ${formatSignedAt(contract.signedAt)}`}
          </ItemTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {contractTypeLabel[contract.contractType]}
            {' · '}
            {contract.counterparty.name}
            {' · '}
            {contract.businessLine.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {contract.name}
            {' · '}
            {contract.amount
              .map((value) => `${formatAmount(value)} ₽`)
              .join(', ')}
          </p>
          {contract.documents.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {contract.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                  disabled={openingDocId === doc.id}
                  onClick={() => void onOpenDocument(doc.id)}
                >
                  {openingDocId === doc.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Paperclip className="size-3" />
                  )}
                  {doc.name}
                </button>
              ))}
            </div>
          )}
        </ItemContent>

        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Интеграции Proxmox"
            onClick={() => {
              setIntegrationsId(isIntegrationsOpen ? null : contract.id)
              if (isEditing) setEditingId(null)
            }}
          >
            <Server className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => {
              setEditingId(isEditing ? null : contract.id)
              if (isIntegrationsOpen) setIntegrationsId(null)
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteContract entityId={contract.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="-mt-0.5 rounded-b-md border border-t-0 bg-muted/30 px-4 pb-4">
          <EditContractForm
            contract={contract}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}

      {isIntegrationsOpen && (
        <div className="-mt-0.5 rounded-b-md border border-t-0 bg-muted/30 px-4 pb-3">
          <ContractIntegrationsSection contractId={contract.id} />
        </div>
      )}
    </div>
  )
}

export const ContractsList = () => {
  const { data: contracts = [] } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => fetchContracts(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [integrationsId, setIntegrationsId] = useState<string | null>(null)
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

  const handleOpenDocument = async (documentId: string) => {
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
        error instanceof Error
          ? error.message
          : 'Не удалось открыть документ',
      )
    } finally {
      setOpeningDocId((prev) => (prev === documentId ? null : prev))
    }
  }

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">
          Все договоры ({contracts.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {contracts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Нет добавленных договоров
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {contracts.map((contract) => (
              <ContractRow
                key={contract.id}
                contract={contract}
                editingId={editingId}
                integrationsId={integrationsId}
                openingDocId={openingDocId}
                onOpenDocument={handleOpenDocument}
                setEditingId={setEditingId}
                setIntegrationsId={setIntegrationsId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
