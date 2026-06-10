import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { MultiSelectCombobox } from '#/components/ui/multi-select-combobox'
import type { MultiSelectOption } from '#/components/ui/multi-select-combobox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatMoney } from '#/lib/format'
import { cn } from '#/lib/utils'
import type { ReportBreakdownRow } from '#/types'

import { fetchReportBreakdown, reportBreakdownQueryKey } from './actions'

export type ReportBreakdownSelection = {
  basis: 'cash' | 'accrual'
  kind: 'income' | 'expense' | 'net'
  month: string // 'YYYY-MM' | 'all'
  months: 6 | 12 | 24
  label: string
  expectedTotal: number
}

type Grouping = 'none' | 'category' | 'counterparty'

function formatRowDate(date: string) {
  return format(new Date(date), 'd MMM yyyy', { locale: ru })
}

function sumValue(rows: ReportBreakdownRow[], isNet: boolean) {
  return rows.reduce(
    (sum, row) =>
      sum + (isNet && row.kind === 'payable' ? -row.amount : row.amount),
    0,
  )
}

function AmountText({
  row,
  isNet,
}: {
  row: ReportBreakdownRow
  isNet: boolean
}) {
  const positive = row.kind === 'receivable'
  const text = isNet
    ? `${positive ? '+' : '−'}${formatMoney(row.amount)}`
    : formatMoney(row.amount)
  return (
    <span
      className={cn(
        'tabular-nums',
        positive ? 'text-success' : 'text-warning',
        row.isForecast && 'opacity-60',
      )}
    >
      {text}
    </span>
  )
}

export function ReportBreakdownSheet({
  selection,
  onOpenChange,
}: {
  selection: ReportBreakdownSelection | null
  onOpenChange: (open: boolean) => void
}) {
  const open = selection !== null
  const [accountFilter, setAccountFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [grouping, setGrouping] = useState<Grouping>('none')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // Reset filters whenever a different figure is opened.
  const selectionKey = selection
    ? `${selection.basis}|${selection.kind}|${selection.month}|${selection.months}`
    : null
  useEffect(() => {
    setAccountFilter([])
    setSearch('')
    setGrouping('none')
    setCollapsedGroups(new Set())
  }, [selectionKey])

  const { data, isPending, isError } = useQuery({
    queryKey: [
      ...reportBreakdownQueryKey,
      selection?.basis,
      selection?.kind,
      selection?.month,
      selection?.months,
    ],
    queryFn: () =>
      fetchReportBreakdown({
        data: {
          basis: selection!.basis,
          kind: selection!.kind,
          month: selection!.month,
          months: selection!.months,
        },
      }),
    enabled: open,
  })

  const isNet = selection?.kind === 'net'
  const rows = useMemo(() => data?.rows ?? [], [data])

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) map.set(row.account.id, row.account.name)
    return Array.from(map, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label, 'ru'),
    )
  }, [rows])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (accountFilter.length > 0 && !accountFilter.includes(row.account.id)) {
        return false
      }
      if (query) {
        const haystack = [
          row.description,
          row.category?.name,
          row.counterparty?.name,
          row.account.name,
          row.amount.toLocaleString('ru-RU'),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [rows, accountFilter, search])

  const groups = useMemo(() => {
    if (grouping === 'none') return null
    const map = new Map<
      string,
      { key: string; label: string; rows: ReportBreakdownRow[] }
    >()
    for (const row of filteredRows) {
      const grouped = grouping === 'category' ? row.category : row.counterparty
      const key = grouped?.id ?? '__none__'
      const label =
        grouped?.name ??
        (grouping === 'category' ? 'Без категории' : 'Без контрагента')
      const bucket = map.get(key)
      if (bucket) bucket.rows.push(row)
      else map.set(key, { key, label, rows: [row] })
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        Math.abs(sumValue(b.rows, isNet)) - Math.abs(sumValue(a.rows, isNet)),
    )
  }, [filteredRows, grouping, isNet])

  const filteredTotal = sumValue(filteredRows, isNet)
  const fullTotal = sumValue(rows, isNet)
  const recurringRemainder = selection ? selection.expectedTotal - fullTotal : 0
  const hasRecurring = Math.abs(recurringRemainder) > 0.005

  const basisLabel = selection?.basis === 'cash' ? 'касса' : 'начисления'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:w-[calc(100vw-16rem)] sm:max-w-[calc(100vw-16rem)]"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{selection?.label}</SheetTitle>
          <SheetDescription>
            Операции, из которых складывается сумма ({basisLabel}). Прогнозные
            (неоплаченные) помечены отдельно.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по таблице…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <MultiSelectCombobox
            options={accountOptions}
            value={accountFilter}
            onValueChange={setAccountFilter}
            placeholder="Все счета"
            searchPlaceholder="Поиск счёта…"
            emptyText="Счета не найдены"
          />

          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">Группировка</span>
            <ToggleGroup
              variant="outline"
              type="single"
              value={grouping}
              onValueChange={(value) => value && setGrouping(value as Grouping)}
            >
              <ToggleGroupItem value="none" className="h-9 px-3 text-sm">
                Нет
              </ToggleGroupItem>
              <ToggleGroupItem value="category" className="h-9 px-3 text-sm">
                Категория
              </ToggleGroupItem>
              <ToggleGroupItem
                value="counterparty"
                className="h-9 px-3 text-sm"
              >
                Контрагент
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4">
          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Загрузка…
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm text-warning">
              Не удалось загрузить операции.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Нет операций.
            </p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-[45%] min-w-[340px] font-bold">
                    Документ
                  </TableHead>
                  <TableHead className="font-bold">Счёт</TableHead>
                  {grouping !== 'category' && (
                    <TableHead className="font-bold">Категория</TableHead>
                  )}
                  {grouping !== 'counterparty' && (
                    <TableHead className="font-bold">Контрагент</TableHead>
                  )}
                  <TableHead className="font-bold">Дата</TableHead>
                  <TableHead className="text-right font-bold">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups
                  ? groups.map((group) => (
                      <BreakdownGroup
                        key={group.key}
                        group={group}
                        grouping={grouping}
                        isNet={isNet}
                        collapsed={collapsedGroups.has(group.key)}
                        onToggle={() => toggleGroup(group.key)}
                      />
                    ))
                  : filteredRows.map((row, index) => (
                      <BreakdownRow
                        key={`${row.id}-${row.isForecast ? 'f' : 'r'}-${index}`}
                        row={row}
                        grouping={grouping}
                        isNet={isNet}
                      />
                    ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex flex-col gap-1 border-t p-4 text-sm">
          <div className="flex items-center justify-between font-semibold">
            <span>Показано ({filteredRows.length})</span>
            <span className="tabular-nums">{formatMoney(filteredTotal)}</span>
          </div>
          {hasRecurring && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Прогноз без детализации (recurring)</span>
              <span className="tabular-nums">
                {recurringRemainder > 0 ? '+' : '−'}
                {formatMoney(Math.abs(recurringRemainder))}
              </span>
            </div>
          )}
          {selection && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Сумма в отчёте</span>
              <span className="tabular-nums">
                {formatMoney(selection.expectedTotal)}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function BreakdownRow({
  row,
  grouping,
  isNet,
}: {
  row: ReportBreakdownRow
  grouping: Grouping
  isNet: boolean
}) {
  return (
    <TableRow>
      <TableCell className="w-[45%] min-w-[340px] whitespace-normal">
        <div className="flex items-center gap-2">
          <span className="wrap-break-word">{row.description}</span>
          {row.isForecast && (
            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-xs">
              прогноз
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {row.account.name}
      </TableCell>
      {grouping !== 'category' && (
        <TableCell className="text-muted-foreground">
          {row.category?.name ?? '—'}
        </TableCell>
      )}
      {grouping !== 'counterparty' && (
        <TableCell className="text-muted-foreground">
          {row.counterparty?.name ?? '—'}
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
        {formatRowDate(row.date)}
      </TableCell>
      <TableCell className="text-right">
        <AmountText row={row} isNet={isNet} />
      </TableCell>
    </TableRow>
  )
}

function BreakdownGroup({
  group,
  grouping,
  isNet,
  collapsed,
  onToggle,
}: {
  group: { key: string; label: string; rows: ReportBreakdownRow[] }
  grouping: Grouping
  isNet: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const subtotal = sumValue(group.rows, isNet)
  const colSpan = grouping === 'none' ? 5 : 4
  return (
    <>
      <TableRow
        className="cursor-pointer select-none hover:bg-muted/40"
        onClick={onToggle}
      >
        <TableCell
          colSpan={colSpan}
          className="bg-muted/30 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          <span className="flex items-center gap-1.5">
            {collapsed ? (
              <ChevronRight className="size-3.5 shrink-0" />
            ) : (
              <ChevronDown className="size-3.5 shrink-0" />
            )}
            {group.label} · {group.rows.length}
          </span>
        </TableCell>
        <TableCell className="bg-muted/30 py-2 text-right text-xs font-semibold tabular-nums">
          {formatMoney(subtotal)}
        </TableCell>
      </TableRow>
      {!collapsed &&
        group.rows.map((row, index) => (
          <BreakdownRow
            key={`${row.id}-${row.isForecast ? 'f' : 'r'}-${index}`}
            row={row}
            grouping={grouping}
            isNet={isNet}
          />
        ))}
    </>
  )
}
