import { startTransition, useState } from 'react'

import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

import { fetchReceivables } from '#/components/receivables/actions'
import { Skeleton } from '#/components/ui/skeleton'
import { buildReceivablesColumns } from '#/components/receivables/columns'
import { ReceivablesSummaryCards } from '#/components/receivables/summary-cards'
import { ReceivablesTableSection } from '#/components/receivables/table-section'
import type {
  ReceivablesTagTotal,
  TagsMap,
} from '#/components/receivables/types'
import {
  addIncomeTag,
  createTag,
  fetchTags,
  fetchTagTotals,
  removeIncomeTag,
} from '#/components/tags/actions'
import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'
import type { TagItem } from '#/components/ui/tag-picker'

function ReceivablesRouteComponent() {
  const {
    rows,
    accounts,
    categories,
    counterparties,
    tagsMap: initialTagsMap,
    allTags: initialAllTags,
    tagTotals: initialTagTotals,
  } = Route.useLoaderData()
  const [tagsMap, setTagsMap] = useState<TagsMap>(initialTagsMap)
  const [allTags, setAllTags] = useState<TagItem[]>(initialAllTags)
  const [tagTotals, setTagTotals] =
    useState<ReceivablesTagTotal[]>(initialTagTotals)

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

  const handleTagAdd = async (incomeId: string, tag: TagItem) => {
    const previousTags = tagsMap[incomeId] ?? []

    setTagsMap((current) => ({
      ...current,
      [incomeId]: [...previousTags.filter((item) => item.id !== tag.id), tag],
    }))

    try {
      await addIncomeTag({ data: { incomeId, tagId: tag.id } })
      await refreshTagData()
    } catch {
      setTagsMap((current) => ({ ...current, [incomeId]: previousTags }))
      toast.error('Не удалось добавить тег')
    }
  }

  const handleTagRemove = async (incomeId: string, tag: TagItem) => {
    const previousTags = tagsMap[incomeId] ?? []

    setTagsMap((current) => ({
      ...current,
      [incomeId]: previousTags.filter((item) => item.id !== tag.id),
    }))

    try {
      await removeIncomeTag({ data: { incomeId, tagId: tag.id } })
      await refreshTagData()
    } catch {
      setTagsMap((current) => ({ ...current, [incomeId]: previousTags }))
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

  const columns = buildReceivablesColumns({
    tagsMap,
    allTags,
    onTagAdd: handleTagAdd,
    onTagRemove: handleTagRemove,
    onTagCreate: handleTagCreate,
  })

  return (
    <>
      <ReceivablesSummaryCards rows={rows} />

      <ReceivablesTableSection
        data={rows}
        columns={columns}
        initialSorting={[{ id: 'dueDate', desc: false }]}
        accounts={accounts}
        categories={categories}
        counterparties={counterparties}
        allTags={allTags}
      />

      <TagSummaryPanel totals={tagTotals} />
    </>
  )
}

function ReceivablesSkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex min-w-35 flex-col justify-center gap-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-3">
        <Skeleton className="h-9 w-full rounded" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    </>
  )
}

export const Route = createFileRoute('/receivables')({
  component: ReceivablesRouteComponent,
  loader: () => fetchReceivables(),
  pendingComponent: ReceivablesSkeleton,
  pendingMs: 0,
})
