import { Fragment, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

import { flexRender } from '@tanstack/react-table'
import type { ColumnDef, Row, SortingState, Table } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'

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
  const [groupingEnabled, setGroupingEnabled] = useState(true)
  const [expandedCounterpartyIds, setExpandedCounterpartyIds] = useState<
    Set<string>
  >(() => new Set())
  const counterpartyIds = [
    ...new Set(
      data
        .map((row) => row.counterparty?.id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const canToggleAll = counterpartyIds.length > 0
  const allExpanded =
    counterpartyIds.length > 0 &&
    counterpartyIds.every((counterpartyId) =>
      expandedCounterpartyIds.has(counterpartyId),
    )

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
        renderBody={(table) =>
          renderGroupedBody(
            table,
            monthLabel,
            groupingEnabled,
            expandedCounterpartyIds,
            setExpandedCounterpartyIds,
          )
        }
        toolbar={(table) => (
          <PayablesToolbar
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
              setExpandedCounterpartyIds(
                allExpanded ? new Set() : new Set(counterpartyIds),
              )
            }
          />
        )}
      />
    </section>
  )
}

function renderGroupedBody(
  table: Table<ExpenseRow>,
  monthLabel: string,
  groupingEnabled: boolean,
  expandedCounterpartyIds: Set<string>,
  setExpandedCounterpartyIds: Dispatch<SetStateAction<Set<string>>>,
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
        groupingEnabled,
        expandedCounterpartyIds,
        setExpandedCounterpartyIds,
      })}
      {renderGroupSection({
        table,
        rows: previousRows,
        periodGroup: 'previous-periods',
        label: getPeriodLabel('previous-periods'),
        groupingEnabled,
        expandedCounterpartyIds,
        setExpandedCounterpartyIds,
      })}
    </>
  )
}

function renderGroupSection({
  table,
  rows,
  periodGroup,
  label,
  groupingEnabled,
  expandedCounterpartyIds,
  setExpandedCounterpartyIds,
}: {
  table: Table<ExpenseRow>
  rows: Row<ExpenseRow>[]
  periodGroup: PayablesPeriodGroup
  label: string
  groupingEnabled: boolean
  expandedCounterpartyIds: Set<string>
  setExpandedCounterpartyIds: Dispatch<SetStateAction<Set<string>>>
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

      {groupingEnabled
        ? renderCounterpartyGroups(
            table,
            rows,
            expandedCounterpartyIds,
            setExpandedCounterpartyIds,
          )
        : rows.map((row) => renderPayableRow(row))}
    </>
  )
}

function renderCounterpartyGroups(
  table: Table<ExpenseRow>,
  rows: Row<ExpenseRow>[],
  expandedCounterpartyIds: Set<string>,
  setExpandedCounterpartyIds: Dispatch<SetStateAction<Set<string>>>,
) {
  const groupedRows = groupExpenseRowsByCounterparty(rows)

  return groupedRows.map((entry) => {
    if (entry.kind === 'row') {
      return renderPayableRow(entry.row)
    }

    const isExpanded = expandedCounterpartyIds.has(entry.counterparty.id)
    const total = entry.rows.reduce(
      (sum, row) => sum + row.original.outstandingAmount,
      0,
    )
    const countLabel = entry.rows.length === 1 ? 'запись' : 'записей'

    return (
      <Fragment key={`counterparty-group-${entry.counterparty.id}`}>
        <TableRow className="bg-muted/25 hover:bg-muted/25">
          <TableCell
            colSpan={table.getVisibleLeafColumns().length}
            className="py-2.5"
          >
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
              onClick={() =>
                setExpandedCounterpartyIds((current) => {
                  const next = new Set(current)
                  if (next.has(entry.counterparty.id)) {
                    next.delete(entry.counterparty.id)
                  } else {
                    next.add(entry.counterparty.id)
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
                <span className="font-bold">{entry.counterparty.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {entry.rows.length} {countLabel}
              </span>
              <span className="ml-auto text-sm font-semibold text-destructive tabular-nums">
                {formatCurrency(total)} ₽
              </span>
            </button>
          </TableCell>
        </TableRow>

        {isExpanded &&
          entry.rows.map((row, index) =>
            renderPayableRow(
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

function renderPayableRow(row: Row<ExpenseRow>, className?: string) {
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

function groupExpenseRowsByCounterparty(rows: Row<ExpenseRow>[]) {
  const groups: (
    | { kind: 'row'; row: Row<ExpenseRow> }
    | {
        kind: 'counterparty'
        counterparty: NonNullable<ExpenseRow['counterparty']>
        rows: Row<ExpenseRow>[]
      }
  )[] = []
  const groupByCounterpartyId = new Map<
    string,
    {
      kind: 'counterparty'
      counterparty: NonNullable<ExpenseRow['counterparty']>
      rows: Row<ExpenseRow>[]
    }
  >()

  for (const row of rows) {
    const counterparty = row.original.counterparty

    if (!counterparty) {
      groups.push({ kind: 'row', row })
      continue
    }

    const existing = groupByCounterpartyId.get(counterparty.id)
    if (existing) {
      existing.rows.push(row)
      continue
    }

    const nextGroup = {
      kind: 'counterparty' as const,
      counterparty,
      rows: [row],
    }
    groupByCounterpartyId.set(counterparty.id, nextGroup)
    groups.push(nextGroup)
  }

  return groups
}
