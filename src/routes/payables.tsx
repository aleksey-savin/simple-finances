import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import {
  expense,
  expenseTag,
  recurringRule,
  currentAccountUser,
  currentAccount,
} from '#/db/schema'
import { and, eq, gte, inArray, isNull, lt, lte } from 'drizzle-orm'
import { useMemo, useState } from 'react'
import { useSyncAppData } from '@/hooks/use-sync-app-data'
import { toast } from 'sonner'
import z from 'zod'
import { Cron } from 'croner'
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
import { AlertTriangle, Circle, Clock, Search, Trash2, X } from 'lucide-react'
import {
  fetchTags,
  createTag,
  addExpenseTag,
  removeExpenseTag,
  fetchTagTotals,
} from '#/routes/api/-tags'
import { TagPicker, TagChips, type TagItem } from '#/components/ui/tag-picker'
import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'

// ─── Normalised row shared by both tables ─────────────────────────────────────

export type ExpenseRow = {
  id: string
  amount: string
  description: string
  categoryId: string
  currentAccountId: string
  /** ISO string */
  createdAt: string
  /** ISO string | null */
  dueDate: string | null
  /** ISO string | null  — always null for projected rows */
  paidAt: string | null
  category: { id: string; name: string }
  currentAccount: { id: string; name: string }
  /** true  → virtual row generated from a recurring rule (not yet in DB) */
  isProjected: boolean
}

type TagsMap = Record<string, TagItem[]>

// ─── Server functions ─────────────────────────────────────────────────────────

const fetchPayables = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const memberships = await db
    .select({ currentAccountId: currentAccountUser.currentAccountId })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, session.user.id))

  const accountIds = memberships.map((m) => m.currentAccountId)

  if (accountIds.length === 0) {
    return {
      currentMonth: [] as ExpenseRow[],
      previousUnpaid: [] as ExpenseRow[],
      accounts: [] as { id: string; name: string }[],
      categories: [] as { id: string; name: string }[],
      monthLabel: '',
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
  const monthLabel = now.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  const withRelations = {
    category: { columns: { id: true as const, name: true as const } },
    currentAccount: { columns: { id: true as const, name: true as const } },
  }

  const [realCurrentMonth, previousUnpaidRaw, activeRules, accounts] =
    await Promise.all([
      // All expenses this month (paid + unpaid)
      db.query.expense.findMany({
        where: and(
          inArray(expense.currentAccountId, accountIds),
          gte(expense.createdAt, monthStart),
          lte(expense.createdAt, monthEnd),
        ),
        with: withRelations,
        orderBy: (t, { asc }) => asc(t.createdAt),
      }),

      // Unpaid expenses from months before the current one
      db.query.expense.findMany({
        where: and(
          inArray(expense.currentAccountId, accountIds),
          lt(expense.createdAt, monthStart),
          isNull(expense.paidAt),
        ),
        with: withRelations,
        orderBy: (t, { asc }) => asc(t.createdAt),
      }),

      // Active expense recurring rules
      db.query.recurringRule.findMany({
        where: and(
          inArray(recurringRule.currentAccountId, accountIds),
          eq(recurringRule.type, 'expense'),
          eq(recurringRule.isActive, true),
        ),
        with: withRelations,
      }),

      db.query.currentAccount.findMany({
        where: inArray(currentAccount.id, accountIds),
        columns: { id: true, name: true },
      }),
    ])

  // ── Project recurring rules onto the remaining days of the month ───────────

  const projected: ExpenseRow[] = []

  for (const rule of activeRules) {
    try {
      const job = new Cron(rule.cronExpression, { paused: true })
      // Start from the later of (now, monthStart) so we don't generate entries
      // that correspond to already-created real rows earlier in the month.
      let after = now > monthStart ? now : monthStart

      for (let guard = 0; guard < 200; guard++) {
        const next = job.nextRun(after)
        if (!next || next > monthEnd) break

        const dueDate =
          rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0
            ? new Date(
                next.getTime() + rule.dueDaysFromCreation * 24 * 60 * 60 * 1000,
              )
            : null

        projected.push({
          id: `projected::${rule.id}::${next.getTime()}`,
          amount: rule.amount,
          description: rule.description,
          categoryId: rule.categoryId,
          currentAccountId: rule.currentAccountId,
          createdAt: next.toISOString(),
          dueDate: dueDate?.toISOString() ?? null,
          paidAt: null,
          category: rule.category,
          currentAccount: rule.currentAccount,
          isProjected: true,
        })

        // Advance past this occurrence (add 1 ms to avoid repeating it)
        after = new Date(next.getTime() + 1)
      }
    } catch {
      // Skip rules with invalid cron expressions
    }
  }

  // ── Normalise real rows ────────────────────────────────────────────────────

  const toRow = (
    r: (typeof realCurrentMonth)[number],
    paid: string | null,
  ): ExpenseRow => ({
    id: r.id,
    amount: r.amount,
    description: r.description,
    categoryId: r.categoryId,
    currentAccountId: r.currentAccountId,
    createdAt: r.createdAt.toISOString(),
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    paidAt: paid,
    category: r.category,
    currentAccount: r.currentAccount,
    isProjected: false,
  })

  const currentMonth: ExpenseRow[] = [
    ...realCurrentMonth.map((r) =>
      toRow(r, r.paidAt ? r.paidAt.toISOString() : null),
    ),
    ...projected,
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const previousUnpaid: ExpenseRow[] = previousUnpaidRaw.map((r) =>
    toRow(r, null),
  )

  // ── Unique category list across all rows ───────────────────────────────────

  const catMap = new Map<string, string>()
  for (const r of [...currentMonth, ...previousUnpaid])
    catMap.set(r.category.id, r.category.name)
  const categories = [...catMap.entries()].map(([id, name]) => ({ id, name }))

  // Fetch tags for all real expense ids
  const realIds = [
    ...realCurrentMonth.map((r) => r.id),
    ...previousUnpaidRaw.map((r) => r.id),
  ]

  const expenseTagRows =
    realIds.length > 0
      ? await db.query.expenseTag.findMany({
          where: inArray(expenseTag.expenseId, realIds),
          with: { tag: true },
        })
      : []

  const tagsMap: TagsMap = {}
  for (const et of expenseTagRows) {
    if (!tagsMap[et.expenseId]) tagsMap[et.expenseId] = []
    tagsMap[et.expenseId].push({
      id: et.tag.id,
      name: et.tag.name,
      color: et.tag.color,
    })
  }

  const allTags = await db.query.tag.findMany({
    orderBy: (t, { asc }) => asc(t.name),
  })

  const accountIdSet = new Set(accountIds)

  // Build a lookup from expenseId -> expense record for amount lookups
  const expenseById = new Map(
    [...realCurrentMonth, ...previousUnpaidRaw].map((r) => [r.id, r]),
  )

  const allIncomeTags = await db.query.incomeTag.findMany({
    with: {
      income: {
        columns: { amount: true, currentAccountId: true, paidAt: true },
      },
      tag: { columns: { id: true } },
    },
  })

  const tagTotalsRaw = allTags.map((t) => {
    const expenseTotal = expenseTagRows
      .filter((et) => {
        const exp = expenseById.get(et.expenseId)
        return (
          et.tag.id === t.id &&
          exp !== undefined &&
          accountIdSet.has(exp.currentAccountId)
        )
      })
      .reduce((s, et) => {
        const exp = expenseById.get(et.expenseId)
        return s + Number(exp?.amount ?? 0)
      }, 0)

    const incomeTotal = allIncomeTags
      .filter(
        (it) =>
          it.tag.id === t.id &&
          accountIdSet.has(it.income.currentAccountId) &&
          !it.income.paidAt,
      )
      .reduce((s, it) => s + Number(it.income.amount), 0)

    return {
      tag: { id: t.id, name: t.name, color: t.color },
      expenseTotal,
      incomeTotal,
      net: incomeTotal - expenseTotal,
    }
  })

  const tagTotals = tagTotalsRaw.filter(
    (t) => t.expenseTotal > 0 || t.incomeTotal > 0,
  )

  return {
    currentMonth,
    previousUnpaid,
    accounts,
    categories,
    monthLabel,
    tagsMap,
    allTags: allTags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
    tagTotals,
  }
})

// ── Mark paid ──────────────────────────────────────────────────────────────────

const markPaidSchema = z.object({ id: z.string(), paid: z.boolean() })

const markPaid = createServerFn({ method: 'POST' })
  .inputValidator(markPaidSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')
    await db
      .update(expense)
      .set({ paidAt: data.paid ? new Date() : null })
      .where(eq(expense.id, data.id))
  })

// ── Delete ─────────────────────────────────────────────────────────────────────

const deleteExpenseSchema = z.object({ id: z.string() })

const deleteExpense = createServerFn({ method: 'POST' })
  .inputValidator(deleteExpenseSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')
    await db.delete(expense).where(eq(expense.id, data.id))
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/payables')({
  component: PayablesPage,
  loader: () => fetchPayables(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | Date | null | undefined) {
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

function getDueMeta(dueDate: string | null | undefined) {
  if (!dueDate) return { isOverdue: false, daysLeft: null }
  const diff = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  return { isOverdue: diff < 0, daysLeft: diff }
}

// ─── Custom TanStack Table filter fns ─────────────────────────────────────────

const idFilterFn: FilterFn<ExpenseRow> = (row, columnId, value: string) => {
  if (!value) return true
  if (columnId === 'account') return row.original.currentAccount.id === value
  if (columnId === 'category') return row.original.category.id === value
  return true
}
idFilterFn.autoRemove = (v) => !v

const overdueFilterFn: FilterFn<ExpenseRow> = (row, _id, value: boolean) => {
  if (!value) return true
  return getDueMeta(row.original.dueDate).isOverdue
}
overdueFilterFn.autoRemove = (v) => !v

type ExpenseStatus =
  | 'paid'
  | 'projected'
  | 'overdue'
  | 'soon'
  | 'ontime'
  | 'nodate'

function getExpenseStatus(row: ExpenseRow): ExpenseStatus {
  if (row.isProjected) return 'projected'
  if (row.paidAt) return 'paid'
  if (!row.dueDate) return 'nodate'
  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)
  if (isOverdue) return 'overdue'
  if (daysLeft !== null && daysLeft <= 7) return 'soon'
  return 'ontime'
}

const statusFilterFn: FilterFn<ExpenseRow> = (
  row,
  _id,
  value: ExpenseStatus,
) => {
  if (!value) return true
  return getExpenseStatus(row.original) === value
}
statusFilterFn.autoRemove = (v) => !v

// ─── Status badge (shared by both tables) ────────────────────────────────────

function StatusBadge({ row }: { row: ExpenseRow }) {
  if (row.isProjected)
    return (
      <Badge variant="outline" className="text-xs gap-1 whitespace-nowrap">
        <Clock className="size-3" />
        Запланировано
      </Badge>
    )

  if (row.paidAt)
    return (
      <Badge
        variant="outline"
        className="text-xs text-green-600 border-green-200 whitespace-nowrap"
      >
        Оплачено
      </Badge>
    )

  const { dueDate } = row
  if (!dueDate)
    return (
      <Badge variant="outline" className="text-xs whitespace-nowrap">
        Без срока
      </Badge>
    )

  const { isOverdue, daysLeft } = getDueMeta(dueDate)
  if (isOverdue)
    return (
      <Badge variant="destructive" className="text-xs gap-1 whitespace-nowrap">
        <AlertTriangle className="size-3" />
        Просрочен
      </Badge>
    )
  if (daysLeft !== null && daysLeft <= 7)
    return (
      <Badge className="text-xs bg-amber-500 text-white border-transparent whitespace-nowrap">
        Скоро
      </Badge>
    )
  return (
    <Badge
      variant="outline"
      className="text-xs text-blue-600 border-blue-200 whitespace-nowrap"
    >
      В срок
    </Badge>
  )
}

// ─── DueDate cell (shared) ────────────────────────────────────────────────────

function DueDateCell({ row }: { row: ExpenseRow }) {
  const { dueDate, isProjected } = row
  if (!dueDate) return <span className="text-muted-foreground text-sm">—</span>

  const { isOverdue, daysLeft } = getDueMeta(dueDate)
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`text-sm font-medium ${
          !isProjected && isOverdue ? 'text-red-500' : ''
        }`}
      >
        {formatDate(dueDate)}
      </span>
      {!isProjected && isOverdue && (
        <span className="text-xs text-red-400">
          просрочен {Math.abs(daysLeft!)} дн.
        </span>
      )}
      {!isProjected && !isOverdue && daysLeft !== null && daysLeft <= 7 && (
        <span className="text-xs text-amber-500">осталось {daysLeft} дн.</span>
      )}
      {isProjected && (
        <span className="text-xs text-muted-foreground">по расписанию</span>
      )}
    </div>
  )
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButtons({
  row,
  onMarkPaid,
  onDelete,
}: {
  row: ExpenseRow
  onMarkPaid: (row: ExpenseRow) => void
  onDelete: (row: ExpenseRow) => void
}) {
  // Projected rows: no actions
  if (row.isProjected) return null

  return (
    <div className="flex items-center gap-1 justify-end">
      {!row.paidAt && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => onMarkPaid(row)}
              >
                <Circle className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Отметить как оплаченное</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Удалить</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// ─── Column factory ───────────────────────────────────────────────────────────

function buildColumns(
  onMarkPaid: (row: ExpenseRow) => void,
  onDelete: (row: ExpenseRow) => void,
  tagsMap: TagsMap,
  allTags: TagItem[],
  onTagAdd: (expenseId: string, tag: TagItem) => Promise<void>,
  onTagRemove: (expenseId: string, tag: TagItem) => Promise<void>,
  onTagCreate: (name: string, color: string) => Promise<TagItem>,
): ColumnDef<ExpenseRow, unknown>[] {
  return [
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
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  row.original.isProjected ? 'text-muted-foreground' : ''
                }`}
              >
                {row.original.description}
              </span>
              {row.original.isProjected && (
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>
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
          className={`font-semibold tabular-nums block text-right ${
            row.original.isProjected
              ? 'text-muted-foreground'
              : row.original.paidAt
                ? 'text-foreground/60 line-through'
                : 'text-red-500'
          }`}
        >
          −{formatCurrency(getValue() as number)} ₽
        </span>
      ),
      meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    },
    {
      id: 'createdAt',
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Дата создания" />
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
        <DataTableColumnHeader column={column} title="Срок оплаты" />
      ),
      cell: ({ row }) => <DueDateCell row={row.original} />,
    },
    {
      id: 'status',
      enableSorting: false,
      filterFn: statusFilterFn,
      accessorFn: (row) => getExpenseStatus(row),
      header: 'Статус',
      cell: ({ row }) => <StatusBadge row={row.original} />,
    },
    {
      id: 'tags',
      enableSorting: false,
      size: 40,
      accessorFn: (row) => (tagsMap[row.id] ?? []).map((t) => t.id).join(','),
      filterFn: (row, _id, value: string) => {
        if (!value) return true
        return (tagsMap[row.original.id] ?? []).some((t) => t.id === value)
      },
      header: '',
      cell: ({ row }) => {
        if (row.original.isProjected) return null
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
    {
      id: 'actions',
      enableSorting: false,
      size: 80,
      header: '',
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          onMarkPaid={onMarkPaid}
          onDelete={onDelete}
        />
      ),
      meta: { cellClassName: 'text-right' },
    },
  ]
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  table,
  accounts,
  categories,
  allTags,
  accentColor = 'red',
}: {
  table: Table<ExpenseRow>
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  allTags: TagItem[]
  accentColor?: 'red' | 'orange'
}) {
  const globalFilter = (table.getState().globalFilter as string) ?? ''
  const accountFilter =
    (table.getColumn('account')?.getFilterValue() as string) ?? ''
  const categoryFilter =
    (table.getColumn('category')?.getFilterValue() as string) ?? ''
  const overdueOnly =
    (table.getColumn('dueDate')?.getFilterValue() as boolean) ?? false
  const statusFilter =
    (table.getColumn('status')?.getFilterValue() as ExpenseStatus) ?? ''
  const tagFilter = (table.getColumn('tags')?.getFilterValue() as string) ?? ''

  const hasFilters =
    globalFilter ||
    accountFilter ||
    categoryFilter ||
    overdueOnly ||
    statusFilter ||
    tagFilter

  const filteredRows = table.getFilteredRowModel().rows
  const filteredTotal = filteredRows.reduce(
    (s, r) => s + Number(r.original.amount),
    0,
  )
  const filteredOverdue = filteredRows.filter(
    (r) => !r.original.isProjected && getDueMeta(r.original.dueDate).isOverdue,
  ).length

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Поиск по описанию, категории, счёту…"
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
            <SelectItem value="paid">Оплачено</SelectItem>
            <SelectItem value="projected">Запланировано</SelectItem>
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select
            value={tagFilter || '_all'}
            onValueChange={(v) =>
              table
                .getColumn('tags')
                ?.setFilterValue(v === '_all' ? undefined : v)
            }
          >
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="Все теги" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Все теги</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <span className="text-red-500 font-medium">
              {filteredOverdue} просрочено
            </span>
          )}
          <span
            className={`font-semibold tabular-nums ${
              accentColor === 'red' ? 'text-red-500' : 'text-orange-500'
            }`}
          >
            Итого: {formatCurrency(filteredTotal)} ₽
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PayablesPage() {
  const router = useRouter()
  const {
    currentMonth,
    previousUnpaid,
    accounts,
    categories,
    tagsMap: initialTagsMap,
    allTags: initialAllTags,
    tagTotals: initialTagTotals,
  } = Route.useLoaderData()
  useSyncAppData({ accounts, categories })

  // Local tag state (optimistic updates without full page reload)
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

  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null)

  // Refresh tag totals from server (called after any tag mutation)
  const refreshTotals = async () => {
    try {
      const [totals, tags] = await Promise.all([fetchTagTotals(), fetchTags()])
      setTagTotals(totals)
      setAllTags(tags.map((t) => ({ id: t.id, name: t.name, color: t.color })))
    } catch {
      // ignore
    }
  }

  const handleTagAdd = async (expenseId: string, tag: TagItem) => {
    // Optimistic update
    setTagsMap((prev) => ({
      ...prev,
      [expenseId]: [
        ...(prev[expenseId] ?? []).filter((t) => t.id !== tag.id),
        tag,
      ],
    }))
    await addExpenseTag({ data: { expenseId, tagId: tag.id } })
    await refreshTotals()
  }

  const handleTagRemove = async (expenseId: string, tag: TagItem) => {
    setTagsMap((prev) => ({
      ...prev,
      [expenseId]: (prev[expenseId] ?? []).filter((t) => t.id !== tag.id),
    }))
    await removeExpenseTag({ data: { expenseId, tagId: tag.id } })
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

  const handleMarkPaid = async (row: ExpenseRow) => {
    try {
      await markPaid({ data: { id: row.id, paid: true } })
      await router.invalidate()
      toast.success('Отмечено как оплаченное')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteExpense({ data: { id: deleteTarget.id } })
      await router.invalidate()
      toast.success('Запись удалена')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns = useMemo(
    () =>
      buildColumns(
        handleMarkPaid,
        setDeleteTarget,
        tagsMap,
        allTags,
        handleTagAdd,
        handleTagRemove,
        handleTagCreate,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, tagsMap, allTags],
  )

  // ── Summary stats ──────────────────────────────────────────────────────────

  const currentMonthUnpaid = currentMonth
    .filter((r) => !r.paidAt)
    .reduce((s, r) => s + Number(r.amount), 0)

  const currentMonthPaid = currentMonth
    .filter((r) => r.paidAt)
    .reduce((s, r) => s + Number(r.amount), 0)

  const previousTotal = previousUnpaid.reduce((s, r) => s + Number(r.amount), 0)

  const overdueCount = [
    ...currentMonth.filter((r) => !r.isProjected),
    ...previousUnpaid,
  ].filter((r) => !r.paidAt && getDueMeta(r.dueDate).isOverdue).length

  const projectedCount = currentMonth.filter((r) => r.isProjected).length

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-end gap-4">
        {/* Stat cards */}
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border px-4 py-2 text-sm min-w-35">
            <p className="text-muted-foreground">К оплате (месяц)</p>
            <p className="text-lg font-semibold text-red-500 tabular-nums">
              {formatCurrency(currentMonthUnpaid)} ₽
            </p>
          </div>

          {currentMonthPaid > 0 && (
            <div className="rounded-lg border px-4 py-2 text-sm min-w-35">
              <p className="text-muted-foreground">Оплачено (месяц)</p>
              <p className="text-lg font-semibold text-foreground/60 tabular-nums">
                {formatCurrency(currentMonthPaid)} ₽
              </p>
            </div>
          )}

          {previousTotal > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm min-w-35">
              <p className="text-orange-700">Долг прошлых периодов</p>
              <p className="text-lg font-semibold text-orange-600 tabular-nums">
                {formatCurrency(previousTotal)} ₽
              </p>
            </div>
          )}

          {overdueCount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm">
              <p className="text-red-600">Просрочено</p>
              <p className="text-lg font-semibold text-red-600">
                {overdueCount} {overdueCount === 1 ? 'запись' : 'записей'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Current month ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {projectedCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1 h-6">
              <Clock className="size-3" />
              {projectedCount} запланировано
            </Badge>
          )}
        </div>

        <DataTable
          columns={columns}
          data={currentMonth}
          initialSorting={[{ id: 'createdAt', desc: false }]}
          toolbar={(table) => (
            <Toolbar
              table={table}
              accounts={accounts}
              categories={categories}
              allTags={allTags}
              accentColor="red"
            />
          )}
        />
      </section>

      {/* ── Previous unpaid ───────────────────────────────────────────────── */}
      {previousUnpaid.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Неоплаченные за прошлые периоды
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Расходы прошлых месяцев, которые ещё не оплачены
            </p>
          </div>

          <DataTable
            columns={columns}
            data={previousUnpaid}
            initialSorting={[{ id: 'dueDate', desc: false }]}
            toolbar={(table) => (
              <Toolbar
                table={table}
                accounts={accounts}
                categories={categories}
                allTags={allTags}
                accentColor="orange"
              />
            )}
          />
        </section>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
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
      {/* ── Tag summary panel ─────────────────────────────────────────── */}
      <TagSummaryPanel totals={tagTotals ?? []} />
    </>
  )
}
