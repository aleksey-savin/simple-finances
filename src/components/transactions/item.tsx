import { format, isToday, isYesterday, isSameYear } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Archive,
  ArchiveRestore,
  ArrowDownCircle,
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
import type { ReactNode } from 'react'

import { Item, ItemContent } from '../ui/item'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
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
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import type { Expense, Income } from '#/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  if (isSameYear(date, new Date())) return format(date, 'd MMM', { locale: ru })
  return format(date, 'd MMM yyyy', { locale: ru })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogRenderProp = (
  open: boolean,
  onOpenChange: (open: boolean) => void,
) => ReactNode

type TransactionItemProps = {
  item: Expense | Income
  sharedAccountIds: Set<string>
  togglePaid: any
  /** Render the type-specific edit dialog. Receives open state + setter. */
  renderEdit: DialogRenderProp
  /** Render the type-specific delete dialog. Receives open state + setter. */
  renderDelete?: DialogRenderProp
  /** Archive server function for this transaction type. */
  archiveFn: (args: { data: { id: string; archive: boolean } }) => Promise<void>
  /**
   * Whether the current user is allowed to edit/delete this item.
   * Defaults to `true` (expenses are always editable by the owner;
   * income from a shared account may restrict editing to the creator).
   */
  canEditDelete?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionItem({
  item,
  sharedAccountIds,
  togglePaid,
  renderEdit,
  renderDelete,
  archiveFn,
  canEditDelete = true,
}: TransactionItemProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const isExpense = item.type === 'expense'
  const isLinkedIncome =
    !isExpense &&
    'linkedExpenseId' in item &&
    !!(item as Income).linkedExpenseId

  const isPaid = item.paidAt !== null
  const isArchived = item.archivedAt !== null
  const isOverdue =
    !isPaid && item.dueDate !== null && new Date(item.dueDate) < new Date()

  const createdDate = formatDate(new Date(item.createdAt))
  const paidDate = isPaid ? formatDate(new Date(item.paidAt!)) : null
  const dueDateFormatted = item.dueDate
    ? formatDate(new Date(item.dueDate))
    : null

  // ─── Visual config per type ──────────────────────────────────────────────

  const cfg = isExpense
    ? {
        Icon: ArrowDownCircle,
        iconBg: isPaid ? 'bg-destructive/10' : 'bg-muted/50',
        iconColor: isPaid ? 'text-destructive' : 'text-muted-foreground',
        amountPrefix: '−',
        amountColor: isPaid ? 'text-destructive' : 'text-muted-foreground',
        paidLabel: 'Оплачено',
        toggleTitle: isPaid
          ? 'Отметить как неоплаченное'
          : 'Отметить как оплаченное',
        toggleIconColor: 'text-green-600',
        entityName: 'Расход',
      }
    : {
        Icon: ArrowUpCircle,
        iconBg: isPaid ? 'bg-emerald-500/10' : 'bg-muted/50',
        iconColor: isPaid
          ? 'text-emerald-700 dark:text-emerald-500'
          : 'text-muted-foreground',
        amountPrefix: '+',
        amountColor: isPaid
          ? 'text-emerald-700 dark:text-emerald-500'
          : 'text-muted-foreground',
        paidLabel: 'Получено',
        toggleTitle: isPaid
          ? 'Отметить как неполученное'
          : 'Отметить как полученное',
        toggleIconColor: 'text-emerald-600',
        entityName: 'Доход',
      }

  const { Icon } = cfg

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Item
      variant={isPaid ? 'outline' : 'muted'}
      className={[
        isOverdue ? 'border-destructive/30 bg-destructive/5' : '',
        isArchived ? 'opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ItemContent className="gap-0">
        <div className="flex items-start sm:items-center gap-3">
          {/* ── Date column — desktop only ─────────────────────────────── */}
          <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16 pt-0.5">
            <CalendarDays className="size-3 shrink-0" />
            {createdDate}
          </span>

          {/* ── Middle: counterparty + description + meta ──────────────── */}
          <div className="flex-1 min-w-0">
            {item.counterparty && (
              <div
                className={`font-semibold leading-snug wrap-break-word ${
                  !isPaid ? 'text-muted-foreground' : ''
                }`}
              >
                {item.counterparty.name}
              </div>
            )}
            <div
              className={`text-sm wrap-break-word whitespace-normal ${
                !isPaid ? 'text-muted-foreground' : ''
              }`}
            >
              {item.description}
            </div>

            {/* Meta row: date (mobile only) + badges */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <span className="flex sm:hidden items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="size-3 shrink-0" />
                {createdDate}
              </span>

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

          {/* ── Right: amount + dates + actions ───────────────────────── */}
          <div className="flex flex-col sm:flex-row items-end gap-4">
            {/* Amount + paid/due dates */}
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-base font-semibold tabular-nums ${cfg.amountColor}`}
              >
                {cfg.amountPrefix}
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
                  {cfg.paidLabel} {paidDate}
                </span>
              )}
            </div>

            <div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title={cfg.toggleTitle}
                onClick={async () => {
                  try {
                    await togglePaid({
                      data: { id: item.id, type: item.type, paid: !isPaid },
                    })
                    await router.invalidate()
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : 'Произошла ошибка',
                    )
                  }
                }}
              >
                {isPaid ? (
                  <CheckCircle2 className={`size-4 ${cfg.toggleIconColor}`} />
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
                  {canEditDelete ? (
                    <>
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="size-3.5" />
                        Редактировать
                      </DropdownMenuItem>

                      {isPaid && (
                        <>
                          <DropdownMenuSeparator />
                          {item.archivedAt ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await archiveFn({
                                    data: { id: item.id, archive: false },
                                  })
                                  await router.invalidate()
                                  toast.success(
                                    `${cfg.entityName} разархивирован`,
                                  )
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error
                                      ? e.message
                                      : 'Произошла ошибка',
                                  )
                                }
                              }}
                            >
                              <ArchiveRestore className="size-3.5" />
                              Разархивировать
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setArchiveOpen(true)}
                            >
                              <Archive className="size-3.5" />
                              Архивировать
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

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
                    </>
                  ) : (
                    <DropdownMenuItem disabled>
                      <Link2 className="size-3.5" />
                      Только просмотр
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Toggle paid/received */}

            {/* Portaled dialogs — rendered here so they're always mounted */}
            {canEditDelete && renderEdit(editOpen, setEditOpen)}
            {canEditDelete &&
              !isPaid &&
              renderDelete?.(deleteOpen, setDeleteOpen)}

            {/* Archive confirmation */}
            <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Архивировать {isExpense ? 'расход' : 'доход'}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Запись будет перемещена в архив.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await archiveFn({
                          data: { id: item.id, archive: true },
                        })
                        await router.invalidate()
                        toast.success(`${cfg.entityName} архивирован`)
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
        </div>
      </ItemContent>
    </Item>
  )
}
