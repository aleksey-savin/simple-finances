import { startTransition, useState } from 'react'

import { toast } from 'sonner'

import { TagSummaryPanel } from '#/components/ui/tag-summary-panel'
import type { TagItem } from '#/components/ui/tag-picker'
import {
  addIncomeTag,
  createTag,
  fetchTags,
  fetchTagTotals,
  removeIncomeTag,
} from '#/components/tags/actions'

import { buildReceivablesColumns } from './columns'
import { ReceivablesSummaryCards } from './summary-cards'
import { ReceivablesTableSection } from './table-section'
import type {
  ReceivablesLoaderData,
  ReceivablesTagTotal,
  TagsMap,
} from './types'

export function ReceivablesPage({
  rows,
  accounts,
  categories,
  counterparties,
  tagsMap: initialTagsMap,
  allTags: initialAllTags,
  tagTotals: initialTagTotals,
}: ReceivablesLoaderData) {
  const [tagsMap, setTagsMap] = useState<TagsMap>(initialTagsMap)
  const [allTags, setAllTags] = useState<TagItem[]>(initialAllTags)
  const [tagTotals, setTagTotals] = useState<ReceivablesTagTotal[]>(
    initialTagTotals,
  )

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
