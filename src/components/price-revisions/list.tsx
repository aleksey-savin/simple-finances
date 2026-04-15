import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { PriceRevision } from '@/types'
import { DeletePriceRevision } from './delete'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function PriceRevisionList({
  revisions,
}: {
  revisions: PriceRevision[]
}) {
  return (
    <Card className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Название</TableHead>
            <TableHead className="font-bold">Направление</TableHead>
            <TableHead className="font-bold">Договоров</TableHead>
            <TableHead className="font-bold">Создана</TableHead>
            <TableHead className="w-28 text-right font-bold">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revisions.map((revision) => (
            <TableRow key={revision.id}>
              <TableCell className="font-medium">{revision.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{revision.businessLine.name}</Badge>
              </TableCell>
              <TableCell>{revision.itemCount}</TableCell>
              <TableCell>{formatDate(revision.createdAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" className="size-8" title="Открыть ревизию">
                    <Link to="/price-revisions/$id" params={{ id: revision.id }}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <DeletePriceRevision entityId={revision.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
