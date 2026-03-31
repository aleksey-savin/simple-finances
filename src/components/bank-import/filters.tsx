import { Search, X } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'

export type BankImportDirectionFilter = 'all' | 'credit' | 'debit'
export type BankImportStatusFilter = 'all' | 'matched' | 'partial' | 'unmatched'

export function BankImportFilters({
  search,
  onSearchChange,
  directionFilter,
  onDirectionFilterChange,
  statusFilter,
  onStatusFilterChange,
  hasActiveFilters,
  onClearFilters,
}: {
  search: string
  onSearchChange: (value: string) => void
  directionFilter: BankImportDirectionFilter
  onDirectionFilterChange: (value: BankImportDirectionFilter) => void
  statusFilter: BankImportStatusFilter
  onStatusFilterChange: (value: BankImportStatusFilter) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}) {
  return (
    <Card className="flex flex-col gap-6 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Поиск по назначению, контрагенту, номеру..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 lg:justify-between">
        <ToggleGroup
          variant="outline"
          type="single"
          value={directionFilter}
          onValueChange={(value) => {
            if (value) onDirectionFilterChange(value as BankImportDirectionFilter)
          }}
        >
          <ToggleGroupItem value="all">Все</ToggleGroupItem>
          <ToggleGroupItem value="credit">Поступления</ToggleGroupItem>
          <ToggleGroupItem value="debit">Списания</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-center gap-4">
          <ToggleGroup
            variant="outline"
            type="single"
            value={statusFilter}
            onValueChange={(value) => {
              if (value) onStatusFilterChange(value as BankImportStatusFilter)
            }}
          >
            <ToggleGroupItem value="all">Все</ToggleGroupItem>
            <ToggleGroupItem value="matched">Разнесены</ToggleGroupItem>
            <ToggleGroupItem value="partial">Частично</ToggleGroupItem>
            <ToggleGroupItem value="unmatched">Без привязки</ToggleGroupItem>
          </ToggleGroup>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={onClearFilters}
            >
              <X className="size-4" />
              Сбросить
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
