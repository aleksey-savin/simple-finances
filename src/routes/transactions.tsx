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

import { db } from '#/db'
import {
  category,
  currentAccount,
  currentAccountUser,
  invoice,
  invoiceTag,
} from '#/db/schema'

import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { eq, inArray, or } from 'drizzle-orm'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Search, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import z from 'zod'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useIsMobile } from '#/hooks/use-mobile'
import { syncRecurringRulesForAccounts } from '#/lib/recurring'
import { Card } from '#/components/ui/card'
import { getPaymentState } from '#/lib/invoice-payment'
import {
  addExpenseTag,
  addIncomeTag,
  createTag,
  fetchTagTotals,
  fetchTags,
  removeExpenseTag,
  removeIncomeTag,
} from '#/routes/api/-tags'
import type { TagItem } from '#/components/ui/tag-picker'
import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'

type TagsMap = Partial<Record<string, TagItem[]>>

const fetchData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session || !session.user.id) {
    throw new Error('Не авторизован')
  }

  const userId = session.user.id

  const memberships = await db
    .select({
      currentAccountId: currentAccountUser.currentAccountId,
      role: currentAccountUser.role,
    })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  const accountIds = memberships.map((m) => m.currentAccountId)
  const roleByAccountId = new Map(
    memberships.map((m) => [m.currentAccountId, m.role]),
  )

  if (accountIds.length === 0) {
    const categories = await db.query.category.findMany({
      where: or(eq(category.createdBy, userId), eq(category.isShared, true)),
    })
    return {
      invoices: [],
      categories,
      accounts: [],
      counterparties: [],
      tagsMap: {} as TagsMap,
      allTags: [] as TagItem[],
      tagTotals: [],
    }
  }

  await syncRecurringRulesForAccounts(accountIds)

  const [invoices, categories, counterparties, accountsData] =
    await Promise.all([
      db.query.invoice.findMany({
        where: inArray(invoice.currentAccountId, accountIds),
        columns: {
          id: true,
          kind: true,
          amount: true,
          description: true,
          categoryId: true,
          currentAccountId: true,
          counterpartyId: true,
          createdAt: true,
          dueDate: true,
          paidAt: true,
          archivedAt: true,
          createdBy: true,
          linkedInvoiceId: true,
        },
        with: {
          category: { columns: { id: true, name: true } },
          counterparty: { columns: { id: true, name: true } },
          currentAccount: { columns: { id: true, name: true } },
          createdByUser: { columns: { id: true, name: true } },
          settlements: {
            columns: { id: true, amount: true, settledAt: true },
            with: {
              bankTransaction: {
                columns: {
                  id: true,
                  amount: true,
                  direction: true,
                  bookedAt: true,
                  description: true,
                  counterpartyNameRaw: true,
                  currentAccountId: true,
                },
                with: {
                  currentAccount: {
                    columns: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.query.category.findMany({
        where: or(eq(category.createdBy, userId), eq(category.isShared, true)),
      }),
      db.query.counterparty.findMany({}),
      db.query.currentAccount.findMany({
        where: inArray(currentAccount.id, accountIds),
        with: {
          members: {
            with: {
              user: { columns: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ])

  const accounts = accountsData.map((a) => ({
    ...a,
    role: roleByAccountId.get(a.id) ?? 'viewer',
  }))

  const normalizedInvoices = invoices.map((item) => {
    const paymentState = getPaymentState({
      amount: item.amount,
      paidAt: item.paidAt,
      settlements: item.settlements,
    })

    return {
      ...item,
      paidAt: paymentState.effectivePaidAt,
      manualPaid: paymentState.manualPaid,
      settledAmount: paymentState.settledAmount,
      outstandingAmount: paymentState.outstandingAmount,
      paymentStatus: paymentState.status,
    }
  })

  const invoiceIds = normalizedInvoices.map((item) => item.id)
  const invoiceTagRows =
    invoiceIds.length > 0
      ? await db.query.invoiceTag.findMany({
          where: inArray(invoiceTag.invoiceId, invoiceIds),
          with: { tag: true },
        })
      : []

  const tagsMap: TagsMap = {}
  for (const row of invoiceTagRows) {
    if (!tagsMap[row.invoiceId]) tagsMap[row.invoiceId] = []
    tagsMap[row.invoiceId].push({
      id: row.tag.id,
      name: row.tag.name,
      color: row.tag.color,
    })
  }

  const allTags = await db.query.tag.findMany({
    orderBy: (table, { asc }) => asc(table.name),
  })

  const allInvoiceTags = await db.query.invoiceTag.findMany({
    with: {
      invoice: {
        columns: {
          amount: true,
          currentAccountId: true,
          paidAt: true,
          kind: true,
        },
        with: {
          settlements: {
            columns: { amount: true, settledAt: true },
          },
        },
      },
      tag: {
        columns: {
          id: true,
        },
      },
    },
  })

  const accountIdSet = new Set(accountIds)
  const tagTotals = allTags
    .map((tag) => {
      const expenseTotal = allInvoiceTags
        .filter(
          (entry) =>
            entry.tag.id === tag.id &&
            entry.invoice.kind === 'payable' &&
            accountIdSet.has(entry.invoice.currentAccountId) &&
            getPaymentState({
              amount: entry.invoice.amount,
              paidAt: entry.invoice.paidAt,
              settlements: entry.invoice.settlements,
            }).status !== 'paid',
        )
        .reduce((sum, entry) => {
          const paymentState = getPaymentState({
            amount: entry.invoice.amount,
            paidAt: entry.invoice.paidAt,
            settlements: entry.invoice.settlements,
          })

          return sum + paymentState.outstandingAmount
        }, 0)

      const incomeTotal = allInvoiceTags
        .filter(
          (entry) =>
            entry.tag.id === tag.id &&
            entry.invoice.kind === 'receivable' &&
            accountIdSet.has(entry.invoice.currentAccountId) &&
            getPaymentState({
              amount: entry.invoice.amount,
              paidAt: entry.invoice.paidAt,
              settlements: entry.invoice.settlements,
            }).status !== 'paid',
        )
        .reduce((sum, entry) => {
          const paymentState = getPaymentState({
            amount: entry.invoice.amount,
            paidAt: entry.invoice.paidAt,
            settlements: entry.invoice.settlements,
          })

          return sum + paymentState.outstandingAmount
        }, 0)

      return {
        tag: { id: tag.id, name: tag.name, color: tag.color },
        expenseTotal,
        incomeTotal,
        net: incomeTotal - expenseTotal,
      }
    })
    .filter((entry) => entry.expenseTotal > 0 || entry.incomeTotal > 0)

  return {
    invoices: normalizedInvoices,
    categories,
    counterparties,
    accounts,
    tagsMap,
    allTags: allTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    tagTotals,
  }
})

const togglePaidSchema = z.object({
  id: z.string(),
  kind: z.enum(['payable', 'receivable']),
  paid: z.boolean(),
})

const togglePaid = createServerFn({ method: 'POST' })
  .inputValidator(togglePaidSchema)
  .handler(async ({ data }) => {
    await db
      .update(invoice)
      .set({ paidAt: data.paid ? new Date() : null })
      .where(eq(invoice.id, data.id))
  })

const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
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
  loader: () => fetchData(),
})

function App() {
  const router = useRouter()
  const {
    invoices,
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

  const feed = [...invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  // Accounts with more than one member are considered shared
  const sharedAccountIds = new Set(
    accounts.filter((a) => a.members.length > 1).map((a) => a.id),
  )

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'payable' | 'receivable'
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
    dateRange !== undefined

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setAccountFilter([])
    setCategoryFilter([])
    setCounterpartyFilter([])
    setTagFilter([])
    setDateRange(undefined)
    setDateField('createdAt')
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
      const isPaid = item.paidAt !== null
      const isOverdue =
        !isPaid && item.dueDate !== null && new Date(item.dueDate) < now

      if (typeFilter !== 'all' && item.kind !== typeFilter) return false
      if (statusFilter === 'paid' && !isPaid) return false
      if (statusFilter === 'unpaid' && isPaid) return false
      if (statusFilter === 'overdue' && !isOverdue) return false
      if (
        accountFilter.length > 0 &&
        !accountFilter.includes(item.currentAccount.id)
      )
        return false
      if (
        categoryFilter.length > 0 &&
        !categoryFilter.includes(item.category.id)
      )
        return false
      if (
        counterpartyFilter.length > 0 &&
        !counterpartyFilter.includes(item.counterparty?.id ?? '')
      )
        return false
      if (
        tagFilter.length > 0 &&
        !(tagsMap[item.id] ?? []).some((tag) => tagFilter.includes(tag.id))
      ) {
        return false
      }

      if (fromDate || toDate) {
        const rawDate = dateField === 'paidAt' ? item.paidAt : item.createdAt
        // When filtering by paidAt, items with no paidAt are excluded
        if (!rawDate) return false
        const itemDate = new Date(rawDate)
        if (fromDate && itemDate < fromDate) return false
        if (toDate && itemDate > toDate) return false
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const haystack = [
          item.description,
          item.category.name,
          item.counterparty?.name,
          item.currentAccount.name,
          item.createdByUser.name,
          (tagsMap[item.id] ?? []).map((tag) => tag.name).join(' '),
          Number(item.amount).toLocaleString('ru-RU'),
        ]
          .join(' ')
          .toLowerCase()
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

  const desktopGroups = useMemo(() => {
    const groups = new Map<string, typeof paginatedFeed>()

    for (const item of paginatedFeed) {
      const key = format(new Date(item.createdAt), 'yyyy-MM-dd')
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
          pageSize,
        },
        replace: true,
      })
    }
  }, [router, searchParams, currentPage, safePage, pageSize])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <InvoiceSummary feed={filteredFeed} />

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Card className="flex flex-col gap-6 p-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск по описанию, категории, счёту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap w-full lg:justify-between items-center gap-6">
          {/* Type */}
          <ToggleGroup variant="outline" type="single" defaultValue="all">
            {(['all', 'receivable', 'payable'] as const).map((t) => (
              <ToggleGroupItem
                value={t}
                key={t}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all'
                  ? 'Все'
                  : t === 'receivable'
                    ? 'Поступления'
                    : 'Списания'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* Date range + field toggle */}
          <div className="flex items-center gap-1">
            {isMobile ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 font-normal text-sm min-w-40"
                  onClick={() => {
                    setDraftDateRange(dateRange)
                    setDatePickerOpen(true)
                  }}
                >
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
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
                    <span className="text-muted-foreground">Период</span>
                  )}
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
                    size="sm"
                    className="h-9 gap-2 font-normal text-sm min-w-40"
                  >
                    <CalendarIcon className="size-3.5 text-muted-foreground" />
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
                      <span className="text-muted-foreground">Период</span>
                    )}
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

            <ToggleGroup
              variant="outline"
              type="single"
              value={dateField}
              onValueChange={(v) => {
                if (v) setDateField(v as 'createdAt' | 'paidAt')
              }}
            >
              <ToggleGroupItem value="createdAt" className="h-9 text-sm px-3">
                Создан
              </ToggleGroupItem>
              <ToggleGroupItem value="paidAt" className="h-9 text-sm px-3">
                Оплачен
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {/* Status */}
          <ToggleGroup variant="outline" type="single" defaultValue="all">
            {(
              [
                ['all', 'Все'],
                ['paid', 'Оплачены'],
                ['unpaid', 'Неоплачены'],
                ['overdue', 'Просрочены'],
              ] as const
            ).map(([val, label]) => (
              <ToggleGroupItem
                value={val}
                key={val}
                onClick={() => setStatusFilter(val)}
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <MultiSelectCombobox
            options={accountOptions}
            value={accountFilter}
            onValueChange={setAccountFilter}
            placeholder="Все счета"
            searchPlaceholder="Поиск счета…"
            emptyText="Счета не найдены"
          />
          <MultiSelectCombobox
            options={categoryOptions}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            placeholder="Все категории"
            searchPlaceholder="Поиск категории…"
            emptyText="Категории не найдены"
          />
          <MultiSelectCombobox
            options={counterpartyOptions}
            value={counterpartyFilter}
            onValueChange={setCounterpartyFilter}
            placeholder="Все контрагенты"
            searchPlaceholder="Поиск контрагента…"
            emptyText="Контрагенты не найдены"
          />
          <MultiSelectCombobox
            options={tagOptions}
            value={tagFilter}
            onValueChange={setTagFilter}
            placeholder="Все теги"
            searchPlaceholder="Поиск тега…"
            emptyText="Теги не найдены"
          />
          {/* Clear */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5"
            >
              <X className="size-3.5" />
              Сброс
            </Button>
          )}
          {/* Count */}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredFeed.length} из {feed.length}
          </span>
        </div>
      </Card>

      {filteredFeed.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Ничего не найдено
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:hidden">
            {paginatedFeed.map((item) => (
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
                onTagRemove={(tag) => handleTagRemove(item.id, item.kind, tag)}
                onTagCreate={handleTagCreate}
              />
            ))}
          </div>

          <Card className="hidden sm:block p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Документ</TableHead>
                  <TableHead className="w-56 text-center font-bold">
                    Cчёт
                  </TableHead>
                  <TableHead className="w-56 text-center font-bold">
                    Категория
                  </TableHead>
                  <TableHead className="w-56 font-bold text-center">
                    Статус
                  </TableHead>
                  <TableHead className="w-40 text-right font-bold">
                    Сумма
                  </TableHead>
                  <TableHead className="w-14 text-right font-bold" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {desktopGroups.map((group) => (
                  <Fragment key={group.dateKey}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="bg-muted/30 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase text-center"
                      >
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {group.items.map((item) => (
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
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Страница {safePage} из {totalPages} · всего страниц {totalPages} ·
              всего записей {filteredFeed.length}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  На странице
                </span>
                <select
                  className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                  value={String(pageSize)}
                  onChange={(event) => {
                    void router.navigate({
                      to: '/transactions',
                      search: {
                        ...searchParams,
                        page: 1,
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
                size="sm"
                onClick={() =>
                  router.navigate({
                    to: '/transactions',
                    search: {
                      ...searchParams,
                      page: Math.max(1, safePage - 1),
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
                size="sm"
                onClick={() =>
                  router.navigate({
                    to: '/transactions',
                    search: {
                      ...searchParams,
                      page: Math.min(totalPages, safePage + 1),
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
        </>
      )}
      <TagSummaryPanel totals={tagTotals} />
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
