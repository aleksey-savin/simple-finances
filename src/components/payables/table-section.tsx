import { Fragment, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

import { flexRender } from '@tanstack/react-table'
import type { ColumnDef, Row, SortingState, Table } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { DataTable } from '#/components/ui/data-table'
import type { TagItem } from '#/components/ui/tag-picker'
import { TableCell, TableRow } from '#/components/ui/table'

import { PayablesToolbar } from './toolbar'
import type {
  ExpenseRow,
  NamedEntity,
  PayablesGroupMode,
  PayablesPeriodGroup,
} from './types'
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
  const [groupMode, setGroupMode] = useState<PayablesGroupMode>('none')
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  )
  const groupIds = getExpenseGroupIds(data, groupMode)
  const canToggleAll = groupIds.length > 0
  const allExpanded =
    groupIds.length > 0 &&
    groupIds.every((groupId) => expandedGroupIds.has(groupId))

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
            groupMode,
            expandedGroupIds,
            setExpandedGroupIds,
          )
        }
        toolbar={(table) => (
          <PayablesToolbar
            table={table}
            accounts={accounts}
            categories={categories}
            counterparties={counterparties}
            allTags={allTags}
            groupMode={groupMode}
            onGroupModeChange={(nextMode) => {
              setGroupMode(nextMode)
              setExpandedGroupIds(new Set())
            }}
            canToggleAll={groupMode !== 'none' && canToggleAll}
            allExpanded={allExpanded}
            onToggleAll={() =>
              setExpandedGroupIds(allExpanded ? new Set() : new Set(groupIds))
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
  groupMode: PayablesGroupMode,
  expandedGroupIds: Set<string>,
  setExpandedGroupIds: Dispatch<SetStateAction<Set<string>>>,
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
        groupMode,
        expandedGroupIds,
        setExpandedGroupIds,
      })}
      {renderGroupSection({
        table,
        rows: previousRows,
        periodGroup: 'previous-periods',
        label: getPeriodLabel('previous-periods'),
        groupMode,
        expandedGroupIds,
        setExpandedGroupIds,
      })}
    </>
  )
}

function renderGroupSection({
  table,
  rows,
  periodGroup,
  label,
  groupMode,
  expandedGroupIds,
  setExpandedGroupIds,
}: {
  table: Table<ExpenseRow>
  rows: Row<ExpenseRow>[]
  periodGroup: PayablesPeriodGroup
  label: string
  groupMode: PayablesGroupMode
  expandedGroupIds: Set<string>
  setExpandedGroupIds: Dispatch<SetStateAction<Set<string>>>
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

      {groupMode !== 'none'
        ? renderExpenseGroups(
            table,
            rows,
            groupMode,
            expandedGroupIds,
            setExpandedGroupIds,
          )
        : rows.map((row) => renderPayableRow(row))}
    </>
  )
}

function renderExpenseGroups(
  table: Table<ExpenseRow>,
  rows: Row<ExpenseRow>[],
  groupMode: Exclude<PayablesGroupMode, 'none'>,
  expandedGroupIds: Set<string>,
  setExpandedGroupIds: Dispatch<SetStateAction<Set<string>>>,
) {
  const groupedRows = groupExpenseRows(rows, groupMode)

  return groupedRows.map((entry) => {
    if (entry.kind === 'row') {
      return renderPayableRow(entry.row)
    }

    const isExpanded = expandedGroupIds.has(entry.id)
    const total = entry.rows.reduce(
      (sum, row) => sum + row.original.outstandingAmount,
      0,
    )
    const countLabel = entry.rows.length === 1 ? 'запись' : 'записей'

    return (
      <Fragment key={`${groupMode}-group-${entry.id}`}>
        <TableRow className="bg-muted/25 hover:bg-muted/25">
          <TableCell
            colSpan={table.getVisibleLeafColumns().length}
            className="py-2.5"
          >
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
              onClick={() =>
                setExpandedGroupIds((current) => {
                  const next = new Set(current)
                  if (next.has(entry.id)) {
                    next.delete(entry.id)
                  } else {
                    next.add(entry.id)
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
                <span className="font-bold">{entry.label}</span>
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

function getExpenseGroupIds(rows: ExpenseRow[], groupMode: PayablesGroupMode) {
  if (groupMode === 'none') return []

  return [
    ...new Set(
      rows
        .map((row) => getExpenseGroupEntity(row, groupMode)?.id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
}

function groupExpenseRows(
  rows: Row<ExpenseRow>[],
  groupMode: Exclude<PayablesGroupMode, 'none'>,
) {
  const groups: (
    | { kind: 'row'; row: Row<ExpenseRow> }
    | {
        kind: 'group'
        id: string
        label: string
        rows: Row<ExpenseRow>[]
      }
  )[] = []
  const groupsById = new Map<
    string,
    {
      kind: 'group'
      id: string
      label: string
      rows: Row<ExpenseRow>[]
    }
  >()

  for (const row of rows) {
    const entity = getExpenseGroupEntity(row.original, groupMode)

    if (!entity) {
      groups.push({ kind: 'row', row })
      continue
    }

    const existing = groupsById.get(entity.id)
    if (existing) {
      existing.rows.push(row)
      continue
    }

    const nextGroup = {
      kind: 'group' as const,
      id: entity.id,
      label: entity.name,
      rows: [row],
    }
    groupsById.set(entity.id, nextGroup)
    groups.push(nextGroup)
  }

  return groups
}

function getExpenseGroupEntity(
  row: ExpenseRow,
  groupMode: Exclude<PayablesGroupMode, 'none'>,
) {
  if (groupMode === 'category') return row.category
  return row.counterparty
}
