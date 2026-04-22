import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Server,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  proxmoxNodesQueryKey,
  proxmoxSettingsQueryKey,
  fetchProxmoxNodes,
  fetchProxmoxAccountSettings,
  addProxmoxNode,
  updateProxmoxNode,
  deleteProxmoxNode,
  testProxmoxNodeConnection,
  saveProxmoxAccountSettings,
  proxmoxNodeSchema,
  proxmoxAccountSettingsSchema,
} from './proxmox-actions'

type ProxmoxNode = {
  id: string
  name: string
  host: string
  port: number
  tokenId: string
  tokenSecret: string
  verifySsl: boolean
}

type NodeFormProps = {
  node?: ProxmoxNode
  onDone: () => void
}

function NodeForm({ node, onDone }: NodeFormProps) {
  const queryClient = useQueryClient()
  const [showSecret, setShowSecret] = useState(false)
  const isEdit = node !== undefined

  const form = useForm({
    defaultValues: {
      name: node?.name ?? '',
      host: node?.host ?? '',
      port: node?.port ?? 8006,
      tokenId: node?.tokenId ?? '',
      tokenSecret: node?.tokenSecret ?? '',
      verifySsl: node?.verifySsl ?? false,
    },
    validators: { onSubmit: proxmoxNodeSchema },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await updateProxmoxNode({ data: { id: node.id, ...value } })
          toast.success('Нода обновлена')
        } else {
          await addProxmoxNode({ data: value })
          toast.success('Нода добавлена')
        }
        await queryClient.invalidateQueries({ queryKey: proxmoxNodesQueryKey })
        onDone()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Название</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Proxmox Production"
                  autoComplete="off"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <div className="flex gap-2">
          <form.Field name="host">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="flex-1">
                  <FieldLabel htmlFor={field.name}>Адрес</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="192.168.1.100"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="port">
            {(field) => (
              <Field className="w-24">
                <FieldLabel htmlFor={field.name}>Порт</FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  min={1}
                  max={65535}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </Field>
            )}
          </form.Field>
        </div>
      </div>

      <form.Field name="tokenId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>API Token ID</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="root@pam!mytoken"
                autoComplete="off"
                className="font-mono text-sm"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="tokenSecret">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>API Token Secret</FieldLabel>
              <div className="relative">
                <Input
                  id={field.name}
                  type={showSecret ? 'text' : 'password'}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10 font-mono text-sm"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showSecret ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="verifySsl">
        {(field) => (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              className="size-4"
            />
            Проверять SSL-сертификат
          </label>
        )}
      </form.Field>

      <div className="flex gap-2 pt-1">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  )
}

function NodeRow({ node }: { node: ProxmoxNode }) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteProxmoxNode({ data: { id: node.id } })
      await queryClient.invalidateQueries({ queryKey: proxmoxNodesQueryKey })
      toast.success('Нода удалена')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Произошла ошибка')
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await testProxmoxNodeConnection({ data: { id: node.id } })
      if (result.ok) {
        toast.success(`${node.name}: подключение успешно`)
      } else {
        toast.error(`${node.name}: ${result.error ?? 'Ошибка подключения'}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setIsTesting(false)
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-none border p-3">
        <NodeForm node={node} onDone={() => setIsEditing(false)} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-none border px-3 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground font-mono">
          {node.host}:{node.port} · {node.tokenId}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={isTesting}
          className="text-xs"
        >
          {isTesting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Server className="size-3" />
          )}
          Тест
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function ReminderSettings() {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: proxmoxSettingsQueryKey,
    queryFn: () => fetchProxmoxAccountSettings(),
  })

  const form = useForm({
    defaultValues: { reminderDaysBefore: settings?.reminderDaysBefore ?? 3 },
    validators: { onSubmit: proxmoxAccountSettingsSchema },
    onSubmit: async ({ value }) => {
      try {
        await saveProxmoxAccountSettings({ data: value })
        await queryClient.invalidateQueries({
          queryKey: proxmoxSettingsQueryKey,
        })
        toast.success('Настройки сохранены')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="reminderDaysBefore">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>
              Напоминать за N дней до срока оплаты
            </FieldLabel>
            <Input
              id={field.name}
              type="number"
              min={0}
              max={365}
              className="w-24"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(Number(e.target.value))}
            />
          </Field>
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? 'Сохранение…' : 'Сохранить'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export function NotificationsPreferencesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Напоминания об оплате</CardTitle>
        <CardDescription>
          Email-уведомление контактному лицу клиента за N дней до срока оплаты
          по счёту, привязанному к договору
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-lg">
        <ReminderSettings />
      </CardContent>
    </Card>
  )
}

export function ProxmoxPreferencesPanel() {
  const [isAdding, setIsAdding] = useState(false)

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: proxmoxNodesQueryKey,
    queryFn: () => fetchProxmoxNodes(),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ноды Proxmox</CardTitle>
        <CardDescription>
          Подключения к серверам Proxmox для управления виртуальными машинами и
          контейнерами
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загрузка…
          </div>
        )}

        {nodes.map((node) => (
          <NodeRow key={node.id} node={node} />
        ))}

        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="size-4" />
            Добавить ноду
          </Button>
        )}

        {isAdding && (
          <div className="rounded-none border p-3">
            <NodeForm onDone={() => setIsAdding(false)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
