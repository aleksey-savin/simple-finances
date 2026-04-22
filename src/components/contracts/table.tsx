import { ExternalLink, FileText, Loader2 } from 'lucide-react'

import type { ContractType } from '@/db/types'
import { Badge } from '@/components/ui/badge'
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

export type ContractTableRow = {
  id: string
  name: string
  number: string | null
  signedAt: string | null
  contractType: ContractType
  amount: string[]
  businessLine: { id: string; name: string }
  counterparty: { id: string; name: string }
  documents: { id: string; name: string; url: string }[]
  blockedVmCount?: number
}

type ContractsTableProps = {
  contracts: ContractTableRow[]
  openingDocId: string | null
  onOpenDocument: (documentId: string) => void
  showType?: boolean
  highlightBlocked?: boolean
  renderActions?: (contract: ContractTableRow) => React.ReactNode
}

function formatAmount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(parsed)
}

function formatSignedAt(value: string | null | undefined) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value || '—'
  return new Intl.DateTimeFormat('ru-RU').format(new Date(year, month - 1, day))
}

export function ContractsTable({
  contracts,
  openingDocId,
  onOpenDocument,
  showType,
  highlightBlocked,
  renderActions,
}: ContractsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold">Направление</TableHead>
          <TableHead className="font-bold">Договор</TableHead>
          {showType && <TableHead className="font-bold">Тип</TableHead>}
          <TableHead className="font-bold">Суммы</TableHead>
          <TableHead className="font-bold">Документы</TableHead>
          {renderActions && (
            <TableHead className="w-24 text-right font-bold">Действия</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => {
          const blockedVmCount = contract.blockedVmCount ?? 0
          const isBlocked = blockedVmCount > 0

          return (
            <TableRow
              key={contract.id}
              className={
                highlightBlocked && isBlocked
                  ? 'bg-destructive/5 hover:bg-destructive/10'
                  : undefined
              }
            >
            <TableCell className="text-sm">{contract.businessLine.name}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2 font-medium">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                {contract.number
                  ? `№${contract.number} от ${formatSignedAt(contract.signedAt)}`
                  : contract.name}
                {highlightBlocked && isBlocked && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                    Блок
                  </Badge>
                )}
              </div>
              {contract.number && (
                <p className="mt-0.5 text-xs text-muted-foreground">{contract.name}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {contract.counterparty.name}
              </p>
              {highlightBlocked && isBlocked && (
                <p className="mt-0.5 text-xs text-destructive">
                  Заблокировано ВМ: {blockedVmCount}
                </p>
              )}
            </TableCell>
            {showType && (
              <TableCell>{contractTypeLabel[contract.contractType]}</TableCell>
            )}
            <TableCell>
              <div className="flex flex-col gap-0.5">
                {contract.amount.map((amt, i) => (
                  <span key={i} className="font-mono text-sm tabular-nums">
                    {formatAmount(amt)} ₽
                  </span>
                ))}
              </div>
            </TableCell>
            <TableCell>
              {contract.documents.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {contract.documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                      disabled={openingDocId === doc.id}
                      onClick={() => onOpenDocument(doc.id)}
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
            {renderActions && (
              <TableCell>
                <div className="flex justify-end gap-1">{renderActions(contract)}</div>
              </TableCell>
            )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
