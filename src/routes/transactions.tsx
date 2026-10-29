import { InvoiceItem, InvoiceSummary } from '#/components/invoices'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { Input } from '#/components/ui/input'
import { MultiSelectCombobox } from '#/components/ui/multi-select-combobox'
import type { MultiSelectOption } from '#/components/ui/multi-select-combobox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  fetchTransactionsData,
  togglePaid,
} from '#/components/transactions/actions'
import { TransferItem } from '#/components/transactions/transfer-item'

import {
  createFileRoute,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Plus, Search, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import z from 'zod'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useIsMobile } from '#/hooks/use-mobile'
import { PageHeader } from '#/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import { computeDayTotals, getFeedDateKey } from '#/lib/transaction-feed'
import {
  addExpenseTag,
  addIncomeTag,
  createTag,
  fetchTagTotals,
  fetchTags,
  removeExpenseTag,
  removeIncomeTag,
} from '#/components/tags/actions'
import type { TagItem } from '#/components/ui/tag-picker'
import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'
import type {
  AccountTransfer,
  Invoice,
  TagsMap,
  TransactionFeedItem,
} from '#/types'

const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  unallocated: z.coerce.boolean().default(false),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [25, 50, 100].includes(value), {
      message: 'Недопустимый размер страницы',
    })
    .default(25),
})

export const Route = createFileRoute('/transactions')({
  validateSearch: (search) => transactionsSearchSchema.parse(search),
  component: App,
  loader: () => fetchTransactionsData(),
})

function App() {
  const router = useRouter()
  const {
    invoices,
    transfers,
    categories,
    counterparties,
    accounts,
    tagsMap: initialTagsMap,
    allTags: initialAllTags,
    tagTotals: initialTagTotals,
  } = Route.useLoaderData()
  const searchParams = Route.useSearch()
  const isMobile = useIsMobile()
  const currentPage = searchParams.page
  const pageSize = searchParams.pageSize
  const [tagsMap, setTagsMap] = useState<TagsMap>(initialTagsMap)
  const [allTags, setAllTags] = useState<TagItem[]>(initialAllTags)
  const [tagTotals, setTagTotals] = useState(initialTagTotals)
  const [unallocatedFilter, setUnallocatedFilter] = useState(
    searchParams.unallocated,
  )

  const feed: TransactionFeedItem[] = [...invoices, ...transfers].sort(
    (a, b) => getTransactionTime(b) - getTransactionTime(a),
  )

  // Accounts with more than one member are considered shared
  const sharedAccountIds = new Set(
    accounts.filter((a) => a.members.length > 1).map((a) => a.id),
  )

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'payable' | 'receivable' | 'transfer'
  >('all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'paid' | 'unpaid' | 'overdue'
  >('all')
  const [accountFilter, setAccountFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [counterpartyFilter, setCounterpartyFilter] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>(
    undefined,
  )
  const [dateField, setDateField] = useState<'createdAt' | 'paidAt'>(
    'createdAt',
  )
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const accountOptions: MultiSelectOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }))
  const categoryOptions: MultiSelectOption[] = categories.map((item) => ({
    value: item.id,
    label: item.name,
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
  }))

  const refreshTotals = async () => {
    try {
      const [totals, tags] = await Promise.all([fetchTagTotals(), fetchTags()])
      setTagTotals(totals)
      setAllTags(
        tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })),
      )
    } catch {
      // ignore
    }
  }

  const handleTagAdd = async (
    invoiceId: string,
    kind: 'payable' | 'receivable',
    tag: TagItem,
  ) => {
    setTagsMap((prev) => ({
      ...prev,
      [invoiceId]: [
        ...(prev[invoiceId] ?? []).filter((item) => item.id !== tag.id),
        tag,
      ],
    }))

    if (kind === 'payable') {
      await addExpenseTag({ data: { expenseId: invoiceId, tagId: tag.id } })
    } else {
      await addIncomeTag({ data: { incomeId: invoiceId, tagId: tag.id } })
    }

    await refreshTotals()
  }

  const handleTagRemove = async (
    invoiceId: string,
    kind: 'payable' | 'receivable',
    tag: TagItem,
  ) => {
    setTagsMap((prev) => ({
      ...prev,
      [invoiceId]: (prev[invoiceId] ?? []).filter((item) => item.id !== tag.id),
    }))

    if (kind === 'payable') {
      await removeExpenseTag({ data: { expenseId: invoiceId, tagId: tag.id } })
    } else {
      await removeIncomeTag({ data: { incomeId: invoiceId, tagId: tag.id } })
    }

    await refreshTotals()
  }

  const handleTagCreate = async (name: string, color: string) => {
    const created = await createTag({ data: { name, color } })
    const newTag = { id: created.id, name: created.name, color: created.color }
    setAllTags((prev) =>
      [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    )
    await refreshTotals()
    return newTag
  }

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    accountFilter.length > 0 ||
    categoryFilter.length > 0 ||
    counterpartyFilter.length > 0 ||
    tagFilter.length > 0 ||
    unallocatedFilter ||
    dateRange !== undefined

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setAccountFilter([])
    setCategoryFilter([])
    setCounterpartyFilter([])
    setTagFilter([])
    setUnallocatedFilter(false)
    setDateRange(undefined)
    setDateField('createdAt')
    void router.navigate({
      to: '/transactions',
      search: {
        ...searchParams,
        page: 1,
        unallocated: false,
        pageSize,
      },
      replace: true,
    })
  }

  const handleDateRangeChange = (nextRange: DateRange | undefined) => {
    setDateRange(nextRange)
  }

  const filteredFeed = useMemo(() => {
    const now = new Date()
    const fromDate = dateRange?.from ?? null
    const toDate = dateRange?.to
      ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))
      : null

    return feed.filter((item) => {
      const isTransfer = isTransferItem(item)
      const isPaid = item.paidAt !== null
      const isOverdue =
        !isTransfer &&
        !isPaid &&
        item.dueDate !== null &&
        new Date(item.dueDate) < now

      if (typeFilter !== 'all' && item.kind !== typeFilter) return false
      if (
        unallocatedFilter &&
        (isTransfer || (item.category !== null && item.counterparty !== null))
      ) {
        return false
      }
      if (statusFilter === 'paid' && !isPaid) return false
      if (statusFilter === 'unpaid' && isPaid) return false
      if (statusFilter === 'overdue' && !isOverdue) return false
      if (
        accountFilter.length > 0 &&
        !(isTransfer
          ? accountFilter.includes(item.fromAccount.id) ||
            accountFilter.includes(item.toAccount.id)
          : accountFilter.includes(item.currentAccount.id))
      )
        return false
      if (
        categoryFilter.length > 0 &&
        (isTransfer ||
          item.category === null ||
          !categoryFilter.includes(item.category.id))
      )
        return false
      if (
        counterpartyFilter.length > 0 &&
        (isTransfer ||
          !counterpartyFilter.includes(item.counterparty?.id ?? ''))
      )
        return false
      if (
        tagFilter.length > 0 &&
        (isTransfer ||
          !(tagsMap[item.id] ?? []).some((tag) => tagFilter.includes(tag.id)))
      ) {
        return false
      }

      if (fromDate || toDate) {
        const rawDate = isTransfer
          ? dateField === 'paidAt'
            ? item.paidAt
            : item.transferredAt
          : dateField === 'paidAt'
            ? item.paidAt
            : item.createdAt
        // When filtering by paidAt, items with no paidAt are excluded
        if (!rawDate) return false
        const itemDate = new Date(rawDate)
        if (fromDate && itemDate < fromDate) return false
        if (toDate && itemDate > toDate) return false
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const searchableValues = isTransfer
          ? [
              item.description,
              'перевод между счетами',
              item.fromAccount.name,
              item.toAccount.name,
              item.createdByUser.name,
              Number(item.amount).toLocaleString('ru-RU'),
            ]
          : [
              item.description,
              item.category?.name,
              item.counterparty?.name,
              item.currentAccount.name,
              item.createdByUser.name,
              (tagsMap[item.id] ?? []).map((tag) => tag.name).join(' '),
              Number(item.amount).toLocaleString('ru-RU'),
            ]
        const haystack = searchableValues.join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [
    feed,
    search,
    typeFilter,
    statusFilter,
    accountFilter,
    categoryFilter,
    counterpartyFilter,
    tagFilter,
    unallocatedFilter,
    dateRange,
    dateField,
    tagsMap,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredFeed.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedFeed = useMemo(() => {
    const offset = (safePage - 1) * pageSize
    return filteredFeed.slice(offset, offset + pageSize)
  }, [filteredFeed, pageSize, safePage])

  // Paid-only day totals over the whole filtered feed (not the current page)
  const dayTotals = useMemo(
    () => computeDayTotals(filteredFeed),
    [filteredFeed],
  )

  const desktopGroups = useMemo(() => {
    const groups = new Map<string, typeof paginatedFeed>()

    for (const item of paginatedFeed) {
      const key = getFeedDateKey(item)
      const group = groups.get(key)

      if (group) {
        group.push(item)
      } else {
        groups.set(key, [item])
      }
    }

    return Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatGroupDateLabel(dateKey),
      items,
    }))
  }, [paginatedFeed])

  const didMountRef = useRef(false)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    if (currentPage !== 1) {
      void router.navigate({
        to: '/transactions',
        search: {
          ...searchParams,
          page: 1,
          unallocated: unallocatedFilter,
          pageSize,
        },
        replace: true,
      })
    }
  }, [
    router,
    searchParams,
    currentPage,
    pageSize,
    search,
    typeFilter,
    statusFilter,
    accountFilter,
    categoryFilter,
    counterpartyFilter,
    tagFilter,
    unallocatedFilter,
    dateRange,
    dateField,
  ])

  useEffect(() => {
    if (currentPage !== safePage) {
      void router.navigate({
        to: '/transactions',
        search: {
          ...searchParams,
          page: safePage,
          unallocated: unallocatedFilter,
          pageSize,
        },
        replace: true,
      })
    }
  }, [router, searchParams, currentPage, safePage, pageSize, unallocatedFilter])

  const chipClass = (active: boolean) =>
    cn(
      'h-10 gap-1.5 px-3 text-sm font-medium',
      active && 'border-primary/45 bg-primary/10 text-accent-text',
    )
  const periodChipContent = (
    <>
      <CalendarIcon className="size-3.5 text-muted-foreground" />
      <span>Период</span>
      <span className="font-normal text-muted-foreground">
        {dateRange?.from ? (
          dateRange.to ? (
            <>
              {format(dateRange.from, 'dd.MM.yyyy')}
              {' — '}
              {format(dateRange.to, 'dd.MM.yyyy')}
            </>
          ) : (
            format(dateRange.from, 'dd.MM.yyyy')
          )
        ) : (
          'все'
        )}
      </span>
    </>
  )

  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader title="Операции" count={filteredFeed.length}>
        <div className="relative w-full sm:w-[300px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Поиск"
            placeholder="Поиск по описанию, категории, счёту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild>
          <Link to="/transactions/new" search={searchParams}>
            <Plus className="size-4" />
            Новая операция
          </Link>
        </Button>
      </PageHeader>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="mb-4">
        <InvoiceSummary feed={filteredFeed.filter(isInvoiceItem)} />
      </div>

      <TagSummaryPanel totals={tagTotals} className="mb-4" />

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Date field */}
        <ToggleGroup
          variant="outline"
          type="single"
          value={dateField}
          onValueChange={(v) => {
            if (v) setDateField(v as 'createdAt' | 'paidAt')
          }}
        >
          <ToggleGroupItem value="createdAt" className="h-10 px-3 text-sm">
            Создано
          </ToggleGroupItem>
          <ToggleGroupItem value="paidAt" className="h-10 px-3 text-sm">
            Оплачено
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Period */}
        {isMobile ? (
          <>
            <Button
              variant="outline"
              className={chipClass(dateRange !== undefined)}
              onClick={() => {
                setDraftDateRange(dateRange)
                setDatePickerOpen(true)
              }}
            >
              {periodChipContent}
            </Button>
            <Drawer open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Выберите период</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-2 pb-6">
                  <Calendar
                    mode="range"
                    selected={draftDateRange}
                    onSelect={setDraftDateRange}
                    numberOfMonths={2}
                    className="mx-auto"
                  />
                </div>
                <DrawerFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftDateRange(undefined)
                    }}
                  >
                    Сбросить
                  </Button>
                  <Button
                    onClick={() => {
                      setDateRange(draftDateRange)
                      setDatePickerOpen(false)
                    }}
                  >
                    Применить
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={chipClass(dateRange !== undefined)}
              >
                {periodChipContent}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        <MultiSelectCombobox
          label="Счёт"
          options={accountOptions}
          value={accountFilter}
          onValueChange={setAccountFilter}
          placeholder="Все счета"
          searchPlaceholder="Поиск счета…"
          emptyText="Счета не найдены"
        />
        <MultiSelectCombobox
          label="Категория"
          options={categoryOptions}
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          placeholder="Все категории"
          searchPlaceholder="Поиск категории…"
          emptyText="Категории не найдены"
        />
        <MultiSelectCombobox
          label="Контрагенты"
          options={counterpartyOptions}
          value={counterpartyFilter}
          onValueChange={setCounterpartyFilter}
          placeholder="Все контрагенты"
          searchPlaceholder="Поиск контрагента…"
          emptyText="Контрагенты не найдены"
        />
        <MultiSelectCombobox
          label="Метки"
          options={tagOptions}
          value={tagFilter}
          onValueChange={setTagFilter}
          placeholder="Все теги"
          searchPlaceholder="Поиск тега…"
          emptyText="Теги не найдены"
        />

        {/* Type */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
        >
          <SelectTrigger className={chipClass(typeFilter !== 'all')}>
            <span>Тип</span>
            <SelectValue>
              <span className="font-normal text-muted-foreground">
                {typeFilter === 'all'
                  ? 'все'
                  : typeFilter === 'receivable'
                    ? 'поступления'
                    : typeFilter === 'payable'
                      ? 'списания'
                      : 'переводы'}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="receivable">Поступления</SelectItem>
            <SelectItem value="payable">Списания</SelectItem>
            <SelectItem value="transfer">Переводы</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className={chipClass(statusFilter !== 'all')}>
            <span>Статус</span>
            <SelectValue>
              <span className="font-normal text-muted-foreground">
                {statusFilter === 'all'
                  ? 'все'
                  : statusFilter === 'paid'
                    ? 'оплачены'
                    : statusFilter === 'unpaid'
                      ? 'не оплачены'
                      : 'просрочены'}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="paid">Оплачены</SelectItem>
            <SelectItem value="unpaid">Не оплачены</SelectItem>
            <SelectItem value="overdue">Просрочены</SelectItem>
          </SelectContent>
        </Select>

        {/* Unallocated */}
        <Button
          variant="outline"
          className={chipClass(unallocatedFilter)}
          aria-pressed={unallocatedFilter}
          onClick={() => {
            const next = !unallocatedFilter
            setUnallocatedFilter(next)
            void router.navigate({
              to: '/transactions',
              search: {
                ...searchParams,
                page: 1,
                unallocated: next,
                pageSize,
              },
              replace: true,
            })
          }}
        >
          Неразнесённые
        </Button>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-1.5">
            <X className="size-3.5" />
            Сброс
          </Button>
        )}

        {/* Count */}
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {filteredFeed.length} из {feed.length}
        </span>
      </div>

      {filteredFeed.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Ничего не найдено
        </p>
      ) : (
        <div className="flex flex-col sm:border sm:bg-card">
          <div className="flex flex-col gap-2 sm:hidden">
            {paginatedFeed.map((item) =>
              isTransferItem(item) ? (
                <TransferItem
                  key={item.id}
                  layout="mobile"
                  item={item}
                  sharedAccountIds={sharedAccountIds}
                />
              ) : (
                <InvoiceItem
                  key={item.id}
                  layout="mobile"
                  item={item}
                  sharedAccountIds={sharedAccountIds}
                  togglePaid={togglePaid}
                  categories={categories}
                  accounts={accounts}
                  counterparties={counterparties}
                  assignedTags={tagsMap[item.id] ?? []}
                  allTags={allTags}
                  onTagAdd={(tag) => handleTagAdd(item.id, item.kind, tag)}
                  onTagRemove={(tag) =>
                    handleTagRemove(item.id, item.kind, tag)
                  }
                  onTagCreate={handleTagCreate}
                />
              ),
            )}
          </div>

          <div className="hidden px-3 pt-1 sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Документ</TableHead>
                  <TableHead className="w-56">Счёт</TableHead>
                  <TableHead className="w-56">Категория</TableHead>
                  <TableHead className="w-56">Статус</TableHead>
                  <TableHead className="w-40 text-right">Сумма</TableHead>
                  <TableHead className="w-14 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {desktopGroups.map((group) => (
                  <Fragment key={group.dateKey}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="pt-5 pb-2">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-left text-xs font-bold tracking-wider text-faint uppercase">
                            {group.label}
                          </span>
                          {dayTotals.has(group.dateKey) && (
                            <span className="text-sm font-medium text-muted-foreground tabular-nums">
                              {formatDayTotal(dayTotals.get(group.dateKey)!)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.items.map((item) =>
                      isTransferItem(item) ? (
                        <TransferItem
                          key={item.id}
                          layout="desktop"
                          item={item}
                          sharedAccountIds={sharedAccountIds}
                        />
                      ) : (
                        <InvoiceItem
                          key={item.id}
                          layout="desktop"
                          item={item}
                          sharedAccountIds={sharedAccountIds}
                          togglePaid={togglePaid}
                          categories={categories}
                          accounts={accounts}
                          counterparties={counterparties}
                          assignedTags={tagsMap[item.id] ?? []}
                          allTags={allTags}
                          onTagAdd={(tag) =>
                            handleTagAdd(item.id, item.kind, tag)
                          }
                          onTagRemove={(tag) =>
                            handleTagRemove(item.id, item.kind, tag)
                          }
                          onTagCreate={handleTagCreate}
                        />
                      ),
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:border-t sm:border-border-soft sm:px-5 sm:py-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              Страница {safePage} из {totalPages} · всего страниц {totalPages} ·
              всего записей {filteredFeed.length}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  На странице
                </span>
                <select
                  className="flex h-10 w-24 border border-input bg-background px-3 py-1 text-sm shadow-xs"
                  value={String(pageSize)}
                  onChange={(event) => {
                    void router.navigate({
                      to: '/transactions',
                      search: {
                        ...searchParams,
                        page: 1,
                        unallocated: unallocatedFilter,
                        pageSize: Number(event.target.value) as 25 | 50 | 100,
                      },
                      replace: true,
                    })
                  }}
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  router.navigate({
                    to: '/transactions',
                    search: {
                      ...searchParams,
                      page: Math.max(1, safePage - 1),
                      unallocated: unallocatedFilter,
                      pageSize,
                    },
                    replace: true,
                  })
                }
                disabled={safePage <= 1}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.navigate({
                    to: '/transactions',
                    search: {
                      ...searchParams,
                      page: Math.min(totalPages, safePage + 1),
                      unallocated: unallocatedFilter,
                      pageSize,
                    },
                    replace: true,
                  })
                }
                disabled={safePage >= totalPages}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </div>
      )}
      <Outlet />
    </div>
  )
}

function formatGroupDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return dateKey
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  if (isSameYear(date, new Date())) {
    return format(date, 'd MMMM, EEEE', { locale: ru })
  }
  return format(date, 'd MMMM yyyy, EEEE', { locale: ru })
}

function formatDayTotal(value: number) {
  const formatted = Math.abs(value).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '\u2212' : '+'}${formatted}`
}

function isTransferItem(item: TransactionFeedItem): item is AccountTransfer {
  return item.kind === 'transfer'
}

function isInvoiceItem(item: TransactionFeedItem): item is Invoice {
  return item.kind !== 'transfer'
}

function getTransactionTime(item: TransactionFeedItem) {
  return new Date(
    isTransferItem(item) ? item.transferredAt : item.createdAt,
  ).getTime()
}
