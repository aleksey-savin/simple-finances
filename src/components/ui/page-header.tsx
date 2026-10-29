import type { ReactNode } from 'react'

export function PageHeader({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div className="flex items-baseline gap-3 mr-auto">
        <h1 className="text-3xl leading-none font-semibold tracking-tight">
          {title}
        </h1>
        {count !== undefined && (
          <span className="text-xl font-medium text-faint tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
