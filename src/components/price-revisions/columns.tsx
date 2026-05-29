import type { ColumnDef } from '@tanstack/react-table'
import type { PriceRevisionItemRow } from '@/types'
import { Mail, Phone } from 'lucide-react'
import { formatCurrency } from './utils'
import { ProposedAmountsCell } from './proposed-amount-cell'
import { RevisionItemNotesCell } from './notes-cell'
import { RevisionItemStatusActionButton } from './status-action-button'
import { RevisionItemDetailsCell } from './item-details-sheet'
import { DeleteRevisionItem } from './item-delete'

export function buildRevisionColumns(
  revisionId: string,
  isCompleted = false,
): ColumnDef<PriceRevisionItemRow>[] {
  return [
    {
      id: 'client',
      header: 'Клиент',
      cell: ({ row }) => {
        const { client, contacts } = row.original.contract.counterparty
        const counterpartyName = row.original.contract.counterparty.name
        return (
          <div className={row.original.included ? '' : 'opacity-40'}>
            {client ? (
              <>
                <div className="font-medium">{client.name}</div>
                <div className="text-xs text-muted-foreground">
                  ({counterpartyName})
                </div>
              </>
            ) : (
              <span>{counterpartyName}</span>
            )}
            {contacts.length > 0 && (
              <div className="mt-1 flex flex-col gap-0.5">
                {contacts.map((c) => (
                  <div key={c.id} className="text-xs text-muted-foreground">
                    <span>{c.name}</span>
                    {c.position && (
                      <span className="ml-1 opacity-70">{c.position}</span>
                    )}
                    <div className="flex flex-wrap gap-x-2">
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-0.5 hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="size-2.5" />
                          {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-0.5 hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="size-2.5" />
                          {c.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'currentAmounts',
      header: 'Текущая',
      cell: ({ row }) => (
        <div
          className={`flex flex-col items-start gap-0.5 ${row.original.included ? '' : 'opacity-40'}`}
        >
          {row.original.currentAmounts.map((amt, i) => (
            <span key={i} className="font-mono text-sm tabular-nums">
              {formatCurrency(Number(amt))}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'proposedAmounts',
      header: 'Новая',
      cell: ({ row }) => {
        const { currentAmounts, proposedAmounts } = row.original
        const readOnly = isCompleted || !row.original.included
        if (readOnly) {
          return (
            <div
              className={`flex flex-col gap-0.5 ${!row.original.included ? 'opacity-40' : ''}`}
            >
              {proposedAmounts.map((amt, i) => {
                const diff = Number(amt) - Number(currentAmounts[i] ?? '0')
                const colorClass =
                  diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''
                return (
                  <span
                    key={i}
                    className={`font-mono text-sm tabular-nums ${colorClass}`}
                  >
                    {formatCurrency(Number(amt))}
                  </span>
                )
              })}
            </div>
          )
        }
        return (
          <ProposedAmountsCell
            itemId={row.original.id}
            revisionId={revisionId}
            currentAmounts={currentAmounts}
            proposedAmounts={proposedAmounts}
          />
        )
      },
    },
    {
      accessorKey: 'notes',
      header: 'Заметки',
      cell: ({ row }) => (
        <RevisionItemNotesCell
          itemId={row.original.id}
          revisionId={revisionId}
          notes={row.original.notes}
          readOnly={isCompleted}
        />
      ),
    },
    {
      id: 'managers',
      header: 'Менеджер',
      cell: ({ row }) => {
        const managers = row.original.managers
        if (managers.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>
        }
        return (
          <div
            className={`flex flex-col gap-0.5 ${row.original.included ? '' : 'opacity-40'}`}
          >
            {managers.map((m) => (
              <span key={m.userId} className="text-sm">
                {m.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {!isCompleted && (
            <RevisionItemStatusActionButton
              itemId={row.original.id}
              status={row.original.status}
              revisionId={revisionId}
            />
          )}
          <RevisionItemDetailsCell item={row.original} />
          {!isCompleted && (
            <DeleteRevisionItem
              entityId={row.original.id}
              revisionId={revisionId}
            />
          )}
        </div>
      ),
    },
  ]
}
