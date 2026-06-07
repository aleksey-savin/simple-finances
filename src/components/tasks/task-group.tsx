import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type Props = {
  title: string
  count: number
  defaultOpen?: boolean
  // When false, the "Пусто" placeholder is suppressed (e.g. the undone group,
  // which always renders its add-task input as a child).
  showEmpty?: boolean
  children: ReactNode
}

export function TaskGroup({
  title,
  count,
  defaultOpen = true,
  showEmpty = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col">
      <CollapsibleTrigger className="flex items-center gap-1.5 px-2 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-on-surface">
        <ChevronRight
          className={
            open
              ? 'size-3.5 rotate-90 transition-transform'
              : 'size-3.5 transition-transform'
          }
        />
        {title}
        <span className="tabular-nums">({count})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col">
        {count === 0 && showEmpty ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Пусто</p>
        ) : (
          children
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
