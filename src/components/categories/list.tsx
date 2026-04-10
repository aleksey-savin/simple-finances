import { Pencil, Tag, Globe, Building2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCategories, categoriesQueryKey } from './actions'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '../ui/item'

import { EditCategoryForm } from '.'
import { DeleteCategory } from '.'

import type { Category } from '#/types'

function CategoryRow({
  category,
  editingId,
  setEditingId,
}: {
  category: Category
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const isEditing = editingId === category.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <Tag className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>{category.name}</ItemTitle>
          <div className="flex gap-1 flex-wrap mt-0.5">
            {category.useForExpenses && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                Расходы
              </Badge>
            )}
            {category.useForIncome && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 text-green-700 bg-green-50 dark:bg-green-950/30"
              >
                Доход
              </Badge>
            )}
            {!category.useForExpenses && !category.useForIncome && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 text-muted-foreground"
              >
                Не используется
              </Badge>
            )}
            {category.isShared && (
              <Badge variant="default" className="text-xs px-1.5 py-0 gap-1">
                <Globe className="size-2.5" />
                Общая
              </Badge>
            )}
            {category.company && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 gap-1 text-muted-foreground"
              >
                <Building2 className="size-2.5" />
                {category.company.name}
              </Badge>
            )}
          </div>
        </ItemContent>
        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : category.id)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteCategory categoryId={category.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="border border-t-0 rounded-b-md px-4 pb-4 -mt-0.5 bg-muted/30">
          <EditCategoryForm
            category={category}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  )
}

export const CategoriesList = () => {
  const { data: categories = [] } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => fetchCategories(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>(
    'all',
  )
  const [sharedFilter, setSharedFilter] = useState<'all' | 'shared' | 'own'>(
    'all',
  )

  const sorted = [...categories]
    .filter((c) => {
      if (typeFilter === 'expense') return c.useForExpenses
      if (typeFilter === 'income') return c.useForIncome
      return true
    })
    .filter((c) => {
      if (sharedFilter === 'shared') return c.isShared
      if (sharedFilter === 'own') return !c.isShared
      return true
    })

  return (
    <>
      <div className="px-4 py-3 shrink-0 flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Категории ({sorted.length} из {categories.length})
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          value={typeFilter}
          onValueChange={(v) => v && setTypeFilter(v as typeof typeFilter)}
          className="justify-start"
        >
          <ToggleGroupItem value="all" className="text-xs h-7 px-2">
            Все
          </ToggleGroupItem>
          <ToggleGroupItem value="expense" className="text-xs h-7 px-2">
            Расходы
          </ToggleGroupItem>
          <ToggleGroupItem value="income" className="text-xs h-7 px-2">
            Доход
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={sharedFilter}
          onValueChange={(v) => v && setSharedFilter(v as typeof sharedFilter)}
          className="justify-start"
        >
          <ToggleGroupItem value="all" className="text-xs h-7 px-2">
            Все
          </ToggleGroupItem>
          <ToggleGroupItem value="shared" className="text-xs h-7 px-2">
            Общие
          </ToggleGroupItem>
          <ToggleGroupItem value="own" className="text-xs h-7 px-2">
            Мои
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет категорий
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sorted.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
