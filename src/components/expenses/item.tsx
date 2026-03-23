import { format, isToday, isYesterday, isSameYear } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Archive,
  ArchiveRestore,
  ArrowDownCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { Item, ItemContent, ItemTitle } from '../ui/item'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { toast } from 'sonner'
import { DeleteExpense } from './delete'
import { EditExpense } from './edit'
import { archiveExpense } from './actions'
import { useRouter } from '@tanstack/react-router'
import type { Expense } from '#/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

function formatDate(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  if (isSameYear(date, new Date())) return format(date, 'd MMM', { locale: ru })
  return format(date, 'd MMM yyyy', { locale: ru })
}

export const ExpenseItem = ({
  item,
  sharedAccountIds,
  togglePaid,
  categories,
  accounts,
  counterparties = [],
}: {
  item: Expense
  sharedAccountIds: Set<string>
  togglePaid: any
  categories: { id: string; name: string; useForExpenses: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
}) => {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const isPaid = item.paidAt !== null
  const isArchived = item.archivedAt !== null
  const now = new Date()
  const isOverdue =
    !isPaid && item.dueDate !== null && new Date(item.dueDate) < now

  const createdDate = formatDate(new Date(item.createdAt))
  const paidDate = isPaid ? formatDate(new Date(item.paidAt!)) : null
  const dueDateFormatted = item.dueDate
    ? formatDate(new Date(item.dueDate))
    : null

  return (
    <Item
      key={item.id}
      variant={isPaid ? 'outline' : 'muted'}
      className={[
        isOverdue ? 'border-destructive/30 bg-destructive/5' : '',
        isArchived ? 'opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ItemContent className="flex-row items-center gap-4 py-1">
        {/* Icon */}
        <div
          className={`flex shrink-0 items-center justify-center size-9 rounded-full ${
            isPaid ? 'bg-destructive/10' : 'bg-muted/50'
          }`}
        >
          <ArrowDownCircle
            className={`size-5 ${isPaid ? 'text-destructive' : 'text-muted-foreground'}`}
          />
        </div>
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <div className="flex flex-col justify-center gap-2 w-40 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3 shrink-0" />
              {createdDate}
            </span>
            {item.counterparty && (
              <span className="text-sm truncate block">
                {item.counterparty.name}
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <ItemTitle
              className={`text-lg font-semibold wrap-break-word whitespace-normal w-full ${!isPaid ? 'text-muted-foreground' : ''}`}
            >
              {item.description}
            </ItemTitle>
            <div className="flex gap-1.5 flex-wrap items-center py-2">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {item.category.name}
              </Badge>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {item.currentAccount.name}
              </Badge>
              {isArchived && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 gap-1 text-muted-foreground"
                >
                  <Archive className="size-3" />В архиве
                </Badge>
              )}
              {sharedAccountIds.has(item.currentAccount.id) &&
                item.createdByUser && (
                  <span className="text-xs text-muted-foreground">
                    {item.createdByUser.name}
                  </span>
                )}
            </div>
          </div>
        </div>

        {/* Amount + dates */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span
            className={`text-base font-semibold tabular-nums ${
              isPaid ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            −
            {Number(item.amount).toLocaleString('ru-RU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          {dueDateFormatted && !isPaid && (
            <span
              className={`text-xs font-medium ${
                isOverdue ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              До {dueDateFormatted}
            </span>
          )}
          {paidDate && (
            <span className="text-xs text-muted-foreground">
              Оплачено {paidDate}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          {/* Toggle paid — primary quick action, always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title={
              isPaid ? 'Отметить как неоплаченное' : 'Отметить как оплаченное'
            }
            onClick={async () => {
              try {
                await togglePaid({
                  data: { id: item.id, type: item.type, paid: !isPaid },
                })
                await router.invalidate()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
              }
            }}
          >
            {isPaid ? (
              <CheckCircle2 className="size-4 text-green-600" />
            ) : (
              <Circle className="size-4 text-muted-foreground" />
            )}
          </Button>

          {/* 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" />
                Редактировать
              </DropdownMenuItem>
              {isPaid && <DropdownMenuSeparator />}
              {isPaid &&
                (item.archivedAt ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await archiveExpense({
                          data: { id: item.id, archive: false },
                        })
                        await router.invalidate()
                        toast.success('Расход разархивирован')
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : 'Произошла ошибка',
                        )
                      }
                    }}
                  >
                    <ArchiveRestore className="size-3.5" />
                    Разархивировать
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                    <Archive className="size-3.5" />
                    Архивировать
                  </DropdownMenuItem>
                ))}
              {!isPaid && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Удалить
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Controlled dialogs — no visible trigger of their own */}
          <EditExpense
            item={item}
            categories={categories}
            accounts={accounts}
            counterparties={counterparties}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          {!isPaid && (
            <DeleteExpense
              expenseId={item.id}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
            />
          )}
          <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Архивировать расход?</AlertDialogTitle>
                <AlertDialogDescription>
                  Запись будет перемещена в архив.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await archiveExpense({
                        data: { id: item.id, archive: true },
                      })
                      await router.invalidate()
                      toast.success('Расход архивирован')
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : 'Произошла ошибка',
                      )
                    }
                  }}
                >
                  Архивировать
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </ItemContent>
    </Item>
  )
}
