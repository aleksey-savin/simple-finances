import type { Table } from '@tanstack/react-table'
import { AlertTriangle, ChevronsDown, Rows3, Search, X } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { MultiSelectCombobox } from '#/components/ui/multi-select-combobox'
import type { MultiSelectOption } from '#/components/ui/multi-select-combobox'
import type { TagItem } from '#/components/ui/tag-picker'

import type { IncomeRow, IncomeStatus, NamedEntity } from './types'
import { formatCurrency, getDueMeta } from './utils'

type ReceivablesToolbarProps = {
  table: Table<IncomeRow>
  accounts: NamedEntity[]
  categories: NamedEntity[]
  counterparties: NamedEntity[]
  allTags: TagItem[]
  groupingEnabled?: boolean
  onToggleGrouping?: () => void
  canToggleAll?: boolean
  allExpanded?: boolean
  onToggleAll?: () => void
}

const statusOptions: MultiSelectOption[] = [
  { value: 'partial', label: 'Частично получен' },
  { value: 'overdue', label: 'Просрочен' },
  { value: 'soon', label: 'Скоро' },
  { value: 'ontime', label: 'В срок' },
  { value: 'nodate', label: 'Без срока' },
]

export function ReceivablesToolbar({
  table,
  accounts,
  categories,
  counterparties,
  allTags,
  groupingEnabled = true,
  onToggleGrouping,
  canToggleAll = false,
  allExpanded = false,
  onToggleAll,
}: ReceivablesToolbarProps) {
  const rawGlobalFilter = table.getState().globalFilter
  const accountFilterValue = table.getColumn('account')?.getFilterValue()
  const categoryFilterValue = table.getColumn('category')?.getFilterValue()
  const counterpartyFilterValue = table
    .getColumn('counterparty')
    ?.getFilterValue()
  const overdueFilterValue = table.getColumn('dueDate')?.getFilterValue()
  const statusFilterValue = table.getColumn('status')?.getFilterValue()
  const tagFilterValue = table.getColumn('tags')?.getFilterValue()

  const globalFilter =
    typeof rawGlobalFilter === 'string' ? rawGlobalFilter : ''
  const accountFilter = Array.isArray(accountFilterValue)
    ? accountFilterValue
    : []
  const categoryFilter = Array.isArray(categoryFilterValue)
    ? categoryFilterValue
    : []
  const counterpartyFilter = Array.isArray(counterpartyFilterValue)
    ? counterpartyFilterValue
    : []
  const overdueOnly = overdueFilterValue === true
  const statusFilter = Array.isArray(statusFilterValue)
    ? (statusFilterValue as IncomeStatus[])
    : []
  const tagFilter = Array.isArray(tagFilterValue) ? tagFilterValue : []

  const accountOptions: MultiSelectOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }))
  const categoryOptions: MultiSelectOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))
  const counterpartyOptions: MultiSelectOption[] = counterparties.map(
    (counterparty) => ({
      value: counterparty.id,
      label: counterparty.name,
    }),
  )
  const tagOptions: MultiSelectOption[] = allTags.map((tag) => ({
    value: tag.id,
    label: tag.name,
    color: tag.color,
  }))

  const hasFilters =
    globalFilter ||
    accountFilter.length > 0 ||
    categoryFilter.length > 0 ||
    counterpartyFilter.length > 0 ||
    overdueOnly ||
    statusFilter.length > 0 ||
    tagFilter.length > 0

  const filteredRows = table.getFilteredRowModel().rows
  const filteredTotal = filteredRows.reduce(
    (sum, row) => sum + row.original.outstandingAmount,
    0,
  )
  const filteredOverdue = filteredRows.filter(
    (row) =>
      row.original.paymentStatus !== 'paid' &&
      getDueMeta(row.original.dueDate).isOverdue,
  ).length

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по описанию, категории, счёту…"
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelectCombobox
          options={accountOptions}
          value={accountFilter}
          onValueChange={(value) =>
            table
              .getColumn('account')
              ?.setFilterValue(value.length ? value : undefined)
          }
          placeholder="Все счета"
          searchPlaceholder="Поиск счета…"
          emptyText="Счета не найдены"
        />

        <MultiSelectCombobox
          options={categoryOptions}
          value={categoryFilter}
          onValueChange={(value) =>
            table
              .getColumn('category')
              ?.setFilterValue(value.length ? value : undefined)
          }
          placeholder="Все категории"
          searchPlaceholder="Поиск категории…"
          emptyText="Категории не найдены"
        />

        {counterparties.length > 0 && (
          <MultiSelectCombobox
            options={counterpartyOptions}
            value={counterpartyFilter}
            onValueChange={(value) =>
              table
                .getColumn('counterparty')
                ?.setFilterValue(value.length ? value : undefined)
            }
            placeholder="Все контрагенты"
            searchPlaceholder="Поиск контрагента…"
            emptyText="Контрагенты не найдены"
          />
        )}

        <MultiSelectCombobox
          options={statusOptions}
          value={statusFilter}
          onValueChange={(value) =>
            table
              .getColumn('status')
              ?.setFilterValue(value.length ? value : undefined)
          }
          placeholder="Все статусы"
          searchPlaceholder="Поиск статуса…"
          emptyText="Статусы не найдены"
          className="w-48"
        />

        {allTags.length > 0 && (
          <MultiSelectCombobox
            options={tagOptions}
            value={tagFilter}
            onValueChange={(value) =>
              table
                .getColumn('tags')
                ?.setFilterValue(value.length ? value : undefined)
            }
            placeholder="Все теги"
            searchPlaceholder="Поиск тега…"
            emptyText="Теги не найдены"
          />
        )}

        {onToggleGrouping && (
          <Button
            variant={groupingEnabled ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={onToggleGrouping}
          >
            <Rows3 className="size-3.5" />
            {groupingEnabled ? 'Группировка вкл' : 'Группировка выкл'}
          </Button>
        )}

        {canToggleAll && onToggleAll && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onToggleAll}
          >
            <ChevronsDown className="size-3.5" />
            {allExpanded ? 'Свернуть всё' : 'Показывать всё'}
          </Button>
        )}

        <Button
          variant={overdueOnly ? 'destructive' : 'outline'}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() =>
            table
              .getColumn('dueDate')
              ?.setFilterValue(overdueOnly ? undefined : true)
          }
        >
          <AlertTriangle className="size-3.5" />
          Только просроченные
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
          >
            <X className="size-3.5" />
            Сбросить
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {filteredOverdue > 0 && (
            <span className="font-medium text-destructive">
              {filteredOverdue} просрочено
            </span>
          )}
          <span className="font-semibold text-success tabular-nums">
            Итого: {formatCurrency(filteredTotal)} ₽
          </span>
        </div>
      </div>
    </div>
  )
}
