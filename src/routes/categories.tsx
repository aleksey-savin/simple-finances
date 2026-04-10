import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'

import { Globe, Pencil, Search, Tag, X } from 'lucide-react'

import { EditCategoryForm } from '@/components/categories'
import { DeleteCategory } from '@/components/categories/delete'
import { fetchCategories } from '@/components/categories/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export const Route = createFileRoute('/categories')({
  loader: () => fetchCategories(),
  component: CategoriesPage,
})

function CategoriesPage() {
  const categories = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>(
    'all',
  )
  const [sharedFilter, setSharedFilter] = useState<'all' | 'shared' | 'own'>(
    'all',
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingCategory =
    categories.find((category) => category.id === editingId) ?? null

  const filteredCategories = categories.filter((category) => {
    const query = search.trim().toLowerCase()
    if (query) {
      const haystack = [
        category.name,
        category.useForExpenses ? 'расходы' : '',
        category.useForIncome ? 'доход' : '',
        category.isShared ? 'общая' : 'личная',
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(query)) return false
    }

    if (typeFilter === 'expense' && !category.useForExpenses) return false
    if (typeFilter === 'income' && !category.useForIncome) return false

    if (sharedFilter === 'shared' && !category.isShared) return false
    if (sharedFilter === 'own' && category.isShared) return false

    return true
  })

  const hasActiveFilters =
    search.trim() !== '' || typeFilter !== 'all' || sharedFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setSharedFilter('all')
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию категории"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ToggleGroup
              variant="outline"
              type="single"
              value={typeFilter}
              onValueChange={(value) => {
                if (value) setTypeFilter(value as typeof typeFilter)
              }}
            >
              <ToggleGroupItem value="all">Все</ToggleGroupItem>
              <ToggleGroupItem value="expense">Расходы</ToggleGroupItem>
              <ToggleGroupItem value="income">Доходы</ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              variant="outline"
              type="single"
              value={sharedFilter}
              onValueChange={(value) => {
                if (value) setSharedFilter(value as typeof sharedFilter)
              }}
            >
              <ToggleGroupItem value="all">Все</ToggleGroupItem>
              <ToggleGroupItem value="shared">Общие</ToggleGroupItem>
              <ToggleGroupItem value="own">Мои</ToggleGroupItem>
            </ToggleGroup>

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

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredCategories.length} из {categories.length}
            </span>
          </div>
        </Card>

        {filteredCategories.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredCategories.map((category) => (
                <Card key={category.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{category.name}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {category.useForExpenses && (
                          <Badge variant="destructive">Расходы</Badge>
                        )}
                        {category.useForIncome && (
                          <Badge
                            variant="secondary"
                            className="text-green-700 bg-green-50 dark:bg-green-950/30"
                          >
                            Доходы
                          </Badge>
                        )}
                        {category.isShared && (
                          <Badge className="gap-1">
                            <Globe className="size-3" />
                            Общая
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(category.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteCategory categoryId={category.id} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Категория</TableHead>
                    <TableHead className="font-bold">Тип</TableHead>
                    <TableHead className="font-bold">Доступ</TableHead>
                    <TableHead className="w-24 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <Tag className="size-4 text-muted-foreground" />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {category.useForExpenses && (
                            <Badge variant="destructive">Расходы</Badge>
                          )}
                          {category.useForIncome && (
                            <Badge
                              variant="secondary"
                              className="text-green-700 bg-green-50 dark:bg-green-950/30"
                            >
                              Доходы
                            </Badge>
                          )}
                          {!category.useForExpenses && !category.useForIncome && (
                            <Badge variant="outline">Не используется</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.isShared ? (
                          <Badge className="gap-1">
                            <Globe className="size-3" />
                            Общая
                          </Badge>
                        ) : (
                          <Badge variant="outline">Моя</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditingId(category.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteCategory categoryId={category.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={editingCategory !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование категории</DialogTitle>
            <DialogDescription>{editingCategory?.name}</DialogDescription>
          </DialogHeader>
          {editingCategory ? (
            <EditCategoryForm
              category={editingCategory}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Outlet />
    </>
  )
}
