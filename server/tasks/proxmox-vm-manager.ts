import { defineTask } from 'nitro/task'
import { and, eq, isNull, lt, or } from 'drizzle-orm'

import { db } from '#/db'
import { contractVm, invoice } from '#/db/schema'
import { createProxmoxClient } from '#/lib/proxmox'
import type { VmType } from '#/lib/proxmox'

export default defineTask({
  meta: {
    name: 'proxmox-vm-manager',
    description: 'Suspends VMs bound to contracts with overdue invoices; resumes when paid.',
  },

  async run() {
    const now = new Date()

    const allBindings = await db.query.contractVm.findMany({
      with: {
        proxmoxNode: true,
      },
    })

    if (allBindings.length === 0) {
      return { result: { suspended: 0, resumed: 0 } }
    }

    // Group bindings by contractId
    const byContract = new Map<string, typeof allBindings>()
    for (const binding of allBindings) {
      const list = byContract.get(binding.contractId) ?? []
      list.push(binding)
      byContract.set(binding.contractId, list)
    }

    // Cache Proxmox clients by nodeId
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

    for (const [contractId, bindings] of byContract) {
      // Check for overdue invoices on this contract
      const overdueInvoices = await db.query.invoice.findMany({
        where: and(
          eq(invoice.contractId, contractId),
          isNull(invoice.paidAt),
          isNull(invoice.archivedAt),
          lt(invoice.dueDate, now),
        ),
        columns: { id: true },
      })

      const hasOverdue = overdueInvoices.length > 0

      for (const binding of bindings) {
        const graceExpired =
          binding.pausedUntil === null || binding.pausedUntil < now

        try {
          if (hasOverdue && graceExpired && !binding.isPausedBySystem) {
            // Need to suspend
            const client = getClient(binding)
            // We need the Proxmox node name — extract from the first node in the list
            const nodes = await client.request<Array<{ node: string }>>('/nodes').catch(() => [])
            if (nodes.length > 0) {
              await client.suspendVm(nodes[0].node, binding.vmid, binding.vmType as VmType)
              await db
                .update(contractVm)
                .set({ isPausedBySystem: true })
                .where(eq(contractVm.id, binding.id))
              suspended++
              console.log(`[proxmox-vm-manager] Suspended VM ${binding.vmid} (contract ${contractId})`)
            }
          } else if (!hasOverdue && binding.isPausedBySystem) {
            // Need to resume
            const client = getClient(binding)
            const nodes = await client.request<Array<{ node: string }>>('/nodes').catch(() => [])
            if (nodes.length > 0) {
              await client.resumeVm(nodes[0].node, binding.vmid, binding.vmType as VmType)
              await db
                .update(contractVm)
                .set({ isPausedBySystem: false })
                .where(eq(contractVm.id, binding.id))
              resumed++
              console.log(`[proxmox-vm-manager] Resumed VM ${binding.vmid} (contract ${contractId})`)
            }
          }
        } catch (err) {
          console.error(`[proxmox-vm-manager] Error for VM ${binding.vmid}:`, err)
        }
      }
    }

    console.log(`[proxmox-vm-manager] Suspended: ${suspended}, Resumed: ${resumed}`)
    return { result: { suspended, resumed } }
  },
})
