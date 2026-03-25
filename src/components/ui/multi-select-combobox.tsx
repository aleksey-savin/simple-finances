import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { cn } from '#/lib/utils'

export type MultiSelectOption = {
  value: string
  label: string
  color?: string
  keywords?: string[]
}

type MultiSelectComboboxProps = {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function MultiSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Поиск…',
  emptyText = 'Ничего не найдено',
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options

    return options.filter((option) => {
      const haystack = [option.label, ...(option.keywords ?? [])]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [options, query])

  const triggerLabel =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length <= 2
        ? selectedOptions.map((option) => option.label).join(', ')
        : `${selectedOptions.length} выбрано`

  const toggleValue = (nextValue: string) => {
    onValueChange(
      value.includes(nextValue)
        ? value.filter((currentValue) => currentValue !== nextValue)
        : [...value, nextValue],
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 w-44 justify-between text-sm font-normal',
            value.length === 0 ? 'text-muted-foreground' : 'text-foreground',
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-2"
        align="start"
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((option) => (
                <Badge key={option.value} variant="secondary" className="gap-1">
                  {option.color ? (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  ) : null}
                  <span className="max-w-32 truncate">{option.label}</span>
                </Badge>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'bg-accent/60',
                      )}
                      onClick={() => toggleValue(option.value)}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {option.color ? (
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                      ) : null}
                      <span className="truncate">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {value.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 justify-start gap-1.5 text-sm"
              onClick={() => onValueChange([])}
            >
              <X className="size-3.5" />
              Очистить
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
