import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, asc, desc, eq, gte, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { contractVm, invoice, proxmoxNode, recurringRule } from '@/db/schema'
import {
  formatDateRu,
  getContractNotificationContext,
} from '#/lib/contract-notifications'
import { sendEmail } from '#/lib/email'
import { buildGracePeriodExtendedEmail } from '#/lib/email-templates'
import { runProxmoxVmManager } from '#/lib/proxmox-vm-manager'
import { createProxmoxClient } from '#/lib/proxmox'
import { auth } from 'utils/auth'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const contractVmsQueryKey = (contractId: string) =>
  ['contract-vms', contractId] as const
export const contractPaymentTermQueryKey = (contractId: string) =>
  ['contract-payment-term', contractId] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session.user.id) throw new Error('Не авторизован')
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

export const fetchContractPaymentTerm = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ contractId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const now = new Date()

    const nearestUnpaidInvoice = await db.query.invoice.findFirst({
      where: and(
        eq(invoice.contractId, data.contractId),
        isNull(invoice.paidAt),
        isNull(invoice.archivedAt),
        isNotNull(invoice.dueDate),
      ),
      columns: { dueDate: true },
      orderBy: [asc(invoice.dueDate)],
    })

    if (nearestUnpaidInvoice?.dueDate) {
      return { dueDate: nearestUnpaidInvoice.dueDate.toISOString() }
    }

    const upcomingRecurring = await db.query.recurringRule.findMany({
      where: and(
        eq(recurringRule.contractId, data.contractId),
        eq(recurringRule.isActive, true),
        isNotNull(recurringRule.nextRunAt),
        gte(recurringRule.nextRunAt, now),
      ),
      columns: {
        nextRunAt: true,
        dueDaysFromCreation: true,
      },
      orderBy: [asc(recurringRule.nextRunAt)],
    })

    const recurringDueDate =
      upcomingRecurring
        .map((rule) => {
          if (!rule.nextRunAt) return null
          if (!rule.dueDaysFromCreation || rule.dueDaysFromCreation <= 0) {
            return null
          }
          return new Date(
            rule.nextRunAt.getTime() + rule.dueDaysFromCreation * 86400000,
          )
        })
        .filter((date): date is Date => date !== null)
        .sort((a, b) => a.getTime() - b.getTime())
        .at(0) ?? null

    return {
      dueDate: recurringDueDate ? recurringDueDate.toISOString() : null,
    }
  })

// ─── Fetch VMs available on a Proxmox node ────────────────────────────────────

export const fetchProxmoxVmsForNode = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ nodeId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()

    const node = await db.query.proxmoxNode.findFirst({
      where: eq(proxmoxNode.id, data.nodeId),
    })
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

    const allVms = await Promise.all(nodes.map((n) => client.listVms(n.node)))

    return allVms.flat().sort((a, b) => a.vmid - b.vmid)
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
    const binding = await db.query.contractVm.findFirst({
      where: eq(contractVm.id, data.contractVmId),
      columns: { contractId: true },
    })

    if (!binding) throw new Error('Привязка ВМ не найдена')

    const previousPausedUntilRows = await db
      .select({ pausedUntil: contractVm.pausedUntil })
      .from(contractVm)
      .where(
        and(
          eq(contractVm.contractId, binding.contractId),
          isNotNull(contractVm.pausedUntil),
        ),
      )
      .orderBy(desc(contractVm.pausedUntil))
      .limit(1)
    const previousPausedUntil = previousPausedUntilRows[0]?.pausedUntil ?? null

    await db
      .update(contractVm)
      .set({
        pausedUntil: data.pausedUntil ? new Date(data.pausedUntil) : null,
      })
      .where(eq(contractVm.contractId, binding.contractId))

    if (data.pausedUntil) {
      const newPausedUntil = new Date(data.pausedUntil)
      const changed =
        !previousPausedUntil ||
        previousPausedUntil.getTime() !== newPausedUntil.getTime()

      if (changed) {
        const notificationContext = await getContractNotificationContext(
          binding.contractId,
        )

        if (notificationContext) {
          const emailTemplate = buildGracePeriodExtendedEmail({
            contactName: notificationContext.contactName,
            contractLabel: notificationContext.contractLabel,
            extendedUntilLabel: formatDateRu(newPausedUntil),
          })

          await sendEmail({
            to: notificationContext.toEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
          }).catch((error) => {
            console.error(
              `[proxmox-actions] Failed to send grace-period notification for contract ${binding.contractId}:`,
              error,
            )
          })
        } else {
          console.log(
            `[proxmox-actions] Grace-period notification skipped: no contact email for contract ${binding.contractId}`,
          )
        }
      }
    }

    await runProxmoxVmManager({
      contractId: binding.contractId,
      source: 'manual-paused-until-update',
    }).catch((error) => {
      console.error(
        '[proxmox-actions] Failed to run proxmox-vm-manager immediately after pausedUntil update',
        error,
      )
    })
  })
