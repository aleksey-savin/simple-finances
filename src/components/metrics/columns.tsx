import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'

import { DataTableColumnHeader } from '#/components/ui/data-table'
import { formatMoney, formatShortDate } from '#/lib/format'

import type { ScoringMismatchRow } from '#/components/metrics/types'

function CompareCell({ bank, app }: { bank: ReactNode; app: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-sm break-words">
      <span>{bank}</span>
      <span className="text-muted-foreground">↳ {app}</span>
    </div>
  )
}

const dash = <span className="text-muted-foreground">—</span>

export function buildScoringColumns(): ColumnDef<
  ScoringMismatchRow,
  unknown
>[] {
  return [
    {
      id: 'bookedAt',
      accessorFn: (row) => row.bankBookedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Дата" />
      ),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {formatShortDate(row.original.bankBookedAt)}
        </span>
      ),
    },
    {
      id: 'operation',
      accessorFn: (row) => row.bankDescription ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Операция" />
      ),
      cell: ({ row }) => (
        <CompareCell
          bank={row.original.bankDescription || dash}
          app={row.original.invoiceDescription || dash}
        />
      ),
    },
    {
      id: 'counterparty',
      accessorFn: (row) => row.bankCounterpartyName ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Контрагент" />
      ),
      cell: ({ row }) => (
        <CompareCell
          bank={
            row.original.bankCounterpartyName ? (
              <>
                {row.original.bankCounterpartyName}
                {row.original.bankCounterpartyTin ? (
                  <span className="text-muted-foreground">
                    {' '}
                    · ИНН {row.original.bankCounterpartyTin}
                  </span>
                ) : null}
              </>
            ) : (
              dash
            )
          }
          app={row.original.invoiceCounterpartyName || dash}
        />
      ),
    },
    {
      id: 'amount',
      accessorFn: (row) => row.bankAmount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Сумма" />
      ),
      cell: ({ row }) => (
        <CompareCell
          bank={
            <span className="whitespace-nowrap tabular-nums">
              {formatMoney(row.original.bankAmount)}
            </span>
          }
          app={
            <span className="whitespace-nowrap tabular-nums">
              {formatMoney(row.original.invoiceAmount)}
            </span>
          }
        />
      ),
    },
    {
      id: 'score',
      accessorFn: (row) => row.matchScore,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Оценка" />
      ),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap tabular-nums">
          <span className="font-medium text-destructive">
            {row.original.matchScore}
          </span>
          <span className="text-muted-foreground">
            {' '}
            / {row.original.topMatchScore}
          </span>
        </span>
      ),
    },
  ]
}
