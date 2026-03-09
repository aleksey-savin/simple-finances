import { Pencil, Tag } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '../ui/item'

import { EditCategoryForm } from '.'
import { DeleteCategory } from '.'

type Category = {
  id: string
  name: string
  useForExpenses: boolean
  useForIncome: boolean
}

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
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 text-red-600 bg-red-50 dark:bg-red-950/30"
              >
                Расходы
              </Badge>
            )}
            {category.useForIncome && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 text-green-700 bg-green-50 dark:bg-green-950/30"
              >
                Доходы
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
          <DeleteCategory category={category} />
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

export const CategoriesList = ({ categories }: { categories: Category[] }) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <>
      <div className="px-6 py-3 shrink-0">
        <p className="text-sm font-medium text-muted-foreground">
          Все категории ({categories.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Нет категорий
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {categories.map((category) => (
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
