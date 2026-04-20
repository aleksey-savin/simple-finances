import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { contractVm, proxmoxNode } from '@/db/schema'
import { createProxmoxClient } from '#/lib/proxmox'
import { auth } from 'utils/auth'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const contractVmsQueryKey = (contractId: string) =>
  ['contract-vms', contractId] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')
  return session.user.id
}

// ─── Fetch VMs bound to a contract ────────────────────────────────────────────

export const fetchContractVms = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ contractId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    return db.query.contractVm.findMany({
      where: eq(contractVm.contractId, data.contractId),
      with: {
        proxmoxNode: {
          columns: { id: true, name: true, host: true, port: true },
        },
      },
    })
  })

// ─── Fetch VMs available on a Proxmox node ────────────────────────────────────

export const fetchProxmoxVmsForNode = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ nodeId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

    const [node] = await db
      .select()
      .from(proxmoxNode)
      .where(eq(proxmoxNode.id, data.nodeId))
      .limit(1)
    if (!node) throw new Error('Нода не найдена')

    const client = createProxmoxClient({
      host: node.host,
      port: node.port,
      tokenId: node.tokenId,
      tokenSecret: node.tokenSecret,
      verifySsl: node.verifySsl,
    })

    // Extract node name from host (Proxmox API uses the node hostname)
    // The first node name is sufficient; we'll list all VMs from it
    const nodes = await client.request<Array<{ node: string }>>('/nodes')
    if (!nodes.length) return []

    const allVms = await Promise.all(
      nodes.map((n) => client.listVms(n.node).catch(() => [])),
    )
    return allVms.flat()
  })

// ─── Bind VM to contract ──────────────────────────────────────────────────────

export const addContractVmSchema = z.object({
  contractId: z.string().min(1),
  proxmoxNodeId: z.string().min(1),
  vmid: z.number().int(),
  vmType: z.enum(['qemu', 'lxc']),
  name: z.string().min(1),
})

export const addContractVm = createServerFn({ method: 'POST' })
  .inputValidator(addContractVmSchema)
  .handler(async ({ data }) => {
    await requireSession()
    try {
      await db.insert(contractVm).values({
        contractId: data.contractId,
        proxmoxNodeId: data.proxmoxNodeId,
        vmid: data.vmid,
        vmType: data.vmType,
        name: data.name,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('contract_vm_node_vmid_unique')) {
        throw new Error('Эта ВМ уже привязана к другому договору')
      }
      throw err
    }
  })

// ─── Remove VM binding ────────────────────────────────────────────────────────

export const removeContractVm = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    await db.delete(contractVm).where(eq(contractVm.id, data.id))
  })

// ─── Set grace period ─────────────────────────────────────────────────────────

export const setPausedUntil = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      contractVmId: z.string(),
      pausedUntil: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession()
    await db
      .update(contractVm)
      .set({ pausedUntil: data.pausedUntil ? new Date(data.pausedUntil) : null })
      .where(eq(contractVm.id, data.contractVmId))
  })
