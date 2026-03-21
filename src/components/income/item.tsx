import { format, isToday, isYesterday, isSameYear } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Archive,
  ArchiveRestore,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { authClient } from 'utils/auth-client'

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
import { DeleteIncome } from './delete'
import { EditIncome } from './edit'
import { archiveIncome } from './actions'
import { useRouter } from '@tanstack/react-router'
import type { Income } from '#/types'
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

export const IncomeItem = ({
  item,
  sharedAccountIds,
  togglePaid,
  categories,
  accounts,
  counterparties = [],
}: {
  item: Income
  sharedAccountIds: Set<string>
  togglePaid: any
  categories: { id: string; name: string; useForIncome: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
}) => {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const isLinkedIncome = !!item.linkedExpenseId
  const canEditDelete = item.createdBy === session?.user?.id

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
            isPaid ? 'bg-emerald-500/10' : 'bg-muted/50'
          }`}
        >
          <ArrowUpCircle
            className={`size-5 ${isPaid ? 'text-emerald-700 dark:text-emerald-500' : 'text-muted-foreground'}`}
          />
        </div>

        {/* Write area — 3 columns */}
        <div className="flex flex-1 items-center gap-4 min-w-0">
          {/* Col 1: Date */}
          <div className="w-20 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3 shrink-0" />
              {createdDate}
            </span>
          </div>

          {/* Col 2: Counterparty */}
          <div className="w-32 shrink-0">
            {item.counterparty ? (
              <span className="text-sm truncate block">
                {item.counterparty.name}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/40">—</span>
            )}
          </div>

          {/* Col 3: Description + badges */}
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <ItemTitle
              className={`flex flex-wrap text-lg font-semibold truncate ${!isPaid ? 'text-muted-foreground' : ''}`}
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
              {isLinkedIncome ? (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 gap-1 text-muted-foreground"
                >
                  <Link2 className="size-3" />
                  {item.createdByUser
                    ? `Создан автоматически · ${item.createdByUser.name}`
                    : 'Создан автоматически'}
                </Badge>
              ) : (
                sharedAccountIds.has(item.currentAccount.id) &&
                item.createdByUser && (
                  <span className="text-xs text-muted-foreground">
                    {item.createdByUser.name}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Amount + dates */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span
            className={`text-base font-semibold tabular-nums ${
              isPaid
                ? 'text-emerald-700 dark:text-emerald-500'
                : 'text-muted-foreground'
            }`}
          >
            +
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
              Получено {paidDate}
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
              isPaid ? 'Отметить как неполученное' : 'Отметить как полученное'
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
              <CheckCircle2 className="size-4 text-emerald-600" />
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
              {canEditDelete && (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" />
                  Редактировать
                </DropdownMenuItem>
              )}
              {canEditDelete && isPaid && (
                <>
                  <DropdownMenuSeparator />
                  {item.archivedAt ? (
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          await archiveIncome({
                            data: { id: item.id, archive: false },
                          })
                          await router.invalidate()
                          toast.success('Доход разархивирован')
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
                  )}
                </>
              )}
              {canEditDelete && !isPaid && (
                <>
                  {canEditDelete && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Удалить
                  </DropdownMenuItem>
                </>
              )}
              {!canEditDelete && (
                <DropdownMenuItem disabled>
                  <Link2 className="size-3.5" />
                  Только просмотр
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Controlled dialogs — no visible trigger of their own */}
          <EditIncome
            item={item}
            categories={categories}
            accounts={accounts}
            counterparties={counterparties}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          {canEditDelete && !isPaid && (
            <DeleteIncome
              incomeId={item.id}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
            />
          )}
          <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Архивировать доход?</AlertDialogTitle>
                <AlertDialogDescription>
                  Запись будет перемещена в архив.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await archiveIncome({
                        data: { id: item.id, archive: true },
                      })
                      await router.invalidate()
                      toast.success('Доход архивирован')
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
