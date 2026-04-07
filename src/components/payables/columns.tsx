import type { ColumnDef } from '@tanstack/react-table'
import { Clock } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { DataTableColumnHeader } from '#/components/ui/data-table'
import { TagChips, TagPicker } from '#/components/ui/tag-picker'
import type { TagItem } from '#/components/ui/tag-picker'

import { PayablesDueDateCell } from './due-date-cell'
import { PayablesStatusBadge } from './status-badge'
import type { ExpenseRow, TagsMap } from './types'
import {
  formatCurrency,
  formatDate,
  getExpenseStatus,
  idFilterFn,
  overdueFilterFn,
  periodFilterFn,
  statusFilterFn,
} from './utils'

type PayablesColumnOptions = {
  tagsMap: TagsMap
  allTags: TagItem[]
  onTagAdd: (expenseId: string, tag: TagItem) => Promise<void>
  onTagRemove: (expenseId: string, tag: TagItem) => Promise<void>
  onTagCreate: (name: string, color: string) => Promise<TagItem>
}

export function buildPayablesColumns({
  tagsMap,
  allTags,
  onTagAdd,
  onTagRemove,
  onTagCreate,
}: PayablesColumnOptions): ColumnDef<ExpenseRow, unknown>[] {
  return [
    {
      id: 'period',
      accessorFn: (row) => row.periodGroup,
      filterFn: periodFilterFn,
      header: '',
      cell: () => null,
      enableSorting: false,
      size: 0,
      minSize: 0,
      maxSize: 0,
      meta: {
        headerClassName: 'hidden',
        cellClassName: 'hidden',
      },
    },
    {
      id: 'counterparty',
      accessorFn: (row) => row.counterparty?.name ?? '',
      filterFn: idFilterFn,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Контрагент" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.counterparty?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Описание" />
      ),
      cell: ({ row }) => {
        const tags = tagsMap[row.original.id] ?? []

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium wrap-break-word whitespace-normal ${
                  row.original.isProjected ? 'text-muted-foreground' : ''
                }`}
              >
                {row.original.description}
              </span>

              {row.original.isProjected && (
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>

            <TagChips tags={tags} />
          </div>
        )
      },
      minSize: 160,
    },
    {
      id: 'category',
      accessorFn: (row) => row.category.name,
      filterFn: idFilterFn,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Категория" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {row.original.category.name}
        </Badge>
      ),
    },
    {
      id: 'account',
      accessorFn: (row) => row.currentAccount.name,
      filterFn: idFilterFn,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Счёт" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.currentAccount.name}
        </span>
      ),
    },
    {
      id: 'amount',
      accessorFn: (row) => Number(row.amount),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Сумма"
          className="justify-end w-full"
        />
      ),
      cell: ({ getValue, row }) => (
        <span
          className={`block text-right font-semibold tabular-nums ${
            row.original.isProjected
              ? 'text-muted-foreground'
              : row.original.paymentStatus === 'paid'
                ? 'text-foreground/60 line-through'
                : row.original.paymentStatus === 'partial'
                  ? 'text-warning'
                  : 'text-destructive'
          }`}
        >
          −{formatCurrency(getValue() as number)} ₽
        </span>
      ),
      meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    },
    {
      id: 'createdAt',
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Дата создания" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'dueDate',
      accessorFn: (row) =>
        row.dueDate ? new Date(row.dueDate).getTime() : Infinity,
      filterFn: overdueFilterFn,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Срок оплаты" />
      ),
      cell: ({ row }) => <PayablesDueDateCell row={row.original} />,
    },
    {
      id: 'status',
      enableSorting: false,
      filterFn: statusFilterFn,
      accessorFn: (row) => getExpenseStatus(row),
      header: 'Статус',
      cell: ({ row }) => <PayablesStatusBadge row={row.original} />,
    },
    {
      id: 'tags',
      enableSorting: false,
      size: 40,
      accessorFn: (row) => (tagsMap[row.id] ?? []).map((tag) => tag.id).join(','),
      filterFn: (row, _id, value: string[]) => {
        if (value.length === 0) return true
        return (tagsMap[row.original.id] ?? []).some((tag) =>
          value.includes(tag.id),
        )
      },
      header: '',
      cell: ({ row }) => {
        if (row.original.isProjected) return null

        const tags = tagsMap[row.original.id] ?? []

        return (
          <TagPicker
            assignedTags={tags}
            allTags={allTags}
            onAdd={(tag) => onTagAdd(row.original.id, tag)}
            onRemove={(tag) => onTagRemove(row.original.id, tag)}
            onCreate={onTagCreate}
          />
        )
      },
    },
  ]
}
