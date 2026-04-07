import type { ColumnDef } from '@tanstack/react-table'

import { Badge } from '#/components/ui/badge'
import { DataTableColumnHeader } from '#/components/ui/data-table'
import { TagChips, TagPicker } from '#/components/ui/tag-picker'
import type { TagItem } from '#/components/ui/tag-picker'

import { ReceivablesDueDateCell } from './due-date-cell'
import { ReceivablesStatusBadge } from './status-badge'
import type { IncomeRow, TagsMap } from './types'
import {
  formatCurrency,
  formatDate,
  getIncomeStatus,
  idFilterFn,
  overdueFilterFn,
  statusFilterFn,
} from './utils'

type ReceivablesColumnOptions = {
  tagsMap: TagsMap
  allTags: TagItem[]
  onTagAdd: (incomeId: string, tag: TagItem) => Promise<void>
  onTagRemove: (incomeId: string, tag: TagItem) => Promise<void>
  onTagCreate: (name: string, color: string) => Promise<TagItem>
}

export function buildReceivablesColumns({
  tagsMap,
  allTags,
  onTagAdd,
  onTagRemove,
  onTagCreate,
}: ReceivablesColumnOptions): ColumnDef<IncomeRow, unknown>[] {
  return [
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
            <span className="font-medium wrap-break-word whitespace-normal w-full">
              {row.original.description}
            </span>
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
            row.original.paymentStatus === 'partial'
              ? 'text-warning'
              : 'text-primary'
          }`}
        >
          +{formatCurrency(getValue() as number)} ₽
        </span>
      ),
      meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    },
    {
      id: 'createdAt',
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Создано" />
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
        <DataTableColumnHeader column={column} title="Срок получения" />
      ),
      cell: ({ row }) => <ReceivablesDueDateCell row={row.original} />,
    },
    {
      id: 'status',
      header: 'Статус',
      enableSorting: false,
      filterFn: statusFilterFn,
      accessorFn: (row) => getIncomeStatus(row),
      cell: ({ row }) => <ReceivablesStatusBadge row={row.original} />,
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
