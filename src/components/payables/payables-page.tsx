import { startTransition, useState } from 'react'

import { toast } from 'sonner'

import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'
import type { TagItem } from '#/components/ui/tag-picker'
import {
  addExpenseTag,
  createTag,
  fetchTags,
  fetchTagTotals,
  removeExpenseTag,
} from '#/routes/api/-tags'

import { buildPayablesColumns } from './columns'
import { PayablesSummaryCards } from './summary-cards'
import { PayablesTableSection } from './table-section'
import type { PayablesLoaderData, PayablesTagTotal, TagsMap } from './types'
import { getPayablesSummary } from './utils'

export function PayablesPage({
  currentMonth,
  previousUnpaid,
  accounts,
  categories,
  counterparties,
  monthLabel,
  tagsMap: initialTagsMap,
  allTags: initialAllTags,
  tagTotals: initialTagTotals,
}: PayablesLoaderData) {
  const [tagsMap, setTagsMap] = useState<TagsMap>(initialTagsMap)
  const [allTags, setAllTags] = useState<TagItem[]>(initialAllTags)
  const [tagTotals, setTagTotals] =
    useState<PayablesTagTotal[]>(initialTagTotals)

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
  })

  const summary = getPayablesSummary(currentMonth, previousUnpaid)

  return (
    <>
      <PayablesSummaryCards
        currentMonth={currentMonth}
        previousUnpaid={previousUnpaid}
      />

      <PayablesTableSection
        data={[...currentMonth, ...previousUnpaid]}
        columns={columns}
        initialSorting={[{ id: 'createdAt', desc: false }]}
        monthLabel={monthLabel}
        accounts={accounts}
        categories={categories}
        counterparties={counterparties}
        allTags={allTags}
      />

      <TagSummaryPanel totals={tagTotals} />
    </>
  )
}
