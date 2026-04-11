import { useState } from 'react'
import { ExternalLink, FileText, Loader2, Pencil } from 'lucide-react'
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
  resolveContractFileUrl,
} from './actions'
import { DeleteContract } from './delete'
import { EditContractForm } from './form'

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
  openingId,
  onOpenFile,
  setEditingId,
}: {
  contract: Contract
  editingId: string | null
  openingId: string | null
  onOpenFile: (contract: Contract) => Promise<void>
  setEditingId: (id: string | null) => void
}) {
  const isEditing = editingId === contract.id
  const isOpeningFile = openingId === contract.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
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
        </ItemContent>

        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Открыть файл"
            onClick={() => {
              void onOpenFile(contract)
            }}
            disabled={isOpeningFile}
          >
            {isOpeningFile ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ExternalLink className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : contract.id)}
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
    </div>
  )
}

export const ContractsList = () => {
  const { data: contracts = [] } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => fetchContracts(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const handleOpenFile = async (contract: Contract) => {
    const popup = window.open('about:blank', '_blank')

    if (!popup) {
      toast.error('Браузер заблокировал всплывающее окно')
      return
    }

    try {
      setOpeningId(contract.id)
      const { url } = await resolveContractFileUrl({
        data: { id: contract.id },
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
      setOpeningId((prev) => (prev === contract.id ? null : prev))
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
                openingId={openingId}
                onOpenFile={handleOpenFile}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
