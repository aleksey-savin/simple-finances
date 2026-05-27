import { useState } from 'react'
import type { RuleWithRelations } from '@/types'
import { DeleteRule } from './delete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Item, ItemContent, ItemFooter, ItemHeader } from '@/components/ui/item'
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
import {
  Calendar,
  Clock,
  FileText,
  PenLine,
  Plus,
  SkipForward,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import {
  formatRuleAmount,
  formatRuleDate,
  getCronLabel,
  pluralDays,
} from './utils'

export const RuleCard = ({
  rule,
  onEdit,
  onCreateNow,
  onSkipNext,
  onToggle,
}: {
  rule: RuleWithRelations
  onEdit: () => void
  onCreateNow: (skipNext: boolean) => Promise<void>
  onSkipNext: () => Promise<void>
  onToggle: (v: boolean) => void
}) => {
  const isExpense = rule.type === 'payable'
  const [createNowOpen, setCreateNowOpen] = useState(false)
  const [skipNext, setSkipNext] = useState(false)
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const canSkip = rule.isActive && Boolean(rule.nextRunAt)

  return (
    <Item variant="outline" className="px-4">
      <ItemHeader className="flex flex-col gap-2">
        <div className="flex w-full justify-between items-center">
          <Badge
            variant={isExpense ? 'destructive' : 'default'}
            className="shrink-0"
          >
            {isExpense ? 'Расход' : 'Доход'}
          </Badge>
          <Switch
            checked={rule.isActive}
            onCheckedChange={onToggle}
            aria-label="Активность правила"
          />
        </div>
        <div className="font-medium wrap-break-word">{rule.description}</div>
      </ItemHeader>
      <Separator />
      <ItemContent className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-2">
          {/* Category & account */}
          <div className="flex flex-wrap gap-1 text-xs">
            <Badge>{rule.category.name}</Badge>
            <Badge>{rule.currentAccount.name}</Badge>
            {rule.counterparty?.name && <Badge>{rule.counterparty.name}</Badge>}
            {rule.contract ? (
              <Badge
                variant="outline"
                className="gap-1 font-normal text-green-600 border-green-300"
              >
                <FileText className="size-3 shrink-0" />
                Договор
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 font-normal text-muted-foreground"
              >
                <FileText className="size-3 shrink-0" />
                Без договора
              </Badge>
            )}
          </div>

          {/* Schedule */}
          <div className="flex items-start text-sm gap-1.5">
            <Clock className="size-3.5 mt-0.5 shrink-0" />
            <span>{getCronLabel(rule.cronExpression)}</span>
          </div>

          {/* Due days */}
          {rule.dueDaysFromCreation && rule.dueDaysFromCreation > 0 ? (
            <div className="flex items-center text-sm gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              <span>
                Срок оплаты: {rule.dueDaysFromCreation}{' '}
                {pluralDays(rule.dueDaysFromCreation)} от создания
              </span>
            </div>
          ) : null}

          {/* Last / next run */}
          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="opacity-60">Последний запуск:</span>
            <span>{formatRuleDate(rule.lastRunAt)}</span>
            <span className="opacity-60">Следующий запуск:</span>
            <span
              className={!rule.isActive ? 'line-through opacity-40' : undefined}
            >
              {rule.isActive
                ? formatRuleDate(rule.nextRunAt)
                : 'Приостановлено'}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-xl font-semibold tabular-nums shrink-0">
          {formatRuleAmount(rule.amount)} ₽
        </div>
      </ItemContent>

      <Separator />

      <ItemFooter className="flex justify-end items-center">
        <AlertDialog
          open={createNowOpen}
          onOpenChange={(open) => {
            setCreateNowOpen(open)
            if (!open) setSkipNext(false)
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setCreateNowOpen(true)}
          >
            <Plus className="size-3.5" />
            Создать сейчас
          </Button>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Создать {isExpense ? 'расход' : 'доход'} сейчас?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Будет создана новая запись по правилу «{rule.description}».
                Расписание не изменится.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Пропустить следующий запуск</span>
                <span className="text-xs text-muted-foreground">
                  {canSkip
                    ? 'Cron не создаст дубль по расписанию'
                    : 'Недоступно для приостановленных правил'}
                </span>
              </span>
              <Switch
                checked={skipNext}
                onCheckedChange={setSkipNext}
                disabled={!canSkip}
                aria-label="Пропустить следующий запуск"
              />
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await onCreateNow(skipNext)
                  setCreateNowOpen(false)
                }}
              >
                Создать
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {canSkip && (
          <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setSkipDialogOpen(true)}
            >
              <SkipForward className="size-3.5" />
              Пропустить следующий
            </Button>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Пропустить следующий запуск?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Запланированный запуск {formatRuleDate(rule.nextRunAt)} будет
                  пропущен. Запись создана не будет.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await onSkipNext()
                    setSkipDialogOpen(false)
                  }}
                >
                  Пропустить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={onEdit}
        >
          <PenLine className="size-3.5" />
          Изменить
        </Button>
        <DeleteRule ruleId={rule.id} description={rule.description} />
      </ItemFooter>
    </Item>
  )
}
