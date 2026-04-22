import { and, eq, isNull, lt } from 'drizzle-orm'

import { db } from '#/db'
import { contractVm, invoice } from '#/db/schema'
import { getContractNotificationContext } from '#/lib/contract-notifications'
import { sendEmail } from '#/lib/email'
import {
  buildServiceResumedEmail,
  buildServiceSuspendedEmail,
} from '#/lib/email-templates'
import { createProxmoxClient } from '#/lib/proxmox'
import type { ProxmoxVm, VmType } from '#/lib/proxmox'

type RunProxmoxVmManagerOptions = {
  contractId?: string
  source?: string
}

function formatVmList(bindings: Array<{ name: string; vmid: number }>) {
  return bindings
    .map((vm) => `${vm.name} (VMID ${vm.vmid})`)
    .join(', ')
}

export async function runProxmoxVmManager({
  contractId,
  source = 'task',
}: RunProxmoxVmManagerOptions = {}) {
  const now = new Date()

  const allBindings = contractId
    ? await db.query.contractVm.findMany({
        where: eq(contractVm.contractId, contractId),
        with: { proxmoxNode: true },
      })
    : await db.query.contractVm.findMany({
        with: { proxmoxNode: true },
      })

  if (allBindings.length === 0) {
    return { suspended: 0, resumed: 0 }
  }

  const byContract = new Map<string, typeof allBindings>()
  for (const binding of allBindings) {
    const list = byContract.get(binding.contractId) ?? []
    list.push(binding)
    byContract.set(binding.contractId, list)
  }

  const clients = new Map<string, ReturnType<typeof createProxmoxClient>>()
  const getClient = (binding: (typeof allBindings)[number]) => {
    const existing = clients.get(binding.proxmoxNodeId)
    if (existing) return existing
    const client = createProxmoxClient({
      host: binding.proxmoxNode.host,
      port: binding.proxmoxNode.port,
      tokenId: binding.proxmoxNode.tokenId,
      tokenSecret: binding.proxmoxNode.tokenSecret,
      verifySsl: binding.proxmoxNode.verifySsl,
    })
    clients.set(binding.proxmoxNodeId, client)
    return client
  }

  let suspended = 0
  let resumed = 0

  const vmNodeCache = new Map<string, Map<number, string>>()
  const findVmNode = async (
    binding: (typeof allBindings)[number],
  ): Promise<string | null> => {
    let nodeMap = vmNodeCache.get(binding.proxmoxNodeId)
    if (!nodeMap) {
      const client = getClient(binding)
      const clusterNodes = await client
        .request<Array<{ node: string }>>('/nodes')
        .catch(() => [] as Array<{ node: string }>)
      const allVms = (
        await Promise.all(
          clusterNodes.map((n) =>
            client
              .listVms(n.node)
              .catch(() => [] as ProxmoxVm[]),
          ),
        )
      ).flat()
      nodeMap = new Map(allVms.map((vm) => [vm.vmid, vm.node]))
      vmNodeCache.set(binding.proxmoxNodeId, nodeMap)
    }
    return nodeMap.get(binding.vmid) ?? null
  }

  for (const [currentContractId, bindings] of byContract) {
    const overdueInvoices = await db.query.invoice.findMany({
      where: and(
        eq(invoice.contractId, currentContractId),
        isNull(invoice.paidAt),
        isNull(invoice.archivedAt),
        lt(invoice.dueDate, now),
      ),
      columns: { id: true },
    })

    const hasOverdue = overdueInvoices.length > 0
    const latestPausedUntil =
      bindings
        .map((binding) => binding.pausedUntil)
        .filter((value): value is Date => value !== null)
        .sort((a, b) => b.getTime() - a.getTime())
        .at(0)
    const graceActive = latestPausedUntil !== undefined && latestPausedUntil > now
    const shouldSuspend = hasOverdue && !graceActive
    const shouldResume = !hasOverdue || graceActive
    const resumeReason = graceActive
      ? 'grace period is active'
      : 'contract has no overdue invoices'
    const latestPausedUntilText = latestPausedUntil?.toISOString() ?? 'none'

    console.log(
      `[proxmox-vm-manager] (${source}) Contract ${currentContractId}: hasOverdue=${hasOverdue}, graceActive=${graceActive}, latestPausedUntil=${latestPausedUntilText}, bindings=${bindings.length}`,
    )

    let contractSuspended = 0
    let contractResumed = 0
    const suspendedVmList: Array<{ name: string; vmid: number }> = []
    const resumedVmList: Array<{ name: string; vmid: number }> = []

    for (const binding of bindings) {
      try {
        if (shouldSuspend && !binding.isPausedBySystem) {
          const vmNode = await findVmNode(binding)
          if (!vmNode) {
            console.error(
              `[proxmox-vm-manager] VM ${binding.vmid} not found on any cluster node`,
            )
            continue
          }
          const client = getClient(binding)
          await client.suspendVm(
            vmNode,
            binding.vmid,
            binding.vmType as VmType,
          )
          await db
            .update(contractVm)
            .set({ isPausedBySystem: true })
            .where(eq(contractVm.id, binding.id))
          suspended++
          contractSuspended++
          suspendedVmList.push({ name: binding.name, vmid: binding.vmid })
          console.log(
            `[proxmox-vm-manager] Suspended VM ${binding.vmid} on ${vmNode} (contract ${currentContractId})`,
          )
        } else if (shouldResume && binding.isPausedBySystem) {
          const vmNode = await findVmNode(binding)
          if (!vmNode) {
            console.error(
              `[proxmox-vm-manager] VM ${binding.vmid} not found on any cluster node`,
            )
            continue
          }
          const client = getClient(binding)
          await client.resumeVm(
            vmNode,
            binding.vmid,
            binding.vmType as VmType,
          )
          await db
            .update(contractVm)
            .set({ isPausedBySystem: false })
            .where(eq(contractVm.id, binding.id))
          resumed++
          contractResumed++
          resumedVmList.push({ name: binding.name, vmid: binding.vmid })
          console.log(
            `[proxmox-vm-manager] Resumed VM ${binding.vmid} on ${vmNode} (contract ${currentContractId}); reason: ${resumeReason}`,
          )
        }
      } catch (err) {
        console.error(
          `[proxmox-vm-manager] Error for VM ${binding.vmid}:`,
          err,
        )
      }
    }

    if (contractSuspended > 0) {
      const notificationContext = await getContractNotificationContext(
        currentContractId,
      )
      if (!notificationContext) {
        console.log(
          `[proxmox-vm-manager] Suspend notification skipped: no contact email for contract ${currentContractId}`,
        )
      } else {
        const emailTemplate = buildServiceSuspendedEmail({
          contactName: notificationContext.contactName,
          contractLabel: notificationContext.contractLabel,
          vmList: formatVmList(suspendedVmList),
        })

        await sendEmail({
          to: notificationContext.toEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        }).catch((error) => {
          console.error(
            `[proxmox-vm-manager] Failed to send suspend notification for contract ${currentContractId}:`,
            error,
          )
        })
      }
    }

    if (contractResumed > 0 && !hasOverdue) {
      const notificationContext = await getContractNotificationContext(
        currentContractId,
      )
      if (!notificationContext) {
        console.log(
          `[proxmox-vm-manager] Resume notification skipped: no contact email for contract ${currentContractId}`,
        )
      } else {
        const emailTemplate = buildServiceResumedEmail({
          contactName: notificationContext.contactName,
          contractLabel: notificationContext.contractLabel,
          vmList: formatVmList(resumedVmList),
        })

        await sendEmail({
          to: notificationContext.toEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        }).catch((error) => {
          console.error(
            `[proxmox-vm-manager] Failed to send resume notification for contract ${currentContractId}:`,
            error,
          )
        })
      }
    }
  }

  console.log(
    `[proxmox-vm-manager] (${source}) Suspended: ${suspended}, Resumed: ${resumed}`,
  )
  return { suspended, resumed }
}
