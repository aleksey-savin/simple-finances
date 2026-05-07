import { startTransition, useState } from 'react'

import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

import { fetchPayables } from '#/components/payables/actions'
import { Skeleton } from '#/components/ui/skeleton'
import { buildPayablesColumns } from '#/components/payables/columns'
import { PayablesSummaryCards } from '#/components/payables/summary-cards'
import { PayablesTableSection } from '#/components/payables/table-section'
import type {
  ExpenseRow,
  PayablesTagTotal,
  TagsMap,
} from '#/components/payables/types'
import { EditInvoice } from '#/components/invoices/edit'
import type { EditableInvoiceItem } from '#/components/invoices/edit'
import {
  addExpenseTag,
  createTag,
  fetchTags,
  fetchTagTotals,
  removeExpenseTag,
} from '#/components/tags/actions'
import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'
import type { TagItem } from '#/components/ui/tag-picker'

function PayablesRouteComponent() {
  const {
    currentMonth,
    previousUnpaid,
    accounts,
    categories,
    formCategories,
    counterparties,
    monthLabel,
    tagsMap: initialTagsMap,
    allTags: initialAllTags,
    tagTotals: initialTagTotals,
  } = Route.useLoaderData()
  const [tagsMap, setTagsMap] = useState<TagsMap>(initialTagsMap)
  const [allTags, setAllTags] = useState<TagItem[]>(initialAllTags)
  const [tagTotals, setTagTotals] =
    useState<PayablesTagTotal[]>(initialTagTotals)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  const expenseRows = [...currentMonth, ...previousUnpaid]
  const editingExpense =
    expenseRows.find(
      (row) => row.id === editingExpenseId && !row.isProjected,
    ) ?? null

  const refreshTagData = async () => {
    const [totals, tags] = await Promise.all([fetchTagTotals(), fetchTags()])

    startTransition(() => {
      setTagTotals(totals)
      setAllTags(
        tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })),
      )
    })
  }

  const handleTagAdd = async (expenseId: string, tag: TagItem) => {
    const previousTags = tagsMap[expenseId] ?? []

    setTagsMap((current) => ({
      ...current,
      [expenseId]: [...previousTags.filter((item) => item.id !== tag.id), tag],
    }))

    try {
      await addExpenseTag({ data: { expenseId, tagId: tag.id } })
      await refreshTagData()
    } catch {
      setTagsMap((current) => ({ ...current, [expenseId]: previousTags }))
      toast.error('Не удалось добавить тег')
    }
  }

  const handleTagRemove = async (expenseId: string, tag: TagItem) => {
    const previousTags = tagsMap[expenseId] ?? []

    setTagsMap((current) => ({
      ...current,
      [expenseId]: previousTags.filter((item) => item.id !== tag.id),
    }))

    try {
      await removeExpenseTag({ data: { expenseId, tagId: tag.id } })
      await refreshTagData()
    } catch {
      setTagsMap((current) => ({ ...current, [expenseId]: previousTags }))
      toast.error('Не удалось удалить тег')
    }
  }

  const handleTagCreate = async (
    name: string,
    color: string,
  ): Promise<TagItem> => {
    try {
      const created = await createTag({ data: { name, color } })
      const newTag: TagItem = {
        id: created.id,
        name: created.name,
        color: created.color,
      }

      startTransition(() => {
        setAllTags((current) =>
          [...current, newTag].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        )
      })

      return newTag
    } catch {
      toast.error('Не удалось создать тег')
      throw new Error('Не удалось создать тег')
    }
  }

  const columns = buildPayablesColumns({
    tagsMap,
    allTags,
    onTagAdd: handleTagAdd,
    onTagRemove: handleTagRemove,
    onTagCreate: handleTagCreate,
    onEdit: (row) => setEditingExpenseId(row.id),
  })

  return (
    <>
      <PayablesSummaryCards
        currentMonth={currentMonth}
        previousUnpaid={previousUnpaid}
      />

      <PayablesTableSection
        data={expenseRows}
        columns={columns}
        initialSorting={[{ id: 'createdAt', desc: false }]}
        monthLabel={monthLabel}
        accounts={accounts}
        categories={categories}
        counterparties={counterparties}
        allTags={allTags}
      />

      {editingExpense && (
        <EditInvoice
          item={toEditablePayableInvoice(editingExpense)}
          categories={formCategories}
          accounts={accounts}
          counterparties={counterparties}
          open
          onOpenChange={(open) => {
            if (!open) setEditingExpenseId(null)
          }}
        />
      )}

      <TagSummaryPanel totals={tagTotals} />
    </>
  )
}

function PayablesSkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex min-w-35 flex-col justify-center gap-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-3">
        <Skeleton className="h-9 w-full rounded" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    </>
  )
}

export const Route = createFileRoute('/payables')({
  component: PayablesRouteComponent,
  loader: () => fetchPayables(),
  pendingComponent: PayablesSkeleton,
  pendingMs: 0,
})

function toEditablePayableInvoice(row: ExpenseRow): EditableInvoiceItem {
  return {
    id: row.id,
    kind: 'payable',
    amount: row.amount,
    description: row.description,
    category: row.category,
    currentAccount: row.currentAccount,
    counterparty: row.counterparty,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    archivedAt: row.archivedAt,
    createdBy: row.createdBy,
    linkedInvoiceId: row.linkedInvoiceId,
    contractId: row.contractId,
  }
}
