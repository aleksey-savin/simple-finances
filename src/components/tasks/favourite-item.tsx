import { Plus, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { TaskItem as TaskItemType } from '@/types'
import { cloneFavourite, deleteTask } from './actions'
import { useTasksActions } from './hooks'

type Props = {
  task: TaskItemType
  // Where a clone should land + whether it should be marked for "На день".
  targetListId: string
  markDay: boolean
  // List name shown next to the description (used on the "На день" tab).
  listName?: string
}

export function FavouriteItemRow({
  task,
  targetListId,
  markDay,
  listName,
}: Props) {
  const { run } = useTasksActions()

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-primary"
        title="Добавить копию в активный список"
        onClick={() =>
          run(
            cloneFavourite({
              data: { id: task.id, targetListId, markDay },
            }),
            'Задача добавлена',
          )
        }
      >
        <Plus className="size-4" />
      </Button>

      <span className="min-w-0 flex-1 text-sm text-on-surface">
        {task.description}
        {listName ? (
          <span className="ml-2 text-xs text-muted-foreground">{listName}</span>
        ) : null}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-primary"
        title="Убрать из избранного"
        onClick={() =>
          run(deleteTask({ data: { id: task.id } }), 'Убрано из избранного')
        }
      >
        <Star className="size-4 fill-current" />
      </Button>
    </div>
  )
}
