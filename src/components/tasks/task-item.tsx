import {
  MoreVertical,
  Square,
  SquareCheck,
  Star,
  Sun,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { TaskItem as TaskItemType, TaskListItem } from '@/types'
import {
  addFavourite,
  deleteTask,
  moveTask,
  toggleTaskDay,
  toggleTaskDone,
} from './actions'
import { useTasksActions } from './hooks'

type Props = {
  task: TaskItemType
  lists: TaskListItem[]
  // List name shown next to the description (used on the "На день" tab).
  listName?: string
}

export function TaskItemRow({ task, lists, listName }: Props) {
  const { run } = useTasksActions()
  const done = task.finishedAt !== null
  const otherLists = lists.filter((list) => list.id !== task.listId)

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground"
        title={done ? 'Снять отметку' : 'Выполнено'}
        onClick={() =>
          run(toggleTaskDone({ data: { id: task.id, done: !done } }))
        }
      >
        {done ? (
          <SquareCheck className="size-4" />
        ) : (
          <Square className="size-4" />
        )}
      </Button>

      <span
        className={
          done
            ? 'min-w-0 flex-1 text-sm text-muted-foreground line-through'
            : 'min-w-0 flex-1 text-sm text-on-surface'
        }
      >
        {task.description}
        {listName ? (
          <span className="ml-2 text-xs text-muted-foreground">{listName}</span>
        ) : null}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={
          task.dayList
            ? 'size-7 shrink-0 text-warning'
            : 'size-7 shrink-0 text-muted-foreground'
        }
        title={task.dayList ? 'Убрать из «На день»' : 'Добавить в «На день»'}
        onClick={() =>
          run(toggleTaskDay({ data: { id: task.id, dayList: !task.dayList } }))
        }
      >
        <Sun className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground"
        title="В избранное"
        onClick={() =>
          run(addFavourite({ data: { id: task.id } }), 'Добавлено в избранное')
        }
      >
        <Star className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            title="Действия"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {otherLists.length > 0 ? (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  Переместить в список
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {otherLists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() =>
                        run(
                          moveTask({ data: { id: task.id, listId: list.id } }),
                          'Задача перемещена',
                        )
                      }
                    >
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              run(deleteTask({ data: { id: task.id } }), 'Задача удалена')
            }
          >
            <Trash2 className="size-4" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
