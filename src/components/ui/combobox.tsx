import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import { Button } from '#/components/ui/button'
import { Popover, PopoverTrigger } from '#/components/ui/popover'
import { cn } from '#/lib/utils'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
  badge?: string
  keywords?: string[]
}

type ComboboxProps = {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  contentClassName?: string
  disabled?: boolean
  onBlur?: () => void
  autoFocusSearch?: boolean
  allowClear?: boolean
  clearLabel?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Поиск…',
  emptyText = 'Ничего не найдено',
  className,
  contentClassName,
  disabled,
  onBlur,
  autoFocusSearch = true,
  allowClear = false,
  clearLabel = 'Очистить',
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options

    return options.filter((option) => {
      const haystack = [option.label, option.description, ...(option.keywords ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [options, query])

  useEffect(() => {
    if (!open || !autoFocusSearch) return
    const timer = setTimeout(() => {
      const input = contentRef.current?.querySelector('input')
      input?.focus()
    }, 0)
    return () => clearTimeout(timer)
  }, [open, autoFocusSearch])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setQuery('')
          onBlur?.()
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 w-full justify-between text-sm font-normal',
            selectedOption ? 'text-foreground' : 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <span className="truncate">{selectedOption?.label ?? placeholder}</span>
            {selectedOption?.badge && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {selectedOption.badge}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Content
        ref={contentRef}
        align="start"
        sideOffset={4}
        className={cn(
          'z-50 w-[--radix-popover-trigger-width] overflow-hidden border bg-popover p-2 text-popover-foreground shadow-md outline-hidden',
          contentClassName,
        )}
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full min-w-0 border border-input bg-input px-3 py-1 pl-8 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredOptions.map((option) => {
                  const isSelected = option.value === value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'bg-accent/60',
                      )}
                      onClick={() => {
                        onValueChange(option.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-2 overflow-hidden">
                        <span className="min-w-0 overflow-hidden">
                          <span className="block truncate">{option.label}</span>
                          {option.description
                            ? option.description.split('\n').map((line, i) => (
                                <span key={i} className="block overflow-hidden break-words text-xs text-muted-foreground">
                                  {line}
                                </span>
                              ))
                            : null}
                        </span>
                        {option.badge && (
                          <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {option.badge}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {allowClear && value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 justify-start gap-1.5 text-sm"
              onClick={() => {
                onValueChange('')
                setOpen(false)
              }}
            >
              <X className="size-3.5" />
              {clearLabel}
            </Button>
          ) : null}
        </div>
      </PopoverPrimitive.Content>
    </Popover>
  )
}
