import { Card } from '@/components/ui/card'

export type HistoryEntry = {
  id: string
  title: string
  subtitle?: string
  description?: React.ReactNode
  date: Date
  actor?: string
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function ClientHistoryLog({ entries }: { entries: HistoryEntry[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">История</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">История пуста</p>
      ) : (
        <div className="flex flex-col divide-y">
          {entries.map((e) => (
            <div key={e.id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="shrink-0 text-xs text-muted-foreground">{formatDate(e.date)}</p>
              </div>
              {(e.subtitle || e.actor) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[e.actor, e.subtitle].filter(Boolean).join(' · ')}
                </p>
              )}
              {e.description && <div className="mt-2">{e.description}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
