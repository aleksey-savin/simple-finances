import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Clock,
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
import { TableCell, TableRow } from '../ui/table'
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
import { cn } from '#/lib/utils'
import { TagChips, TagPicker, type TagItem } from '../ui/tag-picker'

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
  layout: 'mobile' | 'desktop'
  sharedAccountIds: Set<string>
  togglePaid: any
  renderEdit: DialogRenderProp
  renderDelete?: DialogRenderProp
  archiveFn: (args: { data: { id: string; archive: boolean } }) => Promise<void>
  duplicateFn: () => Promise<unknown>
  canEditDelete?: boolean
  assignedTags?: TagItem[]
  allTags?: TagItem[]
  onTagAdd?: (tag: TagItem) => Promise<void>
  onTagRemove?: (tag: TagItem) => Promise<void>
  onTagCreate?: (name: string, color: string) => Promise<TagItem>
}

export function InvoiceListItem({
  item,
  layout,
  sharedAccountIds,
  togglePaid,
  renderEdit,
  renderDelete,
  archiveFn,
  duplicateFn,
  canEditDelete = true,
  assignedTags = [],
  allTags = [],
  onTagAdd,
  onTagRemove,
  onTagCreate,
}: InvoiceListItemProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const isPayable = item.kind === 'payable'
  const isLinkedReceivable = !isPayable && !!item.linkedInvoiceId
  const isPaid = item.paymentStatus === 'paid'
  const isPartial = item.paymentStatus === 'partial'
  const isArchived = item.archivedAt !== null
  const isOverdue =
    !isPaid && item.dueDate !== null && new Date(item.dueDate) < new Date()

  const paidDate = isPaid ? formatDate(new Date(item.paidAt!)) : null
  const dueDateFormatted = item.dueDate
    ? formatDate(new Date(item.dueDate))
    : null
  const dueDateLabel = dueDateFormatted
    ? `Ожидает оплаты до ${dueDateFormatted}`
    : 'Ожидает оплаты'
  const amountFormatted = Number(item.amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const cfg = isPayable
    ? {
        amountPrefix: '−',
        amountColor: '',
        status: isPaid ? (
          <div className="flex gap-1 justify-center items-center text-sm font-semibold text-emerald-500">
            <CheckCircle2 className="w-4 h-4 inline-block" />{' '}
            {`Оплачено ${paidDate}`}
          </div>
        ) : isPartial ? (
          <div className="flex gap-1 justify-center items-center text-sm font-semibold text-amber-500">
            <Clock className="w-4 h-4 inline-block" />{' '}
            {`Частично оплачено ${Number(item.settledAmount).toLocaleString(
              'ru-RU',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )} из ${amountFormatted}`}
          </div>
        ) : (
          <div className="flex gap-1 justify-center items-center text-sm font-semibold text-amber-500">
            <Clock className="w-4 h-4 inline-block" />{' '}
            {dueDateLabel ?? 'Ожидает оплаты'}
          </div>
        ),
        entityName: 'Расход',
      }
    : {
        amountPrefix: '+',
        amountColor: 'text-emerald-600',
        status: isPaid ? (
          <div className="flex gap-1 justify-center items-center text-sm font-semibold text-emerald-500">
            <CheckCircle2 className="w-4 h-4 inline-block" />{' '}
            {`Оплачено ${paidDate}`}
          </div>
        ) : isPartial ? (
          <div className="flex gap-1 justify-center items-center text-sm font-semibold text-amber-500">
            <Clock className="w-4 h-4 inline-block" />{' '}
            {`Частично оплачено ${Number(item.settledAmount).toLocaleString(
              'ru-RU',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )} из ${amountFormatted}`}
          </div>
        ) : (
          <div className="flex gap-1 justify-center items-center text-sm font-semibold text-amber-500">
            <Clock className="w-4 h-4 inline-block" />{' '}
            {dueDateLabel ?? 'Ожидает оплаты'}
          </div>
        ),
        entityName: 'Доход',
      }
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

  const tagPicker =
    onTagAdd && onTagRemove && onTagCreate ? (
      <TagPicker
        assignedTags={assignedTags}
        allTags={allTags}
        onAdd={onTagAdd}
        onRemove={onTagRemove}
        onCreate={onTagCreate}
      />
    ) : null

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

  const dialogs = (
    <>
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
                    error instanceof Error ? error.message : 'Произошла ошибка',
                  )
                }
              }}
            >
              Архивировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  if (layout === 'desktop') {
    return (
      <>
        {dialogs}
        <TableRow className={cn(isOverdue && 'bg-destructive/10')}>
          <TableCell className="max-w-0 align-top whitespace-normal">
            <div className="py-4">
              {item.counterparty && (
                <div
                  className={cn(
                    'wrap-break-word font-semibold leading-snug',
                    !isPaid && 'text-muted-foreground',
                  )}
                >
                  {item.counterparty.name}
                </div>
              )}
              <div
                className={cn(
                  'wrap-break-word text-sm',
                  !isPaid && 'text-muted-foreground',
                )}
              >
                {item.description}
              </div>
              <TagChips tags={assignedTags} />
            </div>
          </TableCell>
          <TableCell
            className={cn('text-center', !isPaid && 'text-muted-foreground')}
          >
            {item.currentAccount.name}
          </TableCell>
          <TableCell
            className={cn('text-center', !isPaid && 'text-muted-foreground')}
          >
            {item.category.name}
          </TableCell>
          <TableCell className="w-56 text-center">
            <div className="flex flex-col gap-2">
              {cfg.status}
              {item.archivedAt && (
                <div className="flex gap-1 items-center justify-center text-sm font-semibold text-muted-foreground">
                  <Archive className="w-4 h-4 inline-block" /> В архиве
                </div>
              )}
            </div>
          </TableCell>
          <TableCell className="w-40 text-right">
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={cn(
                  'text-base font-semibold tabular-nums',
                  cfg.amountColor,
                  !isPaid && 'text-muted-foreground',
                )}
              >
                {cfg.amountPrefix}
                {amountFormatted}
              </span>
            </div>
          </TableCell>
          <TableCell className="w-14  text-right">
            <div className="flex justify-end gap-1">
              {tagPicker}
              {menuDropdown}
            </div>
          </TableCell>
        </TableRow>
      </>
    )
  }

  return (
    <>
      {dialogs}
      <Item variant="outline" className="sm:hidden">
        <ItemContent className="relative gap-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDate(new Date(item.createdAt))}
              </span>
              <div className="flex items-center gap-1">
                {tagPicker}
                {menuDropdown}
              </div>
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
            <TagChips tags={assignedTags} />

            <div className="flex items-center justify-end pt-1">
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className={`text-2xl font-bold tabular-nums ${cfg.amountColor}`}
                >
                  {cfg.amountPrefix}
                  {amountFormatted}
                </span>
                {dueDateLabel && !isPaid && (
                  <span
                    className={cn(
                      'text-xs',
                      isOverdue
                        ? 'font-medium text-destructive'
                        : 'text-muted-foreground',
                    )}
                  >
                    {dueDateLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ItemContent>
      </Item>
    </>
  )
}
