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
  XCircle,
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
        amountPrefix: '−',
        amountColor: isPaid ? 'text-amber-600' : 'text-muted-foreground',
        paidLabel: 'Оплачено',
        toggleTitle: isPaid
          ? 'Отметить как неоплаченное'
          : 'Отметить как оплаченное',
        toggleIconColor: 'text-green-600',
        entityName: 'Расход',
      }
    : {
        amountPrefix: '+',
        amountColor: isPaid ? 'text-emerald-700' : 'text-muted-foreground',
        paidLabel: 'Получено',
        toggleTitle: isPaid
          ? 'Отметить как неполученное'
          : 'Отметить как полученное',
        toggleIconColor: 'text-emerald-600',
        entityName: 'Доход',
      }

  const amountFormatted = Number(item.amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // ─── Shared fragments ─────────────────────────────────────────────────────

  const menuDropdown = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
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
          {!isPaid ? (
            <>
              <CheckCircle2 className="size-3.5" /> Оплачено
            </>
          ) : (
            <>
              <XCircle className="size-3.5" /> Неоплачено
            </>
          )}
        </DropdownMenuItem>
        {canEditDelete ? (
          <>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <DropdownMenuSeparator />
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
                        toast.success(`${cfg.entityName} разархивирован`)
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
  )

  const badgesRow = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className="text-xs px-1.5 py-0">
        {item.category.name}
      </Badge>
      <Badge variant="outline" className="text-xs px-1.5 py-0">
        {item.currentAccount.name}
      </Badge>

      {isArchived && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 gap-1 ">
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
  )

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Item
      variant={isPaid ? 'outline' : 'muted'}
      className={[
        isOverdue ? 'border-destructive/30 bg-destructive/5' : '',
        isArchived ? 'opacity-60' : '',
        !isPaid ? 'border border-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ItemContent className="gap-0 relative">
        {/* ── Portaled dialogs — rendered once ─────────────────────────── */}
        {canEditDelete && renderEdit(editOpen, setEditOpen)}
        {canEditDelete && !isPaid && renderDelete?.(deleteOpen, setDeleteOpen)}
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
                    await archiveFn({ data: { id: item.id, archive: true } })
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

        {/* ── Actions — rendered once, absolute on mobile / inline on desktop ── */}

        {/* ── Mobile card layout ───────────────────────────────────────── */}

        <div className="flex sm:hidden flex-col gap-2">
          {/* Row 1: date */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3 shrink-0" />
              {createdDate}
            </span>
            {menuDropdown}
          </div>

          {/* Counterparty */}
          {item.counterparty && (
            <p
              className={`font-bold text-base leading-snug ${
                !isPaid ? 'text-muted-foreground' : ''
              }`}
            >
              {item.counterparty.name}
            </p>
          )}

          {/* Description */}
          <p
            className={`text-sm whitespace-normal ${
              !isPaid ? 'text-muted-foreground' : ''
            }`}
          >
            {item.description}
          </p>

          {/* Badges */}
          {badgesRow}

          {/* Amount */}
          <div className="flex items-center justify-end pt-1">
            <div className="flex flex-col gap-0.5 items-end">
              <span
                className={`text-2xl font-bold tabular-nums ${cfg.amountColor}`}
              >
                {cfg.amountPrefix}
                {amountFormatted}
              </span>
              {paidDate && (
                <span className="text-xs text-muted-foreground">
                  {cfg.paidLabel} {paidDate}
                </span>
              )}
              {dueDateFormatted && !isPaid && (
                <span
                  className={`text-xs font-medium ${
                    isOverdue ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  До {dueDateFormatted}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop row layout ───────────────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Date column */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16 pt-0.5">
            <CalendarDays className="size-3 shrink-0" />
            {createdDate}
          </span>
          {/* Content: counterparty + description + badges */}
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
            <div className="mt-1.5">{badgesRow}</div>
          </div>

          {/* Right: amount + actions */}
          <div className="flex items-start gap-0.5 shrink-0">
            <div className="flex flex-col items-end gap-0.5 mr-1">
              <span
                className={`text-base font-semibold tabular-nums ${cfg.amountColor}`}
              >
                {cfg.amountPrefix}
                {amountFormatted}
              </span>
              {dueDateFormatted && !isPaid && (
                <span
                  className={`text-xs font-medium ${
                    isOverdue ? 'text-warning' : 'text-muted-foreground'
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
            {menuDropdown}
            {/* ↑ desktop only instance — the mobile one is absolutely positioned above */}
          </div>
        </div>
      </ItemContent>
    </Item>
  )
}
