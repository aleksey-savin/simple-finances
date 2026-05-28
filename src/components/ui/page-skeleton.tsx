import { Skeleton } from '#/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex min-w-35 flex-col justify-center gap-2 border p-4"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="border p-4 flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
