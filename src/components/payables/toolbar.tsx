import type { Table } from '@tanstack/react-table'
import { AlertTriangle, ChevronsDown, Rows3, Search, X } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { MultiSelectCombobox } from '#/components/ui/multi-select-combobox'
import type { MultiSelectOption } from '#/components/ui/multi-select-combobox'
import type { TagItem } from '#/components/ui/tag-picker'

import type {
  ExpenseRow,
  ExpenseStatus,
  NamedEntity,
  PayablesPeriodGroup,
} from './types'
import { formatCurrency } from './utils'

type PayablesToolbarProps = {
  table: Table<ExpenseRow>
  accounts: NamedEntity[]
  categories: NamedEntity[]
  counterparties: NamedEntity[]
  allTags: TagItem[]
  accentColor?: 'red' | 'orange'
  groupingEnabled?: boolean
  onToggleGrouping?: () => void
  canToggleAll?: boolean
  allExpanded?: boolean
  onToggleAll?: () => void
}

const statusOptions: MultiSelectOption[] = [
  { value: 'overdue', label: 'Просрочен' },
  { value: 'soon', label: 'Скоро' },
  { value: 'ontime', label: 'В срок' },
  { value: 'nodate', label: 'Без срока' },
  { value: 'partial', label: 'Частично оплачен' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'projected', label: 'Запланировано' },
]

const periodOptions: MultiSelectOption[] = [
  { value: 'current-month', label: 'Текущий месяц' },
  { value: 'previous-periods', label: 'Прошлые периоды' },
]

export function PayablesToolbar({
  table,
  accounts,
  categories,
  counterparties,
  allTags,
  accentColor = 'red',
  groupingEnabled = true,
  onToggleGrouping,
  canToggleAll = false,
  allExpanded = false,
  onToggleAll,
}: PayablesToolbarProps) {
  const rawGlobalFilter = table.getState().globalFilter
  const accountFilterValue = table.getColumn('account')?.getFilterValue()
  const categoryFilterValue = table.getColumn('category')?.getFilterValue()
  const counterpartyFilterValue = table
    .getColumn('counterparty')
    ?.getFilterValue()
  const overdueFilterValue = table.getColumn('dueDate')?.getFilterValue()
  const statusFilterValue = table.getColumn('status')?.getFilterValue()
  const tagFilterValue = table.getColumn('tags')?.getFilterValue()
  const periodFilterValue = table.getColumn('period')?.getFilterValue()

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
    ? (statusFilterValue as ExpenseStatus[])
    : []
  const tagFilter = Array.isArray(tagFilterValue) ? tagFilterValue : []
  const periodFilter = Array.isArray(periodFilterValue)
    ? (periodFilterValue as PayablesPeriodGroup[])
    : []

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
    tagFilter.length > 0 ||
    periodFilter.length > 0

  const filteredRows = table.getFilteredRowModel().rows
  const filteredTotal = filteredRows.reduce(
    (sum, row) => sum + row.original.outstandingAmount,
    0,
  )

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
          options={periodOptions}
          value={periodFilter}
          onValueChange={(value) =>
            table
              .getColumn('period')
              ?.setFilterValue(value.length ? value : undefined)
          }
          placeholder="Все периоды"
          searchPlaceholder="Поиск периода…"
          emptyText="Периоды не найдены"
          className="w-48"
        />

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
          <span
            className={`font-semibold tabular-nums ${
              accentColor === 'red' ? 'text-destructive' : 'text-warning'
            }`}
          >
            Итого: {formatCurrency(filteredTotal)} ₽
          </span>
        </div>
      </div>
    </div>
  )
}
