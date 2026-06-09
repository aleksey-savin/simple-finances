import { useState } from 'react'
import { Check, MoreVertical, Plus, Sun, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import type { TasksData } from '@/types'
import { addTaskList, deleteTaskList, updateTaskList } from './actions'
import { useTasksActions } from './hooks'
import { TaskGroup } from './task-group'
import { TaskItemRow } from './task-item'
import { FavouriteItemRow } from './favourite-item'
import { AddTaskInput } from './add-task-input'
import { getListIcon } from './list-icons'
import { ListAppearanceFields } from './list-appearance'

const DAY_TAB = 'day'

export default function TasksPage({ data }: { data: TasksData }) {
  const { run } = useTasksActions()
  const { lists, tasks } = data

  const [activeTabRaw, setActiveTab] = useState<string>(DAY_TAB)
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIcon, setNewListIcon] = useState<string | null>(null)
  const [newListColor, setNewListColor] = useState<string | null>(null)

  // Guard against an active tab whose list was just deleted.
  const activeTab =
    activeTabRaw === DAY_TAB || lists.some((list) => list.id === activeTabRaw)
      ? activeTabRaw
      : DAY_TAB

  const isDay = activeTab === DAY_TAB
  const listNameById = new Map(lists.map((list) => [list.id, list.name]))
  const listColorById = new Map(lists.map((list) => [list.id, list.color]))
  const activeListColor = isDay
    ? null
    : (lists.find((list) => list.id === activeTab)?.color ?? null)

  // Favourite templates with at least one pending (unfinished) clone are hidden:
  // the clone stands in for the template until it is done.
  const activeClonedFavIds = new Set(
    tasks
      .filter((t) => t.sourceFavouriteId && !t.finishedAt)
      .map((t) => t.sourceFavouriteId),
  )

  // ─── Grouping ────────────────────────────────────────────────────────────
  const undone = isDay
    ? tasks.filter((t) => t.dayList && !t.favourite && !t.finishedAt)
    : tasks.filter(
        (t) => t.listId === activeTab && !t.favourite && !t.finishedAt,
      )
  const done = isDay
    ? tasks.filter((t) => t.dayList && !t.favourite && t.finishedAt)
    : tasks.filter(
        (t) => t.listId === activeTab && !t.favourite && t.finishedAt,
      )
  const favourites = (
    isDay
      ? tasks.filter((t) => t.favourite)
      : tasks.filter((t) => t.listId === activeTab && t.favourite)
  ).filter((t) => !activeClonedFavIds.has(t.id))

  // ─── Undone counters per tab ───────────────────────────────────────────────
  const undoneCountByList = new Map<string, number>()
  let dayUndoneCount = 0
  for (const t of tasks) {
    if (t.favourite || t.finishedAt) continue
    undoneCountByList.set(t.listId, (undoneCountByList.get(t.listId) ?? 0) + 1)
    if (t.dayList) dayUndoneCount += 1
  }

  function cancelAddList() {
    setAddingList(false)
    setNewListName('')
    setNewListIcon(null)
    setNewListColor(null)
  }

  async function createList() {
    const name = newListName.trim()
    if (!name) {
      cancelAddList()
      return
    }
    const id = await run(
      addTaskList({ data: { name, icon: newListIcon, color: newListColor } }),
    )
    cancelAddList()
    if (typeof id === 'string') setActiveTab(id)
  }

  async function removeList(id: string) {
    await run(deleteTaskList({ data: { id } }), 'Список удалён')
    if (activeTabRaw === id) setActiveTab(DAY_TAB)
  }

  const tabBase =
    'flex shrink-0 items-center gap-1 px-3 py-2 text-base whitespace-nowrap transition-colors'
  const NewListIcon = getListIcon(newListIcon)

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs — horizontally scrollable on overflow (no wrap, hidden scrollbar) */}
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab(DAY_TAB)}
          className={
            isDay
              ? `${tabBase} bg-muted font-medium text-on-surface`
              : `${tabBase} text-muted-foreground hover:bg-muted/50`
          }
        >
          <Sun className="size-4 text-yellow-500" />
          На день
          {dayUndoneCount > 0 ? (
            <span className="ml-0.5 text-sm tabular-nums text-muted-foreground">
              {dayUndoneCount}
            </span>
          ) : null}
        </button>

        {lists.map((list) => {
          const active = activeTab === list.id
          const Icon = getListIcon(list.icon)
          const undoneCount = undoneCountByList.get(list.id) ?? 0
          return (
            <div
              key={list.id}
              className={
                active
                  ? `${tabBase} bg-muted font-medium text-on-surface`
                  : `${tabBase} text-muted-foreground hover:bg-muted/50`
              }
            >
              <button
                type="button"
                onClick={() => setActiveTab(list.id)}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <Icon
                  className="size-4"
                  style={list.color ? { color: list.color } : undefined}
                />
                {list.name}
                {undoneCount > 0 ? (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {undoneCount}
                  </span>
                ) : null}
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1 size-6 text-muted-foreground"
                    title="Настройки списка"
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="flex w-64 flex-col gap-3"
                >
                  <ListAppearanceFields
                    icon={list.icon}
                    color={list.color}
                    onIconChange={(icon) =>
                      run(updateTaskList({ data: { id: list.id, icon } }))
                    }
                    onColorChange={(color) =>
                      run(updateTaskList({ data: { id: list.id, color } }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={() => removeList(list.id)}
                  >
                    <Trash2 className="size-4" />
                    Удалить список
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          )
        })}

        {addingList ? (
          <div className="flex shrink-0 items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  title="Иконка и цвет"
                >
                  <NewListIcon
                    className="size-4"
                    style={newListColor ? { color: newListColor } : undefined}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <ListAppearanceFields
                  icon={newListIcon}
                  color={newListColor}
                  onIconChange={setNewListIcon}
                  onColorChange={setNewListColor}
                />
              </PopoverContent>
            </Popover>
            <Input
              autoFocus
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void createList()
                }
                if (event.key === 'Escape') {
                  cancelAddList()
                }
              }}
              placeholder="Название списка"
              className="h-8 w-40"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title="Создать"
              onClick={() => void createList()}
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title="Отмена"
              onClick={cancelAddList}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground"
            title="Новый список"
            onClick={() => setAddingList(true)}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <Card className="flex flex-col gap-1 p-2">
        <TaskGroup title="Не выполнено" count={undone.length} showEmpty={isDay}>
          {!isDay ? <AddTaskInput listId={activeTab} /> : null}
          {undone.map((task) => (
            <TaskItemRow
              key={task.id}
              task={task}
              lists={lists}
              listName={isDay ? listNameById.get(task.listId) : undefined}
              accentColor={
                isDay ? listColorById.get(task.listId) : activeListColor
              }
            />
          ))}
        </TaskGroup>

        <TaskGroup title="Выполнено" count={done.length} defaultOpen={false}>
          {done.map((task) => (
            <TaskItemRow
              key={task.id}
              task={task}
              lists={lists}
              listName={isDay ? listNameById.get(task.listId) : undefined}
              accentColor={
                isDay ? listColorById.get(task.listId) : activeListColor
              }
            />
          ))}
        </TaskGroup>

        <TaskGroup
          title="Избранные"
          count={favourites.length}
          defaultOpen={false}
        >
          {favourites.map((task) => (
            <FavouriteItemRow
              key={task.id}
              task={task}
              targetListId={isDay ? task.listId : activeTab}
              markDay={isDay}
              listName={isDay ? listNameById.get(task.listId) : undefined}
              accentColor={
                isDay ? listColorById.get(task.listId) : activeListColor
              }
            />
          ))}
        </TaskGroup>
      </Card>
    </div>
  )
}
