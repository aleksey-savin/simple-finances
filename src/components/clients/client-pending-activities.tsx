import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export type PendingActivity = {
  id: string
  type: string
  typeLabel: string
  title: string
  subtitle?: string
  status: string
  statusLabel: string
  statusVariant: 'secondary' | 'outline' | 'success' | 'destructive'
  link?: { to: string; params: Record<string, string> }
}

export function ClientPendingActivities({
  activities,
}: {
  activities: PendingActivity[]
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Текущие активности</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет активных задач</p>
      ) : (
        <div className="flex flex-col divide-y">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{a.typeLabel}</p>
                {a.link ? (
                  <Link
                    to={a.link.to}
                    params={a.link.params}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{a.title}</p>
                )}
                {a.subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.subtitle}</p>
                )}
              </div>
              <Badge variant={a.statusVariant}>{a.statusLabel}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
