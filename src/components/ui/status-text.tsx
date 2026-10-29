import type { ReactNode } from 'react'

import { cn } from '#/lib/utils'

export type StatusTone = 'positive' | 'pending' | 'danger' | 'neutral'

const toneClass: Record<StatusTone, string> = {
  positive: 'text-accent-text',
  pending: 'text-warning-text',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
}

export function StatusText({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-medium',
        toneClass[tone],
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  )
}
