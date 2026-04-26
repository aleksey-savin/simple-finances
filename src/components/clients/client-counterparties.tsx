import type { ClientDetail } from '@/types'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ClientCounterparties({
  counterparties,
}: {
  counterparties: ClientDetail['counterparties']
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Контрагенты</h3>
      {counterparties.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет контрагентов</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Название</TableHead>
              <TableHead className="font-bold">Полное название</TableHead>
              <TableHead className="font-bold">Тип</TableHead>
              <TableHead className="font-bold">ИНН</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counterparties.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.fullName ?? '—'}
                </TableCell>
                <TableCell className="text-sm">{c.type || '—'}</TableCell>
                <TableCell className="font-mono text-sm">
                  {c.tin ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
