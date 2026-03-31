import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import {
  invoice,
  currentAccountUser,
  currentAccount,
  clientCounterparty,
  invoiceTag,
} from '#/db/schema'
import { eq, inArray, isNull } from 'drizzle-orm'
import { Fragment, useMemo, useState } from 'react'

import { toast } from 'sonner'
import z from 'zod'
import {
  type ColumnDef,
  type FilterFn,
  type Table,
  flexRender,
  type Row as TableRowModel,
} from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '#/components/ui/data-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from '#/components/ui/multi-select-combobox'
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
  Archive,
  ArchiveRestore,
  Circle,
  Search,
  Trash2,
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
import { syncRecurringRulesForAccounts } from '#/lib/recurring'
import { getPaymentState } from '#/lib/invoice-payment'
import { Card } from '#/components/ui/card'
import { TableCell, TableRow } from '#/components/ui/table'

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
    return { rows: [], accounts: [], categories: [], counterparties: [] }
  }

  await syncRecurringRulesForAccounts(accountIds)

  const [rows, accounts, counterparties] = await Promise.all([
    db.query.invoice.findMany({
      where: (t, { and }) =>
        and(
          inArray(t.currentAccountId, accountIds),
          eq(t.kind, 'receivable'),
          isNull(t.paidAt),
        ),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
        counterparty: { columns: { id: true, name: true } },
        createdByUser: { columns: { id: true, name: true } },
        settlements: {
          columns: { amount: true, settledAt: true },
        },
      },
      orderBy: (t, { asc }) => asc(t.createdAt),
    }),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
      columns: { id: true, name: true },
    }),
    db.query.counterparty.findMany({ columns: { id: true, name: true } }),
  ])

  const normalizedRows = rows
    .map((row) => {
      const paymentState = getPaymentState({
        amount: row.amount,
        paidAt: row.paidAt,
        settlements: row.settlements,
      })

      return {
        ...row,
        paidAt: paymentState.effectivePaidAt,
        manualPaid: paymentState.manualPaid,
        settledAmount: paymentState.settledAmount,
        outstandingAmount: paymentState.outstandingAmount,
        paymentStatus: paymentState.status,
      }
    })
    .filter((row) => row.paymentStatus !== 'paid')

  const counterpartyIds = [
    ...new Set(
      normalizedRows
        .map((row) => row.counterparty?.id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]

  const clientLinks =
    counterpartyIds.length > 0
      ? await db.query.clientCounterparty.findMany({
          where: inArray(clientCounterparty.counterpartyId, counterpartyIds),
          with: {
            client: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: (table, { asc }) => asc(table.createdAt),
        })
      : []

  const clientByCounterpartyId = new Map<string, { id: string; name: string }>()

  for (const link of clientLinks) {
    if (!clientByCounterpartyId.has(link.counterpartyId)) {
      clientByCounterpartyId.set(link.counterpartyId, link.client)
    }
  }

  const rowsWithClients = normalizedRows.map((row) => ({
    ...row,
    client: row.counterparty
      ? (clientByCounterpartyId.get(row.counterparty.id) ?? null)
      : null,
  }))

  // Unique categories from the returned rows
  const categoryMap = new Map<string, string>()
  for (const r of rowsWithClients)
    categoryMap.set(r.category.id, r.category.name)
  const categories = [...categoryMap.entries()].map(([id, name]) => ({
    id,
    name,
  }))

  // Fetch tags for all income rows
  const incomeIds = rowsWithClients.map((r) => r.id)
  const incomeTagRows =
    incomeIds.length > 0
      ? await db.query.invoiceTag.findMany({
          where: inArray(invoiceTag.invoiceId, incomeIds),
          with: { tag: true },
        })
      : []

  const tagsMap: TagsMap = {}
  for (const it of incomeTagRows) {
    if (!tagsMap[it.invoiceId]) tagsMap[it.invoiceId] = []
    tagsMap[it.invoiceId].push({
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
  const allExpenseTags = await db.query.invoiceTag.findMany({
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
      tag: { columns: { id: true } },
    },
  })
  const tagTotals = allTags
    .map((t) => {
      const incomeTotal = incomeTagRows
        .filter((it) => it.tag.id === t.id)
        .reduce(
          (s, it) =>
            s +
            Number(
              rowsWithClients.find((r) => r.id === it.invoiceId)
                ?.outstandingAmount ?? 0,
            ),
          0,
        )
      const expenseTotal = allExpenseTags
        .filter((et) => {
          if (
            et.tag.id !== t.id ||
            et.invoice.kind !== 'payable' ||
            !accountIdSet.has(et.invoice.currentAccountId)
          ) {
            return false
          }

          const paymentState = getPaymentState({
            amount: et.invoice.amount,
            paidAt: et.invoice.paidAt,
            settlements: et.invoice.settlements,
          })

          return paymentState.status !== 'paid'
        })
        .reduce((s, et) => {
          const paymentState = getPaymentState({
            amount: et.invoice.amount,
            paidAt: et.invoice.paidAt,
            settlements: et.invoice.settlements,
          })

          return s + paymentState.outstandingAmount
        }, 0)
      return {
        tag: { id: t.id, name: t.name, color: t.color },
        expenseTotal,
        incomeTotal,
        net: incomeTotal - expenseTotal,
      }
    })
    .filter((t) => t.expenseTotal > 0 || t.incomeTotal > 0)

  return {
    rows: rowsWithClients,
    accounts,
    categories,
    counterparties,
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
      .update(invoice)
      .set({ paidAt: data.paid ? new Date() : null })
      .where(eq(invoice.id, data.id))
  })

const deleteIncomeSchema = z.object({ id: z.string() })

const deleteIncome = createServerFn({ method: 'POST' })
  .inputValidator(deleteIncomeSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')
    await db.delete(invoice).where(eq(invoice.id, data.id))
  })

// ── Archive ────────────────────────────────────────────────────────────────────

const archiveIncomeSchema = z.object({ id: z.string(), archive: z.boolean() })

const archiveIncome = createServerFn({ method: 'POST' })
  .inputValidator(archiveIncomeSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')
    await db
      .update(invoice)
      .set({ archivedAt: data.archive ? new Date() : null })
      .where(eq(invoice.id, data.id))
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

function pluralRecords(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'запись'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'записи'
  }
  return 'записей'
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

const idFilterFn: FilterFn<IncomeRow> = (row, columnId, value: string[]) => {
  if (!value?.length) return true
  if (columnId === 'account')
    return value.includes(row.original.currentAccount.id)
  if (columnId === 'category') return value.includes(row.original.category.id)
  if (columnId === 'counterparty')
    return value.includes(
      (row.original.counterparty as { id: string } | null)?.id ?? '',
    )
  return true
}
idFilterFn.autoRemove = (val) => !val?.length

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

type IncomeStatus = 'partial' | 'overdue' | 'soon' | 'ontime' | 'nodate'

function getIncomeStatus(row: IncomeRow): IncomeStatus {
  if (row.paymentStatus === 'partial') return 'partial'
  if (!row.dueDate) return 'nodate'
  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)
  if (isOverdue) return 'overdue'
  if (daysLeft !== null && daysLeft <= 7) return 'soon'
  return 'ontime'
}

const statusFilterFn: FilterFn<IncomeRow> = (
  row,
  _id,
  value: IncomeStatus[],
) => {
  if (!value?.length) return true
  return value.includes(getIncomeStatus(row.original))
}
statusFilterFn.autoRemove = (v) => !v?.length

// ─── Page component ───────────────────────────────────────────────────────────

function ReceivablesPage() {
  const router = useRouter()
  const {
    rows,
    accounts,
    categories,
    counterparties,
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
  const [archiveTarget, setArchiveTarget] = useState<IncomeRow | null>(null)

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

  const handleArchive = async (row: IncomeRow) => {
    if (row.archivedAt) {
      try {
        await archiveIncome({ data: { id: row.id, archive: false } })
        await router.invalidate()
        toast.success('Запись разархивирована')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка')
      }
    } else {
      setArchiveTarget(row)
    }
  }

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return
    try {
      await archiveIncome({ data: { id: archiveTarget.id, archive: true } })
      await router.invalidate()
      toast.success('Запись архивирована')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setArchiveTarget(null)
    }
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<IncomeRow, unknown>[]>(
    () => [
      {
        id: 'counterparty',
        accessorFn: (row) =>
          (row.counterparty as { name: string } | null)?.name ?? '',
        filterFn: idFilterFn,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Контрагент" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {(row.original.counterparty as { name: string } | null)?.name ??
              '—'}
          </span>
        ),
      },
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
              <span className="font-medium `wrap-break-word whitespace-normal w-full">
                {row.original.description}
              </span>
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
              row.original.paymentStatus === 'partial'
                ? 'text-amber-600'
                : 'text-green-600'
            }`}
          >
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
          if (row.original.paymentStatus === 'partial')
            return (
              <Badge className="text-xs bg-amber-500 text-white border-transparent whitespace-nowrap">
                Частично получено
              </Badge>
            )

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
            {row.original.paymentStatus !== 'paid' && (
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
            )}
            {row.original.paymentStatus === 'paid' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleArchive(row.original)}
                    >
                      {row.original.archivedAt ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {row.original.archivedAt
                      ? 'Разархивировать'
                      : 'Архивировать'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {row.original.paymentStatus !== 'paid' &&
              row.original.settledAmount === 0 && (
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
              )}
          </div>
        ),
        meta: { cellClassName: 'text-right' },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, tagsMap, allTags],
  )

  // ── Stats from all rows (before table filtering) ───────────────────────────
  const totalAll = rows.reduce((s, r) => s + r.outstandingAmount, 0)
  const overdueAll = rows.filter(
    (r) => r.paymentStatus !== 'paid' && getDueMeta(r.dueDate).isOverdue,
  ).length

  return (
    <>
      {/* Page header */}
      <Card className="flex flex-wrap gap-4 p-4">
        <div className="flex gap-3">
          <div className="border px-4 py-2 text-sm">
            <p className="text-muted-foreground">Всего ожидается</p>
            <p className="text-lg font-semibold text-green-600 tabular-nums">
              {formatCurrency(totalAll)} ₽
            </p>
          </div>
          {overdueAll > 0 && (
            <div className="border border-red-200 bg-red-50 px-4 py-2 text-sm">
              <p className="text-red-600">Просрочено</p>
              <p className="text-lg font-semibold text-red-600">
                {overdueAll} {overdueAll === 1 ? 'запись' : 'записей'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: 'dueDate', desc: false }]}
        renderBody={(table) =>
          renderReceivablesTableBody(table, columns.length)
        }
        toolbar={(table) => (
          <Toolbar
            table={table}
            accounts={accounts}
            categories={categories}
            counterparties={counterparties}
          />
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

      {/* Archive confirm */}
      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Архивировать запись?</DialogTitle>
            <DialogDescription>
              «{archiveTarget?.description}» будет перемещена в архив.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button onClick={handleArchiveConfirm}>Архивировать</Button>
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
  counterparties,
}: {
  table: Table<IncomeRow>
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  counterparties: { id: string; name: string }[]
}) {
  const globalFilter = (table.getState().globalFilter as string) ?? ''
  const accountFilter =
    (table.getColumn('account')?.getFilterValue() as string[]) ?? []
  const categoryFilter =
    (table.getColumn('category')?.getFilterValue() as string[]) ?? []
  const counterpartyFilter =
    (table.getColumn('counterparty')?.getFilterValue() as string[]) ?? []
  const overdueOnly =
    (table.getColumn('dueDate')?.getFilterValue() as boolean) ?? false
  const statusFilter =
    (table.getColumn('status')?.getFilterValue() as IncomeStatus[]) ?? []

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
  const statusOptions: MultiSelectOption[] = [
    { value: 'partial', label: 'Частично получен' },
    { value: 'overdue', label: 'Просрочен' },
    { value: 'soon', label: 'Скоро' },
    { value: 'ontime', label: 'В срок' },
    { value: 'nodate', label: 'Без срока' },
  ]

  const hasFilters =
    globalFilter ||
    accountFilter.length > 0 ||
    categoryFilter.length > 0 ||
    counterpartyFilter.length > 0 ||
    overdueOnly ||
    statusFilter.length > 0

  const filteredRows = table.getFilteredRowModel().rows
  const filteredTotal = filteredRows.reduce(
    (s, r) => s + r.original.outstandingAmount,
    0,
  )
  const filteredOverdue = filteredRows.filter(
    (r) =>
      r.original.paymentStatus !== 'paid' &&
      getDueMeta(r.original.dueDate).isOverdue,
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

function renderReceivablesTableBody(
  table: Table<IncomeRow>,
  columnsCount: number,
) {
  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={columnsCount}
          className="h-32 text-center text-muted-foreground"
        >
          Ничего не найдено
        </TableCell>
      </TableRow>
    )
  }

  const groupedRows = groupReceivableRows(rows)

  return groupedRows.map((entry) => {
    if (entry.kind === 'row') {
      return renderReceivableRow(entry.row)
    }

    const total = entry.rows.reduce(
      (sum, row) => sum + row.original.outstandingAmount,
      0,
    )
    const counterparties = [
      ...new Set(
        entry.rows
          .map((row) => row.original.counterparty?.name)
          .filter((value): value is string => Boolean(value)),
      ),
    ]

    return (
      <Fragment key={`client-group-${entry.client.id}`}>
        <TableRow className="bg-muted/35 hover:bg-muted/35">
          <TableCell colSpan={columnsCount} className="py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.client.name}</span>
                <Badge variant="secondary" className="text-[11px] font-normal">
                  Клиент
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {entry.rows.length} {pluralRecords(entry.rows.length)}
              </span>
              {counterparties.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {counterparties.join(', ')}
                </span>
              )}
              <span className="ml-auto text-sm font-semibold text-green-600 tabular-nums">
                {formatCurrency(total)} ₽
              </span>
            </div>
          </TableCell>
        </TableRow>
        {entry.rows.map((row, index) =>
          renderReceivableRow(
            row,
            index === entry.rows.length - 1 ? 'border-b-4 border-b-border' : '',
          ),
        )}
      </Fragment>
    )
  })
}

function renderReceivableRow(
  row: TableRowModel<IncomeRow>,
  className?: string,
) {
  return (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() ? 'selected' : undefined}
      className={className}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={
            cell.column.columnDef.meta?.cellClassName as string | undefined
          }
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

function groupReceivableRows(rows: TableRowModel<IncomeRow>[]) {
  const clientCounts = new Map<string, number>()

  for (const row of rows) {
    if (row.original.client?.id) {
      clientCounts.set(
        row.original.client.id,
        (clientCounts.get(row.original.client.id) ?? 0) + 1,
      )
    }
  }

  const groups: (
    | { kind: 'row'; row: TableRowModel<IncomeRow> }
    | {
        kind: 'client'
        client: NonNullable<IncomeRow['client']>
        rows: TableRowModel<IncomeRow>[]
      }
  )[] = []
  const groupByClientId = new Map<
    string,
    {
      kind: 'client'
      client: NonNullable<IncomeRow['client']>
      rows: TableRowModel<IncomeRow>[]
    }
  >()

  for (const row of rows) {
    const client = row.original.client

    if (!client || (clientCounts.get(client.id) ?? 0) < 2) {
      groups.push({ kind: 'row', row })
      continue
    }

    const existing = groupByClientId.get(client.id)
    if (existing) {
      existing.rows.push(row)
      continue
    }

    const nextGroup = {
      kind: 'client' as const,
      client,
      rows: [row],
    }
    groupByClientId.set(client.id, nextGroup)
    groups.push(nextGroup)
  }

  return groups
}
