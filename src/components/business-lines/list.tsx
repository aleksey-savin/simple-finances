import { useState } from 'react'
import { Briefcase, Pencil } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import type { BusinessLine } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { businessLinesQueryKey, fetchBusinessLines } from './actions'
import { DeleteBusinessLine } from './delete'
import { EditBusinessLineForm } from './form'

function BusinessLineRow({
  businessLine,
  editingId,
  setEditingId,
}: {
  businessLine: BusinessLine
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const isEditing = editingId === businessLine.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <Briefcase className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>{businessLine.name}</ItemTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {`Договоров: ${businessLine.contracts.length} · Серверы: ${
              businessLine.allowServerBindings ? 'разрешены' : 'запрещены'
            } · Уведомления: ${businessLine.allowNotifications ? 'вкл' : 'выкл'}`}
          </p>
        </ItemContent>

        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : businessLine.id)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteBusinessLine entityId={businessLine.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="-mt-0.5 rounded-b-md border border-t-0 bg-muted/30 px-4 pb-4">
          <EditBusinessLineForm
            businessLine={businessLine}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  )
}

export const BusinessLinesList = () => {
  const { data: businessLines = [] } = useQuery({
    queryKey: businessLinesQueryKey,
    queryFn: () => fetchBusinessLines(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">
          Все направления ({businessLines.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {businessLines.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Нет добавленных направлений
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {businessLines.map((businessLine) => (
              <BusinessLineRow
                key={businessLine.id}
                businessLine={businessLine}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
