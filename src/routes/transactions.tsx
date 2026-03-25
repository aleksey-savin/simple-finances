import { TransactionSummary } from '#/components/transactions/summary'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Drawer,
  DrawerContent,
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

import { db } from '#/db'
import {
  category,
  currentAccount,
  currentAccountUser,
  expense,
  income,
} from '#/db/schema'

import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { eq, inArray, or } from 'drizzle-orm'
import { format } from 'date-fns'
import { CalendarIcon, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import z from 'zod'
import { ExpenseItem } from '#/components/expenses/item'
import { IncomeItem } from '#/components/income/item'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useIsMobile } from '#/hooks/use-mobile'
import { syncRecurringRulesForAccounts } from '#/lib/recurring'

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
    return { expenses: [], incomes: [], categories, accounts: [] }
  }

  await syncRecurringRulesForAccounts(accountIds)

  const [expenses, incomes, categories, counterparties, accountsData] =
    await Promise.all([
      db.query.expense.findMany({
        where: inArray(expense.currentAccountId, accountIds),
        with: {
          category: { columns: { id: true, name: true } },
          counterparty: { columns: { id: true, name: true } },
          currentAccount: { columns: { id: true, name: true } },
          createdByUser: { columns: { id: true, name: true } },
        },
      }),
      db.query.income.findMany({
        where: inArray(income.currentAccountId, accountIds),
        columns: {
          id: true,
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
          linkedExpenseId: true,
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

  return { expenses, incomes, categories, counterparties, accounts }
})

const togglePaidSchema = z.object({
  id: z.string(),
  type: z.enum(['expense', 'income']),
  paid: z.boolean(),
})

const togglePaid = createServerFn({ method: 'POST' })
  .inputValidator(togglePaidSchema)
  .handler(async ({ data }) => {
    const table = data.type === 'expense' ? expense : income
    await db
      .update(table)
      .set({ paidAt: data.paid ? new Date() : null })
      .where(eq(table.id, data.id))
  })

export const Route = createFileRoute('/transactions')({
  component: App,
  loader: () => fetchData(),
})

function App() {
  const { expenses, incomes, categories, counterparties, accounts } =
    Route.useLoaderData()
  const isMobile = useIsMobile()

  const feed = [
    ...expenses.map((e) => ({ ...e, type: 'expense' as const })),
    ...incomes.map((i) => ({ ...i, type: 'income' as const })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  // Accounts with more than one member are considered shared
  const sharedAccountIds = new Set(
    accounts.filter((a) => a.members.length > 1).map((a) => a.id),
  )

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>(
    'all',
  )
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'paid' | 'unpaid' | 'overdue'
  >('all')
  const [accountFilter, setAccountFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [counterpartyFilter, setCounterpartyFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
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
    if (isMobile && nextRange?.from && nextRange?.to) {
      setDatePickerOpen(false)
    }
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

      if (typeFilter !== 'all' && item.type !== typeFilter) return false
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

  return (
    <>
      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <TransactionSummary feed={filteredFeed} />

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8">
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
        <div className="flex flex-wrap w-full lg:justify-between items-center gap-2">
          {/* Type */}
          <ToggleGroup variant="outline" type="single" defaultValue="all">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <ToggleGroupItem
                value={t}
                key={t}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all'
                  ? 'Все'
                  : t === 'income'
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
                  onClick={() => setDatePickerOpen(true)}
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
                        selected={dateRange}
                        onSelect={handleDateRangeChange}
                        numberOfMonths={1}
                        className="mx-auto"
                      />
                    </div>
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
      </div>

      <div className="flex flex-col gap-2 mt-4">
        {filteredFeed.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Ничего не найдено
          </p>
        )}
        {filteredFeed.map((item) =>
          item.type === 'expense' ? (
            <ExpenseItem
              key={item.id}
              item={item}
              sharedAccountIds={sharedAccountIds}
              togglePaid={togglePaid}
              categories={categories}
              accounts={accounts}
              counterparties={counterparties ?? []}
            />
          ) : (
            <IncomeItem
              key={item.id}
              item={item}
              sharedAccountIds={sharedAccountIds}
              togglePaid={togglePaid}
              categories={categories}
              accounts={accounts}
              counterparties={counterparties ?? []}
            />
          ),
        )}
      </div>
      <Outlet />
    </>
  )
}
