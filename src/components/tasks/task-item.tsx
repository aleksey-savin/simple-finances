import { useState } from 'react'
import {
  CalendarDays,
  MoreVertical,
  Square,
  SquareCheck,
  Star,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { format, isBefore, startOfToday } from 'date-fns'
import { ru } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  deleteTask,
  moveTask,
  setTaskDueDate,
  toggleFavourite,
  toggleTaskDay,
  toggleTaskDone,
} from './actions'
import { useTasksActions } from './hooks'

type Props = {
  task: TaskItemType
  lists: TaskListItem[]
  // List name shown next to the description (used on the "На день" tab).
  listName?: string
  // List accent colour; tints the row background at low opacity.
  accentColor?: string | null
}

export function TaskItemRow({ task, lists, listName, accentColor }: Props) {
  const { run } = useTasksActions()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dueOpen, setDueOpen] = useState(false)

  const done = task.finishedAt !== null
  const linked = task.sourceFavouriteId !== null
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const overdue = !!dueDate && !done && isBefore(dueDate, startOfToday())
  const otherLists = lists.filter((list) => list.id !== task.listId)

  function pickDue(date: Date | undefined) {
    setDueOpen(false)
    setMenuOpen(false)
    void run(
      setTaskDueDate({
        data: { id: task.id, dueDate: date ? date.toISOString() : null },
      }),
    )
  }

  function toggleStar() {
    void run(
      toggleFavourite({ data: { id: task.id } }),
      linked ? 'Убрано из избранного' : 'Добавлено в избранное',
    )
  }

  const dueCalendar = (
    <div className="flex flex-col">
      <Calendar
        mode="single"
        selected={dueDate ?? undefined}
        onSelect={pickDue}
        locale={ru}
        autoFocus
      />
      {dueDate ? (
        <Button
          variant="ghost"
          size="sm"
          className="m-1 justify-start text-muted-foreground"
          onClick={() => pickDue(undefined)}
        >
          <X className="size-4" />
          Убрать срок
        </Button>
      ) : null}
    </div>
  )

  return (
    <div
      className="group flex animate-in items-center gap-2 px-2 py-1.5 transition-colors duration-200 fade-in slide-in-from-top-1 hover:bg-muted/50"
      style={accentColor ? { backgroundColor: `${accentColor}14` } : undefined}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground transition-all active:scale-90"
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
            ? 'min-w-0 flex-1 text-base text-muted-foreground line-through'
            : 'min-w-0 flex-1 text-base text-on-surface'
        }
      >
        {task.description}
        {listName ? (
          <span className="ml-2 text-sm text-muted-foreground">{listName}</span>
        ) : null}
        {dueDate ? (
          <span
            className={cn(
              'ml-2 inline-flex animate-in items-center gap-1 text-sm tabular-nums fade-in',
              overdue ? 'text-destructive/80' : 'text-muted-foreground',
            )}
          >
            <CalendarDays className="size-3" />
            {format(dueDate, 'd MMM', { locale: ru })}
          </span>
        ) : null}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'size-7 shrink-0 transition-all active:scale-90',
          task.dayList ? 'text-yellow-500' : 'text-muted-foreground',
        )}
        title={task.dayList ? 'Убрать из «На день»' : 'Добавить в «На день»'}
        onClick={() =>
          run(toggleTaskDay({ data: { id: task.id, dayList: !task.dayList } }))
        }
      >
        <Sun className={cn('size-4', task.dayList && 'fill-yellow-500/20')} />
      </Button>

      {/* Due date + favourite live inline on desktop, in the ⋮ menu on mobile. */}
      {!isMobile ? (
        <>
          <Popover open={dueOpen} onOpenChange={setDueOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-7 shrink-0 transition-all active:scale-90',
                  dueDate
                    ? overdue
                      ? 'text-destructive/80'
                      : 'text-on-surface'
                    : 'text-muted-foreground',
                )}
                title="Срок"
              >
                <CalendarDays className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              {dueCalendar}
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-7 shrink-0 transition-all active:scale-90',
              linked ? 'text-primary' : 'text-muted-foreground',
            )}
            title={linked ? 'Убрать из избранного' : 'В избранное'}
            onClick={toggleStar}
          >
            <Star className={cn('size-4', linked && 'fill-current')} />
          </Button>
        </>
      ) : null}

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
          {isMobile ? (
            <>
              <DropdownMenuItem onClick={toggleStar}>
                <Star className={cn('size-4', linked && 'fill-current')} />
                {linked ? 'Убрать из избранного' : 'В избранное'}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarDays className="size-4" />
                  Срок
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0">
                  {dueCalendar}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          ) : null}
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
