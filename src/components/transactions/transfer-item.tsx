import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ArrowRight,
  ArrowRightLeft,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { deleteAccountTransfer } from '#/components/transactions/actions'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Item, ItemContent } from '#/components/ui/item'
import { TableCell, TableRow } from '#/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'
import type { AccountTransfer } from '#/types'

function formatDate(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  if (isSameYear(date, new Date())) return format(date, 'd MMM', { locale: ru })
  return format(date, 'd MMM yyyy', { locale: ru })
}

function formatAmount(value: string | number) {
  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function TransferItem({
  item,
  layout,
  sharedAccountIds,
}: {
  item: AccountTransfer
  layout: 'mobile' | 'desktop'
  sharedAccountIds: Set<string>
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const transferredDate = formatDate(new Date(item.transferredAt))
  const isPaid = item.paidAt !== null
  const amountFormatted = formatAmount(item.amount)
  const showAuthor =
    sharedAccountIds.has(item.fromAccount.id) ||
    sharedAccountIds.has(item.toAccount.id)

  const deleteDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить перевод?</AlertDialogTitle>
          <AlertDialogDescription>
            Балансы счетов будут пересчитаны обратно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              try {
                await deleteAccountTransfer({ data: { id: item.id } })
                await router.invalidate()
                toast.success('Перевод удалён')
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : 'Произошла ошибка',
                )
              }
            }}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const menu = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const accountRoute = (
    <div className="flex min-w-0 items-center justify-center gap-2 text-sm">
      <span className="truncate">{item.fromAccount.name}</span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{item.toAccount.name}</span>
    </div>
  )

  if (layout === 'desktop') {
    return (
      <>
        {deleteDialog}
        <TableRow>
          <TableCell className="max-w-0 align-top whitespace-normal">
            <div className="py-4">
              <div className="flex items-center gap-2 font-semibold leading-snug">
                <ArrowRightLeft className="size-4 text-muted-foreground" />
                Перевод между счетами
              </div>
              <div className="wrap-break-word text-sm text-muted-foreground">
                {item.description}
              </div>
              {showAuthor ? (
                <span className="text-xs text-muted-foreground">
                  {item.createdByUser.name}
                </span>
              ) : null}
            </div>
          </TableCell>
          <TableCell className="text-center">{accountRoute}</TableCell>
          <TableCell className="text-center text-muted-foreground">
            Перевод
          </TableCell>
          <TableCell className="w-56 text-center">
            <div
              className={cn(
                'flex items-center justify-center gap-1 text-sm font-semibold',
                isPaid ? 'text-success' : 'text-muted-foreground',
              )}
            >
              <ArrowRightLeft className="size-4" />
              {isPaid ? `Выполнен ${transferredDate}` : 'Не оплачен'}
            </div>
          </TableCell>
          <TableCell className="w-40 text-right">
            <span className="text-base font-semibold tabular-nums">
              {amountFormatted}
            </span>
          </TableCell>
          <TableCell className="w-14 text-right">
            <div className="flex justify-end">{menu}</div>
          </TableCell>
        </TableRow>
      </>
    )
  }

  return (
    <>
      {deleteDialog}
      <Item variant="outline" className="sm:hidden">
        <ItemContent className="relative gap-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {transferredDate}
              </span>
              {menu}
            </div>

            <div className="flex items-center gap-2 text-base font-bold leading-snug">
              <ArrowRightLeft className="size-4 text-muted-foreground" />
              Перевод между счетами
            </div>

            <p className="whitespace-normal text-sm text-muted-foreground">
              {item.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={isPaid ? 'success' : 'secondary'}
                className="px-1.5 py-0 text-xs"
              >
                {isPaid ? 'Оплачено' : 'Не оплачено'}
              </Badge>
              <Badge variant="outline" className="px-1.5 py-0 text-xs">
                {item.fromAccount.name}
              </Badge>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <Badge variant="outline" className="px-1.5 py-0 text-xs">
                {item.toAccount.name}
              </Badge>
              {showAuthor ? (
                <span className="text-xs text-muted-foreground">
                  {item.createdByUser.name}
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-end pt-1">
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums text-foreground',
                )}
              >
                {amountFormatted}
              </span>
            </div>
          </div>
        </ItemContent>
      </Item>
    </>
  )
}
