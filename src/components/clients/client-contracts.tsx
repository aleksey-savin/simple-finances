import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientDetail } from '@/types'
import { AddContractForm } from '@/components/contracts/form'
import { resolveDocumentUrl } from '@/components/contracts/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientDetailQueryKey } from './actions'

function formatAmount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(
    parsed,
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('ru-RU').format(new Date(year, month - 1, day))
}

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

  const defaultCounterpartyId =
    counterparties.length === 1 ? counterparties[0].id : undefined

  const handleContractAdded = async () => {
    setAddOpen(false)
    await queryClient.invalidateQueries({ queryKey: clientDetailQueryKey(clientId) })
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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Договоры</h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
        </Button>
      </div>
      {contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет договоров</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Направление</TableHead>
              <TableHead className="font-bold">Договор</TableHead>
              <TableHead className="font-bold">Суммы</TableHead>
              <TableHead className="font-bold">Документы</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm">{c.businessLine.name}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {c.number ? `№${c.number}` : c.name}
                  </div>
                  {c.number && (
                    <div className="text-xs text-muted-foreground">
                      {c.name}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {c.counterparty.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(c.signedAt)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {c.amount.map((amt, i) => (
                      <span key={i} className="font-mono text-sm tabular-nums">
                        {formatAmount(amt)} ₽
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {c.documents.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {c.documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                          disabled={openingDocId === doc.id}
                          onClick={() => void handleOpenDocument(doc.id)}
                        >
                          {openingDocId === doc.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <ExternalLink className="size-3" />
                          )}
                          {doc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>

    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Новый договор</DialogTitle>
        </DialogHeader>
        <AddContractForm
          defaultCounterpartyId={defaultCounterpartyId}
          onSuccess={handleContractAdded}
        />
      </DialogContent>
    </Dialog>
    </>
  )
}
