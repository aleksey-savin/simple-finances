import Accounts from '#/components/accounts'
import Categories from '#/components/categories/sheet'
import { ExpenseForm } from '#/components/expenses'
import { IncomeForm } from '#/components/incomes'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Item, ItemContent, ItemTitle } from '#/components/ui/item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import { db } from '#/db'
import {
  currentAccount,
  currentAccountUser,
  expense,
  income,
} from '#/db/schema'

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { eq, inArray } from 'drizzle-orm'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  PlusCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'

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
    const categories = await db.query.category.findMany({})
    return { expenses: [], incomes: [], categories, accounts: [] }
  }

  const [expenses, incomes, categories, accountsData] = await Promise.all([
    db.query.expense.findMany({
      where: inArray(expense.currentAccountId, accountIds),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        createdByUser: { columns: { id: true, name: true } },
      },
    }),
    db.query.income.findMany({
      where: inArray(income.currentAccountId, accountIds),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        createdByUser: { columns: { id: true, name: true } },
      },
    }),
    db.query.category.findMany({}),
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

  return { expenses, incomes, categories, accounts }
})

const togglePaidSchema = z.object({
  id: z.string(),
  type: z.enum(['expense', 'income']),
  paid: z.boolean(),
})

const deleteEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['expense', 'income']),
})

const deleteEntry = createServerFn({ method: 'POST' })
  .inputValidator(deleteEntrySchema)
  .handler(async ({ data }) => {
    const table = data.type === 'expense' ? expense : income
    await db.delete(table).where(eq(table.id, data.id))
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

export const Route = createFileRoute('/')({
  component: App,
  loader: () => fetchData(),
})

function App() {
  const router = useRouter()
  const { expenses, incomes, categories, accounts } = Route.useLoaderData()

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
  const [accountFilter, setAccountFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    accountFilter !== 'all' ||
    categoryFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setAccountFilter('all')
    setCategoryFilter('all')
  }

  const filteredFeed = useMemo(() => {
    const now = new Date()
    return feed.filter((item) => {
      const isPaid = item.paidAt !== null
      const isOverdue =
        !isPaid && item.dueDate !== null && new Date(item.dueDate) < now

      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (statusFilter === 'paid' && !isPaid) return false
      if (statusFilter === 'unpaid' && isPaid) return false
      if (statusFilter === 'overdue' && !isOverdue) return false
      if (accountFilter !== 'all' && item.currentAccount.id !== accountFilter)
        return false
      if (categoryFilter !== 'all' && item.category.id !== categoryFilter)
        return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const haystack = [
          item.description,
          item.category.name,
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
  }, [feed, search, typeFilter, statusFilter, accountFilter, categoryFilter])

  // ── UI state ───────────────────────────────────────────────────────────────
  const [addExpenseIsOpen, setAddExpenseIsOpen] = useState(false)
  const [addIncomeIsOpen, setAddIncomeIsOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    type: 'expense' | 'income'
    description: string
  } | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteEntry({
        data: { id: deleteTarget.id, type: deleteTarget.type },
      })
      await router.invalidate()
      toast.success('Запись удалена')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-8">
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setAddExpenseIsOpen(false)
              setAddIncomeIsOpen(!addIncomeIsOpen)
            }}
          >
            <PlusCircle /> Доход
          </Button>
          <Button
            onClick={() => {
              setAddExpenseIsOpen(!addExpenseIsOpen)
              setAddIncomeIsOpen(false)
            }}
          >
            <PlusCircle /> Расход
          </Button>
        </div>
        <div className="flex gap-4">
          <Accounts accounts={accounts} />
          <Categories categories={categories} />
        </div>
      </div>
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
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

        {/* Toggle rows + selects */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Type */}
          <div className="flex rounded-md border overflow-hidden divide-x text-sm shrink-0">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 transition-colors ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {t === 'all' ? 'Все' : t === 'income' ? 'Доходы' : 'Расходы'}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex rounded-md border overflow-hidden divide-x text-sm shrink-0">
            {(
              [
                ['all', 'Все'],
                ['paid', 'Оплаченные'],
                ['unpaid', 'Неоплаченные'],
                ['overdue', 'Просроченные'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 transition-colors ${statusFilter === val ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Account */}
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="Все счета" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все счета</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      <div>
        {addExpenseIsOpen && (
          <ExpenseForm
            setAddExpenseIsOpen={setAddExpenseIsOpen}
            categories={categories}
            accounts={accounts}
          />
        )}
        {addIncomeIsOpen && (
          <IncomeForm
            setAddIncomeIsOpen={setAddIncomeIsOpen}
            categories={categories}
            accounts={accounts}
          />
        )}

        <div className="flex flex-col gap-2 mt-4">
          {filteredFeed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Ничего не найдено
            </p>
          )}
          {filteredFeed.map((item) => {
            const isExpense = item.type === 'expense'
            const isPaid = item.paidAt !== null
            const now = new Date()
            const isOverdue =
              !isPaid && item.dueDate !== null && new Date(item.dueDate) < now
            const createdDate = new Date(item.createdAt).toLocaleDateString(
              'ru-RU',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              },
            )
            const paidDate = isPaid
              ? new Date(item.paidAt!).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null
            const dueDateFormatted = item.dueDate
              ? new Date(item.dueDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null
            return (
              <Item
                key={item.id}
                variant={isPaid ? 'outline' : 'muted'}
                className={isOverdue ? 'border-red-500/50 bg-red-500/5' : ''}
              >
                <ItemContent className="flex-row items-center gap-4 py-1">
                  <div
                    className={`flex shrink-0 items-center justify-center size-9 rounded-full ${isPaid ? 'bg-muted' : 'bg-muted/50'}`}
                  >
                    {isExpense ? (
                      <ArrowDownCircle
                        className={`size-5 ${isPaid ? 'text-red-500' : 'text-muted-foreground'}`}
                      />
                    ) : (
                      <ArrowUpCircle
                        className={`size-5 ${isPaid ? 'text-green-500' : 'text-muted-foreground'}`}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <ItemTitle
                      className={`truncate ${!isPaid ? 'text-muted-foreground' : ''}`}
                    >
                      {item.description}
                    </ItemTitle>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {item.category.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {item.currentAccount.name}
                      </Badge>
                      {sharedAccountIds.has(item.currentAccount.id) &&
                        item.createdByUser && (
                          <span className="text-xs text-muted-foreground">
                            {item.createdByUser.name}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className={`text-base font-semibold ${
                        isPaid
                          ? isExpense
                            ? 'text-red-500'
                            : 'text-green-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {isExpense ? '−' : '+'}
                      {Number(item.amount).toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {createdDate}
                    </span>
                    {dueDateFormatted && !isPaid && (
                      <span
                        className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}
                      >
                        До {dueDateFormatted}
                      </span>
                    )}
                    {paidDate && (
                      <span className="text-xs text-muted-foreground">
                        Оплачено {paidDate}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title={
                        isPaid
                          ? 'Отметить как неоплаченное'
                          : 'Отметить как оплаченное'
                      }
                      onClick={async () => {
                        try {
                          await togglePaid({
                            data: {
                              id: item.id,
                              type: item.type,
                              paid: !isPaid,
                            },
                          })
                          await router.invalidate()
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : 'Произошла ошибка',
                          )
                        }
                      }}
                    >
                      {isPaid ? (
                        <CheckCircle2 className="size-4 text-green-600" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                    {!isPaid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        title="Удалить"
                        onClick={() =>
                          setDeleteTarget({
                            id: item.id,
                            type: item.type,
                            description: item.description,
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </ItemContent>
              </Item>
            )
          })}
        </div>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить{' '}
              <span className="font-medium text-foreground">
                «{deleteTarget?.description}»
              </span>
              ? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
