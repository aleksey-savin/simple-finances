import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckCircle2,
  Copy,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import type { Invoice } from '#/types'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Item, ItemContent } from '../ui/item'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

function formatDate(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  if (isSameYear(date, new Date())) return format(date, 'd MMM', { locale: ru })
  return format(date, 'd MMM yyyy', { locale: ru })
}

type DialogRenderProp = (
  open: boolean,
  onOpenChange: (open: boolean) => void,
) => ReactNode

type InvoiceListItemProps = {
  item: Invoice
  sharedAccountIds: Set<string>
  togglePaid: any
  renderEdit: DialogRenderProp
  renderDelete?: DialogRenderProp
  archiveFn: (args: { data: { id: string; archive: boolean } }) => Promise<void>
  duplicateFn: () => Promise<unknown>
  canEditDelete?: boolean
}

export function InvoiceListItem({
  item,
  sharedAccountIds,
  togglePaid,
  renderEdit,
  renderDelete,
  archiveFn,
  duplicateFn,
  canEditDelete = true,
}: InvoiceListItemProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const isPayable = item.kind === 'payable'
  const isLinkedReceivable = !isPayable && !!item.linkedInvoiceId
  const isPaid = item.paidAt !== null
  const isArchived = item.archivedAt !== null
  const isOverdue =
    !isPaid && item.dueDate !== null && new Date(item.dueDate) < new Date()

  const createdDate = formatDate(new Date(item.createdAt))
  const paidDate = isPaid ? formatDate(new Date(item.paidAt!)) : null
  const dueDateFormatted = item.dueDate
    ? formatDate(new Date(item.dueDate))
    : null

  const cfg = isPayable
    ? {
        amountPrefix: '−',
        amountColor: isPaid ? 'text-amber-600' : 'text-muted-foreground',
        paidLabel: 'Оплачено',
        entityName: 'Расход',
      }
    : {
        amountPrefix: '+',
        amountColor: isPaid ? 'text-emerald-700' : 'text-muted-foreground',
        paidLabel: 'Получено',
        entityName: 'Доход',
      }

  const amountFormatted = Number(item.amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

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
                data: { id: item.id, kind: item.kind, paid: !isPaid },
              })
              await router.invalidate()
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Произошла ошибка',
              )
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
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await duplicateFn()
                  await router.invalidate()
                  toast.success(`${cfg.entityName} скопирован`)
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Произошла ошибка',
                  )
                }
              }}
            >
              <Copy className="size-3.5" />
              Копировать
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
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Произошла ошибка',
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
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="px-1.5 py-0 text-xs">
        {item.category.name}
      </Badge>
      <Badge variant="outline" className="px-1.5 py-0 text-xs">
        {item.currentAccount.name}
      </Badge>

      {isArchived && (
        <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-xs">
          <Archive className="size-3" />В архиве
        </Badge>
      )}

      {isLinkedReceivable ? (
        <Badge
          variant="secondary"
          className="gap-1 px-1.5 py-0 text-xs text-muted-foreground"
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
      <ItemContent className="relative gap-0">
        {canEditDelete && renderEdit(editOpen, setEditOpen)}
        {canEditDelete && !isPaid && renderDelete?.(deleteOpen, setDeleteOpen)}
        <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Архивировать {isPayable ? 'расход' : 'доход'}?
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
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Произошла ошибка',
                    )
                  }
                }}
              >
                Архивировать
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3 shrink-0" />
              {createdDate}
            </span>
            {menuDropdown}
          </div>

          {item.counterparty && (
            <p
              className={`text-base font-bold leading-snug ${
                !isPaid ? 'text-muted-foreground' : ''
              }`}
            >
              {item.counterparty.name}
            </p>
          )}

          <p
            className={`whitespace-normal text-sm ${
              !isPaid ? 'text-muted-foreground' : ''
            }`}
          >
            {item.description}
          </p>

          {badgesRow}

          <div className="flex items-center justify-end pt-1">
            <div className="flex flex-col items-end gap-0.5">
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

        <div className="hidden items-center gap-3 sm:flex">
          <span className="flex w-16 shrink-0 items-center gap-1 pt-0.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3 shrink-0" />
            {createdDate}
          </span>

          <div className="min-w-0 flex-1">
            {item.counterparty && (
              <div
                className={`wrap-break-word font-semibold leading-snug ${
                  !isPaid ? 'text-muted-foreground' : ''
                }`}
              >
                {item.counterparty.name}
              </div>
            )}
            <div
              className={`wrap-break-word whitespace-normal text-sm ${
                !isPaid ? 'text-muted-foreground' : ''
              }`}
            >
              {item.description}
            </div>
            <div className="mt-1.5">{badgesRow}</div>
          </div>

          <div className="flex shrink-0 items-start gap-0.5">
            <div className="mr-1 flex flex-col items-end gap-0.5">
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
          </div>
        </div>
      </ItemContent>
    </Item>
  )
}
