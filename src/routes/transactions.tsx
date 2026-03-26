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
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from '#/components/ui/multi-select-combobox'
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
} from '#/db/schema'

import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { eq, inArray, or } from 'drizzle-orm'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Search, X } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import z from 'zod'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useIsMobile } from '#/hooks/use-mobile'
import { syncRecurringRulesForAccounts } from '#/lib/recurring'
import { Card } from '#/components/ui/card'

const fetchData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
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
    return { invoices: [], categories, accounts: [], counterparties: [] }
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

  return { invoices, categories, counterparties, accounts }
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

export const Route = createFileRoute('/transactions')({
  component: App,
  loader: () => fetchData(),
})

function App() {
  const { invoices, categories, counterparties, accounts } =
    Route.useLoaderData()
  const isMobile = useIsMobile()

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
  const categoryOptions: MultiSelectOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))
  const counterpartyOptions: MultiSelectOption[] = (counterparties ?? []).map(
    (counterparty) => ({
      value: counterparty.id,
      label: counterparty.name,
    }),
  )

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    accountFilter.length > 0 ||
    categoryFilter.length > 0 ||
    counterpartyFilter.length > 0 ||
    dateRange !== undefined

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setAccountFilter([])
    setCategoryFilter([])
    setCounterpartyFilter([])
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
          item.createdByUser?.name ?? '',
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
    dateRange,
    dateField,
  ])

  const desktopGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredFeed>()

    for (const item of filteredFeed) {
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
  }, [filteredFeed])

  return (
    <>
      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <InvoiceSummary feed={filteredFeed} />

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Card className="flex flex-col gap-8 p-4">
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
        <div className="flex flex-wrap w-full lg:justify-between items-center gap-4">
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
          <div className="mt-4 flex flex-col gap-2 sm:hidden">
            {filteredFeed.map((item) => (
              <InvoiceItem
                key={item.id}
                layout="mobile"
                item={item}
                sharedAccountIds={sharedAccountIds}
                togglePaid={togglePaid}
                categories={categories}
                accounts={accounts}
                counterparties={counterparties ?? []}
              />
            ))}
          </div>

          <Card className="mt-4 hidden sm:block p-4">
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
                        colSpan={4}
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
                        counterparties={counterparties ?? []}
                      />
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
      <Outlet />
    </>
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
