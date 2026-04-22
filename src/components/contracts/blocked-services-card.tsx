import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'

import type { BlockedServiceSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { setPausedUntil } from './proxmox-actions'

function resolveEffectiveUntil(service: BlockedServiceSummary) {
  const now = new Date()
  const pausedUntil = service.pausedUntil ? new Date(service.pausedUntil) : null
  const dueDate = service.paymentTermDueDate
    ? new Date(service.paymentTermDueDate)
    : null

  if (dueDate !== null) {
    if (pausedUntil && pausedUntil > dueDate) return pausedUntil
    return dueDate
  }

  if (pausedUntil && pausedUntil > now) return pausedUntil
  return null
}

type ServiceRowProps = {
  service: BlockedServiceSummary
  isEditing: boolean
  showClientName: boolean
  showVmList: boolean
  onStartEdit: (service: BlockedServiceSummary) => void
  onCancelEdit: () => void
  value: string
  setValue: (value: string) => void
  onSaved: () => Promise<void>
}

function ServiceRow({
  service,
  isEditing,
  showClientName,
  showVmList,
  onStartEdit,
  onCancelEdit,
  value,
  setValue,
  onSaved,
}: ServiceRowProps) {
  const [saving, setSaving] = useState(false)
  const now = useMemo(() => new Date(), [])
  const effectiveUntil = resolveEffectiveUntil(service)
  const isExpired = effectiveUntil !== null && effectiveUntil <= now
  const effectiveLabel = effectiveUntil
    ? format(effectiveUntil, 'd MMM yyyy', { locale: ru })
    : null

  const handleSave = async () => {
    if (!service.contractVmId) {
      toast.error('Не найдена привязка ВМ для продления')
      return
    }
    if (!value) {
      toast.error('Выберите дату продления')
      return
    }

    setSaving(true)
    try {
      await setPausedUntil({
        data: {
          contractVmId: service.contractVmId,
          pausedUntil: new Date(`${value}T23:59:59`).toISOString(),
        },
      })
      toast.success('Срок продления сохранён')
      await onSaved()
      onCancelEdit()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка продления')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {showClientName ? (
            <>
              <p className="text-sm font-medium">
                {service.clientName ?? 'Клиент не указан'}
              </p>
              <p className="text-xs text-muted-foreground">
                {service.contractName}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium">{service.contractName}</p>
          )}
          {showVmList && service.blockedVmNames.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Заблокированные ВМ: {service.blockedVmNames.join(', ')}
            </p>
          )}

          {effectiveLabel ? (
            <p
              className={`text-xs ${isExpired ? 'text-destructive' : 'text-success'}`}
            >
              {isExpired
                ? `Срок действия истёк: ${effectiveLabel}`
                : `Срок действия до: ${effectiveLabel}`}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Срок действия не ограничен
            </p>
          )}
        </div>
        <Button
          variant={isEditing ? 'secondary' : 'outline'}
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={() => (isEditing ? onCancelEdit() : onStartEdit(service))}
        >
          {isEditing ? 'Отмена' : 'Продлить'}
        </Button>
      </div>

      {isEditing && (
        <div className="mt-3 flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel className="text-xs">Продлить до</FieldLabel>
            <Input
              type="date"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-8 text-xs"
            />
          </Field>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : 'Сохранить'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function BlockedServicesCard({
  services,
  onUpdated,
  title = 'Заблокированные услуги',
  showClientName = false,
  showVmList = false,
}: {
  services: BlockedServiceSummary[]
  onUpdated: () => Promise<void>
  title?: string
  showClientName?: boolean
  showVmList?: boolean
}) {
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  )
  const [value, setValue] = useState('')

  if (services.length === 0) return null

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-destructive" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {services.map((service) => (
          <ServiceRow
            key={service.contractId}
            service={service}
            isEditing={editingContractId === service.contractId}
            showClientName={showClientName}
            showVmList={showVmList}
            onStartEdit={(selected) => {
              setEditingContractId(selected.contractId)
              setValue(
                selected.pausedUntil
                  ? new Date(selected.pausedUntil).toISOString().slice(0, 10)
                  : '',
              )
            }}
            onCancelEdit={() => {
              setEditingContractId(null)
              setValue('')
            }}
            value={editingContractId === service.contractId ? value : ''}
            setValue={setValue}
            onSaved={onUpdated}
          />
        ))}
      </CardContent>
    </Card>
  )
}
