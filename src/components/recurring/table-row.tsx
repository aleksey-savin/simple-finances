import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Calendar,
  Clock,
  MoreHorizontal,
  PenLine,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import type { RuleWithRelations } from '@/types'
import { deleteRecurringRule } from './actions'
import {
  formatRuleAmount,
  formatRuleDate,
  getCronLabel,
  pluralDays,
} from './utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { TableCell, TableRow } from '@/components/ui/table'

export function RuleTableRow({
  rule,
  onEdit,
  onCreateNow,
  onToggle,
}: {
  rule: RuleWithRelations
  onEdit: () => void
  onCreateNow: () => Promise<void>
  onToggle: (value: boolean) => void
}) {
  const router = useRouter()
  const isExpense = rule.type === 'payable'
  const [createNowOpen, setCreateNowOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteRecurringRule({ data: { id: rule.id } })
      await router.invalidate()
      toast.success('Правило удалено')
      setDeleteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isExpense ? 'destructive' : 'default'}>
              {isExpense ? 'Расход' : 'Доход'}
            </Badge>
            <span className="truncate font-medium">{rule.description}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs font-normal">
              {rule.currentAccount.name}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {rule.category.name}
            </Badge>
            {rule.counterparty && (
              <Badge variant="outline" className="text-xs font-normal">
                {rule.counterparty.name}
              </Badge>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-start gap-1.5">
            <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>{getCronLabel(rule.cronExpression)}</span>
          </div>
          {rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0 ? (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <Calendar className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Срок оплаты: {rule.dueDaysFromCreation}{' '}
                {pluralDays(rule.dueDaysFromCreation)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Без срока оплаты</span>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="grid gap-1 text-xs text-muted-foreground">
          <div>
            <span className="opacity-70">Последний запуск:</span>{' '}
            {formatRuleDate(rule.lastRunAt)}
          </div>
          <div>
            <span className="opacity-70">Следующий запуск:</span>{' '}
            {rule.isActive ? formatRuleDate(rule.nextRunAt) : 'Приостановлено'}
          </div>
        </div>
      </TableCell>

      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-2">
          <Switch
            checked={rule.isActive}
            onCheckedChange={onToggle}
            aria-label="Активность правила"
          />
        </div>
      </TableCell>

      <TableCell className="font-semibold text-center">
        {formatRuleAmount(rule.amount)} ₽
      </TableCell>

      <TableCell>
        <div className="flex justify-end">
          <AlertDialog open={createNowOpen} onOpenChange={setCreateNowOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Создать {isExpense ? 'расход' : 'доход'} сейчас?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Будет создана новая запись по правилу «{rule.description}».
                  Расписание и следующий запуск правила не изменятся.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await onCreateNow()
                    setCreateNowOpen(false)
                  }}
                >
                  Создать
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить правило?</AlertDialogTitle>
                <AlertDialogDescription>
                  Правило «{rule.description}» будет удалено безвозвратно. Уже
                  созданные записи останутся.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateNowOpen(true)}>
                <Plus className="size-3.5" />
                Создать сейчас
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <PenLine className="size-3.5" />
                Изменить
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
