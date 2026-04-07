import type { ReactNode } from 'react'

import { flexRender } from '@tanstack/react-table'
import type { ColumnDef, Row, SortingState, Table } from '@tanstack/react-table'

import { DataTable } from '#/components/ui/data-table'
import type { TagItem } from '#/components/ui/tag-picker'
import { TableCell, TableRow } from '#/components/ui/table'

import { PayablesToolbar } from './toolbar'
import type { ExpenseRow, NamedEntity, PayablesPeriodGroup } from './types'
import { formatCurrency, getPeriodLabel } from './utils'

type PayablesTableSectionProps = {
  data: ExpenseRow[]
  columns: ColumnDef<ExpenseRow, unknown>[]
  initialSorting: SortingState
  monthLabel: string
  accounts: NamedEntity[]
  categories: NamedEntity[]
  counterparties: NamedEntity[]
  allTags: TagItem[]
  title?: string
  description?: string
  headerSlot?: ReactNode
}

export function PayablesTableSection({
  data,
  columns,
  initialSorting,
  monthLabel,
  accounts,
  categories,
  counterparties,
  allTags,
  title,
  description,
  headerSlot,
}: PayablesTableSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      {(title || description || headerSlot) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {headerSlot}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        initialSorting={initialSorting}
        pagination={false}
        renderBody={(table) => renderGroupedBody(table, monthLabel)}
        toolbar={(table) => (
          <PayablesToolbar
            table={table}
            accounts={accounts}
            categories={categories}
            counterparties={counterparties}
            allTags={allTags}
          />
        )}
      />
    </section>
  )
}

function renderGroupedBody(table: Table<ExpenseRow>, monthLabel: string) {
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

  const currentRows = rows.filter(
    (row) => row.original.periodGroup === 'current-month',
  )
  const previousRows = rows.filter(
    (row) => row.original.periodGroup === 'previous-periods',
  )

  return (
    <>
      {renderGroupSection({
        table,
        rows: currentRows,
        periodGroup: 'current-month',
        label: `Текущий месяц · ${monthLabel}`,
      })}
      {renderGroupSection({
        table,
        rows: previousRows,
        periodGroup: 'previous-periods',
        label: getPeriodLabel('previous-periods'),
      })}
    </>
  )
}

function renderGroupSection({
  table,
  rows,
  periodGroup,
  label,
}: {
  table: Table<ExpenseRow>
  rows: Row<ExpenseRow>[]
  periodGroup: PayablesPeriodGroup
  label: string
}) {
  if (rows.length === 0) return null

  const total = rows.reduce(
    (sum, row) => sum + row.original.outstandingAmount,
    0,
  )
  const countLabel = rows.length === 1 ? 'запись' : 'записей'

  return (
    <>
      <TableRow
        data-period-group={periodGroup}
        className="bg-muted/35 hover:bg-muted/35"
      >
        <TableCell
          colSpan={table.getVisibleLeafColumns().length}
          className="py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">
                {rows.length} {countLabel}
              </span>
            </div>
            <span className="font-semibold tabular-nums text-destructive">
              {formatCurrency(total)} ₽
            </span>
          </div>
        </TableCell>
      </TableRow>

      {rows.map((row) => (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() ? 'selected' : undefined}
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
      ))}
    </>
  )
}
