import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Server, Trash2, PauseCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  contractVmsQueryKey,
  contractPaymentTermQueryKey,
  fetchContractVms,
  fetchContractPaymentTerm,
  fetchProxmoxVmsForNode,
  addContractVm,
  removeContractVm,
  setPausedUntil,
} from './proxmox-actions'
import {
  proxmoxNodesQueryKey,
  fetchProxmoxNodes,
} from '@/components/preferences/proxmox-actions'

type ContractVm = Awaited<ReturnType<typeof fetchContractVms>>[number]
type ProxmoxVm = {
  vmid: number
  name: string
  type: 'qemu' | 'lxc'
  status: string
  node: string
}

function VmStatusBadge({
  isPausedBySystem,
}: {
  status?: boolean
  isPausedBySystem: boolean
}) {
  if (isPausedBySystem) {
    return (
      <span className="flex items-center gap-1 text-xs text-orange-600">
        <PauseCircle className="size-3" />
        Приостановлена системой
      </span>
    )
  }
  return null
}

function GracePeriodPicker({
  contractVmId,
  pausedUntil,
  onSaved,
}: {
  contractVmId: string
  pausedUntil: string | null
  onSaved: () => void
}) {
  const [value, setValue] = useState(
    pausedUntil ? new Date(pausedUntil).toISOString().slice(0, 10) : '',
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await setPausedUntil({
        data: {
          contractVmId,
          pausedUntil: value
            ? new Date(`${value}T23:59:59`).toISOString()
            : null,
        },
      })
      toast.success('Период продления сохранён')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-end gap-2 mt-1">
      <Field className="flex-1">
        <FieldLabel className="text-xs">Продлить работу до</FieldLabel>
        <Input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 text-xs"
        />
      </Field>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <Loader2 className="size-3 animate-spin" /> : 'Сохранить'}
      </Button>
      {value && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={async () => {
            setValue('')
            await setPausedUntil({
              data: { contractVmId, pausedUntil: null },
            })
            onSaved()
          }}
        >
          Сбросить
        </Button>
      )}
    </div>
  )
}

function VmRow({ vm, onRemoved }: { vm: ContractVm; onRemoved: () => void }) {
  const handleRemove = async () => {
    try {
      await removeContractVm({ data: { id: vm.id } })
      onRemoved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  return (
    <div className="border px-3 py-2 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {vm.vmType === 'qemu' ? '🖥' : '📦'} {vm.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              VMID {vm.vmid}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground">
              {vm.vmType}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Нода: {vm.proxmoxNode.name} ({vm.proxmoxNode.host})
          </div>
          <VmStatusBadge isPausedBySystem={vm.isPausedBySystem} />
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function BrowseVmsDialog({
  contractId,
  open,
  onOpenChange,
}: {
  contractId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [bindingVmid, setBindingVmid] = useState<number | null>(null)

  const { data: nodes = [] } = useQuery({
    queryKey: proxmoxNodesQueryKey,
    queryFn: () => fetchProxmoxNodes(),
  })

  const {
    data: vms = [],
    isLoading: loadingVms,
    error: vmsError,
  } = useQuery({
    queryKey: ['proxmox-vms-for-node', selectedNodeId],
    queryFn: () => fetchProxmoxVmsForNode({ data: { nodeId: selectedNodeId } }),
    enabled: !!selectedNodeId,
    retry: false,
  })

  const { data: boundVms = [] } = useQuery({
    queryKey: contractVmsQueryKey(contractId),
    queryFn: () => fetchContractVms({ data: { contractId } }),
  })

  const boundVmids = new Set(
    boundVms.map((v) => `${v.proxmoxNodeId}:${v.vmid}`),
  )

  const handleBind = async (vm: ProxmoxVm) => {
    setBindingVmid(vm.vmid)
    try {
      await addContractVm({
        data: {
          contractId,
          proxmoxNodeId: selectedNodeId,
          vmid: vm.vmid,
          vmType: vm.type,
          name: vm.name,
        },
      })
      await queryClient.invalidateQueries({
        queryKey: contractVmsQueryKey(contractId),
      })
      toast.success(`${vm.name} привязана к договору`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBindingVmid(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex min-h-auto max-h-[90vh] max-w-lg flex-col "
      >
        <DialogHeader>
          <DialogTitle>Привязать ВМ / контейнер</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Нода Proxmox</FieldLabel>
            <Combobox
              options={nodes.map((n) => ({
                value: n.id,
                label: `${n.name} (${n.host})`,
              }))}
              value={selectedNodeId}
              onValueChange={setSelectedNodeId}
              placeholder="Выберите ноду"
            />
          </Field>

          {selectedNodeId && (
            <div className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
              {loadingVms ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="size-4 animate-spin" />
                  Загрузка ВМ…
                </div>
              ) : vmsError ? (
                <p className="text-sm text-destructive py-2">
                  {vmsError instanceof Error
                    ? vmsError.message
                    : 'Ошибка загрузки ВМ'}
                </p>
              ) : vms.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  ВМ не найдены
                </p>
              ) : (
                vms.map((vm) => {
                  const alreadyBound = boundVmids.has(
                    `${selectedNodeId}:${vm.vmid}`,
                  )
                  return (
                    <div
                      key={`${vm.type}-${vm.vmid}`}
                      className="flex items-center justify-between border px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {vm.type === 'qemu' ? '🖥' : '📦'} {vm.name}
                          <span className="text-xs text-muted-foreground ml-2 font-mono">
                            VMID {vm.vmid}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vm.type} · {vm.status} · {vm.node}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyBound ? 'outline' : 'default'}
                        className="text-xs h-7"
                        disabled={alreadyBound || bindingVmid === vm.vmid}
                        onClick={() => handleBind(vm)}
                      >
                        {bindingVmid === vm.vmid ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : alreadyBound ? (
                          'Привязана'
                        ) : (
                          'Привязать'
                        )}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ContractIntegrationsSection({
  contractId,
}: {
  contractId: string
}) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showGrace, setShowGrace] = useState(false)

  const { data: vms = [], isLoading } = useQuery({
    queryKey: contractVmsQueryKey(contractId),
    queryFn: () => fetchContractVms({ data: { contractId } }),
  })
  const { data: paymentTerm } = useQuery({
    queryKey: contractPaymentTermQueryKey(contractId),
    queryFn: () => fetchContractPaymentTerm({ data: { contractId } }),
  })

  const { data: nodes = [] } = useQuery({
    queryKey: proxmoxNodesQueryKey,
    queryFn: () => fetchProxmoxNodes(),
  })

  const graceSourceVmId = vms[0]?.id ?? null
  const latestPausedUntil =
    vms
      .map((vm) => (vm.pausedUntil ? new Date(vm.pausedUntil) : null))
      .filter((value): value is Date => value !== null)
      .sort((a, b) => b.getTime() - a.getTime())
      .at(0) ?? null
  const invoiceDueDate = paymentTerm?.dueDate
    ? new Date(paymentTerm.dueDate)
    : null
  const now = new Date()
  const effectiveUntil =
    invoiceDueDate !== null
      ? latestPausedUntil && latestPausedUntil > invoiceDueDate
        ? latestPausedUntil
        : invoiceDueDate
      : latestPausedUntil && latestPausedUntil > now
        ? latestPausedUntil
        : null
  const isEffectiveActive = effectiveUntil !== null && effectiveUntil > now
  const isEffectiveExpired = effectiveUntil !== null && effectiveUntil <= now
  const effectiveLabel = effectiveUntil
    ? format(effectiveUntil, 'd MMM yyyy', { locale: ru })
    : ''

  if (nodes.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Server className="size-3.5" />
        Добавьте ноды Proxmox в разделе{' '}
        <a href="/preferences" className="text-primary underline">
          Настройки → Proxmox
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Привязанные ВМ и контейнеры
        </span>
        <div className="flex items-center gap-1">
          {vms.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowGrace((prev) => !prev)}
            >
              Продлить
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3" />
            Привязать ВМ
          </Button>
        </div>
      </div>

      {vms.length > 0 && (
        <>
          {isEffectiveActive && (
            <span className="text-xs text-green-600">
              Срок действия до: {effectiveLabel}
            </span>
          )}
          {isEffectiveExpired && (
            <span className="text-xs text-red-600">
              Срок действия истёк: {effectiveLabel}
            </span>
          )}
          {!effectiveUntil && (
            <span className="text-xs text-muted-foreground">
              Срок действия не ограничен
            </span>
          )}
        </>
      )}

      {showGrace && graceSourceVmId && (
        <GracePeriodPicker
          contractVmId={graceSourceVmId}
          pausedUntil={latestPausedUntil?.toISOString() ?? null}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: contractVmsQueryKey(contractId),
            })
            setShowGrace(false)
          }}
        />
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Загрузка…
        </div>
      )}

      {!isLoading && vms.length === 0 && (
        <p className="text-xs text-muted-foreground">Нет привязанных ВМ</p>
      )}

      {vms.map((vm) => (
        <VmRow
          key={vm.id}
          vm={vm}
          onRemoved={() =>
            queryClient.invalidateQueries({
              queryKey: contractVmsQueryKey(contractId),
            })
          }
        />
      ))}

      <BrowseVmsDialog
        contractId={contractId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
