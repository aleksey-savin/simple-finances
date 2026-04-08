import { Fragment, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { flexRender } from '@tanstack/react-table'
import type { ColumnDef, Row, SortingState, Table } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { DataTable } from '#/components/ui/data-table'
import type { TagItem } from '#/components/ui/tag-picker'
import { TableCell, TableRow } from '#/components/ui/table'

import { ReceivablesToolbar } from './toolbar'
import type { IncomeRow, NamedEntity } from './types'
import { formatCurrency, pluralRecords } from './utils'

type ReceivablesTableSectionProps = {
  data: IncomeRow[]
  columns: ColumnDef<IncomeRow, unknown>[]
  initialSorting: SortingState
  accounts: NamedEntity[]
  categories: NamedEntity[]
  counterparties: NamedEntity[]
  allTags: TagItem[]
}

export function ReceivablesTableSection({
  data,
  columns,
  initialSorting,
  accounts,
  categories,
  counterparties,
  allTags,
}: ReceivablesTableSectionProps) {
  const [groupingEnabled, setGroupingEnabled] = useState(true)
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(
    () => new Set(),
  )
  const clientIds = [
    ...new Set(
      data
        .map((row) => row.client?.id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const canToggleAll = clientIds.length > 0
  const allExpanded =
    clientIds.length > 0 &&
    clientIds.every((clientId) => expandedClientIds.has(clientId))

  return (
    <DataTable
      columns={columns}
      data={data}
      initialSorting={initialSorting}
      pagination={false}
      renderBody={(table) =>
        renderReceivablesTableBody(
          table,
          groupingEnabled,
          expandedClientIds,
          setExpandedClientIds,
        )
      }
      toolbar={(table) => (
        <ReceivablesToolbar
          table={table}
          accounts={accounts}
          categories={categories}
          counterparties={counterparties}
          allTags={allTags}
          groupingEnabled={groupingEnabled}
          onToggleGrouping={() => setGroupingEnabled((current) => !current)}
          canToggleAll={groupingEnabled && canToggleAll}
          allExpanded={allExpanded}
          onToggleAll={() =>
            setExpandedClientIds(allExpanded ? new Set() : new Set(clientIds))
          }
        />
      )}
    />
  )
}

function renderReceivablesTableBody(
  table: Table<IncomeRow>,
  groupingEnabled: boolean,
  expandedClientIds: Set<string>,
  setExpandedClientIds: Dispatch<SetStateAction<Set<string>>>,
) {
  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={table.getVisibleLeafColumns().length}
          className="h-32 text-center text-muted-foreground"
        >
          Ничего не найдено
        </TableCell>
      </TableRow>
    )
  }

  if (!groupingEnabled) {
    return rows.map((row) => renderReceivableRow(row))
  }

  const groupedRows = groupReceivableRows(rows)

  return groupedRows.map((entry) => {
    if (entry.kind === 'row') {
      return renderReceivableRow(entry.row)
    }

    const isExpanded = expandedClientIds.has(entry.client.id)
    const total = entry.rows.reduce(
      (sum, row) => sum + row.original.outstandingAmount,
      0,
    )
    const counterparties = [
      ...new Set(
        entry.rows
          .map((row) => row.original.counterparty?.name)
          .filter((value): value is string => Boolean(value)),
      ),
    ]

    return (
      <Fragment key={`client-group-${entry.client.id}`}>
        <TableRow className="bg-muted/35 hover:bg-muted/35">
          <TableCell
            colSpan={table.getVisibleLeafColumns().length}
            className="py-2.5"
          >
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
              onClick={() =>
                setExpandedClientIds((current) => {
                  const next = new Set(current)
                  if (next.has(entry.client.id)) {
                    next.delete(entry.client.id)
                  } else {
                    next.add(entry.client.id)
                  }
                  return next
                })
              }
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                <span className="font-bold">{entry.client.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {entry.rows.length} {pluralRecords(entry.rows.length)}
              </span>
              {counterparties.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {counterparties.join(', ')}
                </span>
              )}
              <span className="ml-auto text-sm font-semibold text-success tabular-nums">
                {formatCurrency(total)} ₽
              </span>
            </button>
          </TableCell>
        </TableRow>

        {isExpanded &&
          entry.rows.map((row, index) =>
            renderReceivableRow(
              row,
              index === entry.rows.length - 1
                ? 'border-b-4 border-b-border'
                : '',
            ),
          )}
      </Fragment>
    )
  })
}

function renderReceivableRow(row: Row<IncomeRow>, className?: string) {
  return (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() ? 'selected' : undefined}
      className={className}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cell.column.columnDef.meta?.cellClassName}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

function groupReceivableRows(rows: Row<IncomeRow>[]) {
  const groups: (
    | { kind: 'row'; row: Row<IncomeRow> }
    | {
        kind: 'client'
        client: NonNullable<IncomeRow['client']>
        rows: Row<IncomeRow>[]
      }
  )[] = []
  const groupByClientId = new Map<
    string,
    {
      kind: 'client'
      client: NonNullable<IncomeRow['client']>
      rows: Row<IncomeRow>[]
    }
  >()

  for (const row of rows) {
    const client = row.original.client

    if (!client) {
      groups.push({ kind: 'row', row })
      continue
    }

    const existing = groupByClientId.get(client.id)
    if (existing) {
      existing.rows.push(row)
      continue
    }

    const nextGroup = {
      kind: 'client' as const,
      client,
      rows: [row],
    }
    groupByClientId.set(client.id, nextGroup)
    groups.push(nextGroup)
  }

  return groups
}
