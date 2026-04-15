import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Договор</TableHead>
              <TableHead className="font-bold">Изменение</TableHead>
              <TableHead className="font-bold">Кто</TableHead>
              <TableHead className="font-bold">Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <span className="text-sm font-medium">{e.title}</span>
                  {e.subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{e.subtitle}</p>
                  )}
                </TableCell>
                <TableCell>{e.description ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {e.actor ?? <span>—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(e.date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
