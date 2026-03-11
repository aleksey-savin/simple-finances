import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import {
  income,
  currentAccountUser,
  currentAccount,
  incomeTag,
} from '#/db/schema'
import { eq, inArray, isNull } from 'drizzle-orm'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import {
  type ColumnDef,
  type FilterFn,
  type Table,
} from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '#/components/ui/data-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import {
  Circle,
  Search,
  Trash2,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react'
import {
  fetchTags,
  fetchTagTotals,
  createTag,
  addIncomeTag,
  removeIncomeTag,
} from '#/routes/api/-tags'
import { TagPicker, TagChips, type TagItem } from '#/components/ui/tag-picker'
import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

type IncomeRow = Awaited<ReturnType<typeof fetchReceivables>>['rows'][number]
type TagsMap = Record<string, TagItem[]>

// ─── Server functions ─────────────────────────────────────────────────────────

const fetchReceivables = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, session.user.id))

  const accountIds = memberships.map((m) => m.currentAccountId)

  if (accountIds.length === 0) {
    return { rows: [], accounts: [], categories: [] }
  }

  const [rows, accounts] = await Promise.all([
    db.query.income.findMany({
      where: (t, { and }) =>
        and(inArray(t.currentAccountId, accountIds), isNull(t.paidAt)),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        createdByUser: { columns: { id: true, name: true } },
      },
      orderBy: (t, { asc }) => asc(t.createdAt),
    }),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
      columns: { id: true, name: true },
    }),
  ])

  // Unique categories from the returned rows
  const categoryMap = new Map<string, string>()
  for (const r of rows) categoryMap.set(r.category.id, r.category.name)
  const categories = [...categoryMap.entries()].map(([id, name]) => ({
    id,
    name,
  }))

  // Fetch tags for all income rows
  const incomeIds = rows.map((r) => r.id)
  const incomeTagRows =
    incomeIds.length > 0
      ? await db.query.incomeTag.findMany({
          where: inArray(incomeTag.incomeId, incomeIds),
          with: { tag: true },
        })
      : []

  const tagsMap: TagsMap = {}
  for (const it of incomeTagRows) {
    if (!tagsMap[it.incomeId]) tagsMap[it.incomeId] = []
    tagsMap[it.incomeId].push({
      id: it.tag.id,
      name: it.tag.name,
      color: it.tag.color,
    })
  }

  const allTags = await db.query.tag.findMany({
    orderBy: (t, { asc }) => asc(t.name),
  })

  // Tag totals: income only (expenses handled on payables page)
  const accountIdSet = new Set(accountIds)
  const allExpenseTags = await db.query.expenseTag.findMany({
    with: {
      expense: {
        columns: { amount: true, currentAccountId: true, paidAt: true },
      },
      tag: { columns: { id: true } },
    },
  })
  const tagTotals = allTags
    .map((t) => {
      const incomeTotal = incomeTagRows
        .filter((it) => it.tag.id === t.id)
        .reduce(
          (s, it) =>
            s + Number(rows.find((r) => r.id === it.incomeId)?.amount ?? 0),
          0,
        )
      const expenseTotal = allExpenseTags
        .filter(
          (et) =>
            et.tag.id === t.id &&
            accountIdSet.has(et.expense.currentAccountId) &&
            !et.expense.paidAt,
        )
        .reduce((s, et) => s + Number(et.expense.amount), 0)
      return {
        tag: { id: t.id, name: t.name, color: t.color },
        expenseTotal,
        incomeTotal,
        net: incomeTotal - expenseTotal,
      }
    })
    .filter((t) => t.expenseTotal > 0 || t.incomeTotal > 0)

  return {
    rows,
    accounts,
    categories,
    tagsMap,
    allTags: allTags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    tagTotals,
  }
})

const markPaidSchema = z.object({ id: z.string(), paid: z.boolean() })

const markPaid = createServerFn({ method: 'POST' })
  .inputValidator(markPaidSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')
    await db
      .update(income)
      .set({ paidAt: data.paid ? new Date() : null })
      .where(eq(income.id, data.id))
  })

const deleteIncomeSchema = z.object({ id: z.string() })

const deleteIncome = createServerFn({ method: 'POST' })
  .inputValidator(deleteIncomeSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')
    await db.delete(income).where(eq(income.id, data.id))
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/receivables')({
  component: ReceivablesPage,
  loader: () => fetchReceivables(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(n: number) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getDueMeta(dueDate: Date | string | null | undefined) {
  if (!dueDate) return { isOverdue: false, daysLeft: null }
  const now = new Date()
  const due = new Date(dueDate)
  const diff = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  )
  return { isOverdue: diff < 0, daysLeft: diff }
}

// ─── Custom filter fns ────────────────────────────────────────────────────────

const idFilterFn: FilterFn<IncomeRow> = (row, columnId, value: string) => {
  if (!value) return true
  if (columnId === 'account') return row.original.currentAccount.id === value
  if (columnId === 'category') return row.original.category.id === value
  return true
}
idFilterFn.autoRemove = (val) => !val

const overdueFilterFn: FilterFn<IncomeRow> = (
  row,
  _columnId,
  value: boolean,
) => {
  if (!value) return true
  const { isOverdue } = getDueMeta(row.original.dueDate)
  return isOverdue
}
overdueFilterFn.autoRemove = (val) => !val

type IncomeStatus = 'overdue' | 'soon' | 'ontime' | 'nodate'

function getIncomeStatus(row: IncomeRow): IncomeStatus {
  if (!row.dueDate) return 'nodate'
  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)
  if (isOverdue) return 'overdue'
  if (daysLeft !== null && daysLeft <= 7) return 'soon'
  return 'ontime'
}

const statusFilterFn: FilterFn<IncomeRow> = (row, _id, value: IncomeStatus) => {
  if (!value) return true
  return getIncomeStatus(row.original) === value
}
statusFilterFn.autoRemove = (v) => !v

// ─── Page component ───────────────────────────────────────────────────────────

function ReceivablesPage() {
  const router = useRouter()
  const {
    rows,
    accounts,
    categories,
    tagsMap: initialTagsMap,
    allTags: initialAllTags,
    tagTotals: initialTagTotals,
  } = Route.useLoaderData()

  const [tagsMap, setTagsMap] = useState<TagsMap>(initialTagsMap ?? {})
  const [allTags, setAllTags] = useState<TagItem[]>(initialAllTags ?? [])
  const [tagTotals, setTagTotals] = useState<
    {
      tag: { id: string; name: string; color: string }
      expenseTotal: number
      incomeTotal: number
      net: number
    }[]
  >(initialTagTotals ?? [])

  const [deleteTarget, setDeleteTarget] = useState<IncomeRow | null>(null)

  const refreshTotals = async () => {
    try {
      const [totals, tags] = await Promise.all([fetchTagTotals(), fetchTags()])
      setTagTotals(totals)
      setAllTags(tags.map((t) => ({ id: t.id, name: t.name, color: t.color })))
    } catch {
      // ignore
    }
  }

  const handleTagAdd = async (incomeId: string, tag: TagItem) => {
    setTagsMap((prev) => ({
      ...prev,
      [incomeId]: [
        ...(prev[incomeId] ?? []).filter((t) => t.id !== tag.id),
        tag,
      ],
    }))
    await addIncomeTag({ data: { incomeId, tagId: tag.id } })
    await refreshTotals()
  }

  const handleTagRemove = async (incomeId: string, tag: TagItem) => {
    setTagsMap((prev) => ({
      ...prev,
      [incomeId]: (prev[incomeId] ?? []).filter((t) => t.id !== tag.id),
    }))
    await removeIncomeTag({ data: { incomeId, tagId: tag.id } })
    await refreshTotals()
  }

  const handleTagCreate = async (
    name: string,
    color: string,
  ): Promise<TagItem> => {
    const created = await createTag({ data: { name, color } })
    const newTag: TagItem = {
      id: created.id,
      name: created.name,
      color: created.color,
    }
    setAllTags((prev) =>
      [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)),
    )
    return newTag
  }

  const handleTogglePaid = async (row: IncomeRow) => {
    try {
      await markPaid({ data: { id: row.id, paid: true } })
      await router.invalidate()
      toast.success('Отмечено как полученное')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteIncome({ data: { id: deleteTarget.id } })
      await router.invalidate()
      toast.success('Запись удалена')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<IncomeRow, unknown>[]>(
    () => [
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
              <span className="font-medium">{row.original.description}</span>
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
        cell: ({ getValue }) => (
          <span className="font-semibold tabular-nums text-green-600 block text-right">
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
        cell: ({ row }) => {
          const { dueDate } = row.original
          if (!dueDate)
            return <span className="text-muted-foreground text-sm">—</span>
          const { isOverdue, daysLeft } = getDueMeta(dueDate)
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`text-sm font-medium ${isOverdue ? 'text-red-500' : ''}`}
              >
                {formatDate(dueDate)}
              </span>
              {isOverdue && (
                <span className="text-xs text-red-400">
                  просрочен {Math.abs(daysLeft!)} дн.
                </span>
              )}
              {!isOverdue && daysLeft !== null && daysLeft <= 7 && (
                <span className="text-xs text-amber-500">
                  осталось {daysLeft} дн.
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Статус',
        enableSorting: false,
        filterFn: statusFilterFn,
        accessorFn: (row) => getIncomeStatus(row),
        cell: ({ row }) => {
          const { dueDate } = row.original
          if (!dueDate)
            return (
              <Badge variant="outline" className="text-xs">
                Без срока
              </Badge>
            )
          const { isOverdue, daysLeft } = getDueMeta(dueDate)
          if (isOverdue)
            return (
              <Badge
                variant="destructive"
                className="text-xs gap-1 whitespace-nowrap"
              >
                <AlertTriangle className="size-3" />
                Просрочен
              </Badge>
            )
          if (daysLeft !== null && daysLeft <= 7)
            return (
              <Badge className="text-xs bg-amber-500 text-white border-transparent gap-1 whitespace-nowrap">
                Скоро
              </Badge>
            )
          return (
            <Badge
              variant="outline"
              className="text-xs text-green-600 border-green-200 whitespace-nowrap"
            >
              В срок
            </Badge>
          )
        },
      },
      {
        id: 'tags',
        enableSorting: false,
        size: 40,
        header: '',
        cell: ({ row }) => {
          const tags = tagsMap[row.original.id] ?? []
          return (
            <TagPicker
              assignedTags={tags}
              allTags={allTags}
              onAdd={(tag) => handleTagAdd(row.original.id, tag)}
              onRemove={(tag) => handleTagRemove(row.original.id, tag)}
              onCreate={handleTagCreate}
            />
          )
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        size: 80,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleTogglePaid(row.original)}
                  >
                    <Circle className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Отметить как полученное</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
        meta: { cellClassName: 'text-right' },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, tagsMap, allTags],
  )

  // ── Stats from all rows (before table filtering) ───────────────────────────
  const totalAll = rows.reduce((s, r) => s + Number(r.amount), 0)
  const overdueAll = rows.filter((r) => getDueMeta(r.dueDate).isOverdue).length

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-end gap-4">
        <div className="flex gap-3">
          <div className="rounded-lg border px-4 py-2 text-sm">
            <p className="text-muted-foreground">Всего к получению</p>
            <p className="text-lg font-semibold text-green-600 tabular-nums">
              {formatCurrency(totalAll)} ₽
            </p>
          </div>
          {overdueAll > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm">
              <p className="text-red-600">Просрочено</p>
              <p className="text-lg font-semibold text-red-600">
                {overdueAll} {overdueAll === 1 ? 'запись' : 'записей'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: 'dueDate', desc: false }]}
        toolbar={(table) => (
          <Toolbar table={table} accounts={accounts} categories={categories} />
        )}
      />

      {/* Delete confirm */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
            <DialogDescription>
              «{deleteTarget?.description}» будет удалена безвозвратно.
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

      {/* Tag summary panel */}
      <TagSummaryPanel totals={tagTotals ?? []} />
    </>
  )
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  table,
  accounts,
  categories,
}: {
  table: Table<IncomeRow>
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
}) {
  const globalFilter = (table.getState().globalFilter as string) ?? ''
  const accountFilter =
    (table.getColumn('account')?.getFilterValue() as string) ?? ''
  const categoryFilter =
    (table.getColumn('category')?.getFilterValue() as string) ?? ''
  const overdueOnly =
    (table.getColumn('dueDate')?.getFilterValue() as boolean) ?? false
  const statusFilter =
    (table.getColumn('status')?.getFilterValue() as IncomeStatus) ?? ''

  const hasFilters =
    globalFilter ||
    accountFilter ||
    categoryFilter ||
    overdueOnly ||
    statusFilter

  const filteredRows = table.getFilteredRowModel().rows
  const filteredTotal = filteredRows.reduce(
    (s, r) => s + Number(r.original.amount),
    0,
  )
  const filteredOverdue = filteredRows.filter(
    (r) => getDueMeta(r.original.dueDate).isOverdue,
  ).length

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Поиск по описанию, категории, счёту…"
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Account */}
        <Select
          value={accountFilter || '_all'}
          onValueChange={(v) =>
            table
              .getColumn('account')
              ?.setFilterValue(v === '_all' ? undefined : v)
          }
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Все счета" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Все счета</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={categoryFilter || '_all'}
          onValueChange={(v) =>
            table
              .getColumn('category')
              ?.setFilterValue(v === '_all' ? undefined : v)
          }
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Все категории</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={statusFilter || '_all'}
          onValueChange={(v) =>
            table
              .getColumn('status')
              ?.setFilterValue(v === '_all' ? undefined : v)
          }
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Все статусы</SelectItem>
            <SelectItem value="overdue">Просрочен</SelectItem>
            <SelectItem value="soon">Скоро</SelectItem>
            <SelectItem value="ontime">В срок</SelectItem>
            <SelectItem value="nodate">Без срока</SelectItem>
          </SelectContent>
        </Select>

        {/* Overdue toggle */}
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

        {/* Reset */}
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

        {/* Summary */}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {filteredOverdue > 0 && (
            <span className="text-red-500 font-medium">
              {filteredOverdue} просрочено
            </span>
          )}
          <span className="font-semibold text-green-600 tabular-nums">
            Итого: {formatCurrency(filteredTotal)} ₽
          </span>
        </div>
      </div>
    </div>
  )
}
