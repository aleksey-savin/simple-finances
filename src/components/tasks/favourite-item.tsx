import { Plus, Trash2 } from 'lucide-react'

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
  // List accent colour; tints the row background at low opacity.
  accentColor?: string | null
}

export function FavouriteItemRow({
  task,
  targetListId,
  markDay,
  listName,
  accentColor,
}: Props) {
  const { run } = useTasksActions()

  return (
    <div
      className="group flex animate-in items-center gap-2 px-2 py-1.5 transition-colors duration-200 fade-in slide-in-from-top-1 hover:bg-muted/50"
      style={accentColor ? { backgroundColor: `${accentColor}14` } : undefined}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-primary transition-all active:scale-90"
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

      <span className="min-w-0 flex-1 text-base text-on-surface">
        {task.description}
        {listName ? (
          <span className="ml-2 text-sm text-muted-foreground">{listName}</span>
        ) : null}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground transition-all hover:text-destructive active:scale-90"
        title="Удалить шаблон (копии останутся)"
        onClick={() =>
          run(deleteTask({ data: { id: task.id } }), 'Шаблон удалён')
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
