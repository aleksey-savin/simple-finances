import type { RuleWithRelations } from './types'
import { DeleteRule } from './delete'
import { CRON_PRESETS } from '#/components/reccuring/constants'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { Item, ItemContent, ItemFooter, ItemHeader } from '#/components/ui/item'
import { Calendar, Clock, PenLine } from 'lucide-react'
import { Separator } from '../ui/separator'

function getCronLabel(expr: string): string {
  const found = CRON_PRESETS.find(
    (p) => p.value === expr && p.value !== 'custom',
  )
  return found ? found.label : expr
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}

export const RuleCard = ({
  rule,
  onEdit,
  onToggle,
}: {
  rule: RuleWithRelations
  onEdit: () => void
  onToggle: (v: boolean) => void
}) => {
  const isExpense = rule.type === 'expense'

  return (
    <Item variant="outline" className="px-4">
      <ItemHeader className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge
            variant={isExpense ? 'destructive' : 'default'}
            className="shrink-0"
          >
            {isExpense ? 'Расход' : 'Доход'}
          </Badge>
          <span className="font-medium truncate">{rule.description}</span>
        </div>
        <Switch
          checked={rule.isActive}
          onCheckedChange={onToggle}
          aria-label="Активность правила"
        />
      </ItemHeader>
      <Separator />
      <ItemContent className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-2">
          {/* Category & account */}
          <div className="flex flex-wrap gap-1 text-xs">
            <span className="rounded bg-muted px-1.5 py-0.5">
              {rule.category.name}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5">
              {rule.currentAccount.name}
            </span>
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
            <span>{formatDate(rule.lastRunAt)}</span>
            <span className="opacity-60">Следующий запуск:</span>
            <span
              className={!rule.isActive ? 'line-through opacity-40' : undefined}
            >
              {rule.isActive ? formatDate(rule.nextRunAt) : 'Приостановлено'}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-xl font-semibold tabular-nums shrink-0">
          {Number(rule.amount).toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          ₽
        </div>
      </ItemContent>

      <Separator />

      <ItemFooter className="flex justify-end items-center">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={onEdit}
        >
          <PenLine className="size-3.5" />
          Изменить
        </Button>
        <DeleteRule rule={rule} />
      </ItemFooter>
    </Item>
  )
}
