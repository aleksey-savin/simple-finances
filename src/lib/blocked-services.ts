import '@tanstack/react-start/server-only'

import { and, eq, inArray, isNull, lt } from 'drizzle-orm'

import { db } from '#/db/index.server'
import { contractVm, invoice } from '#/db/schema'
import { getContractPaymentTermDueDate } from '#/lib/contract-payment-term'
import type { BlockedServiceSummary, PendingBlockSummary } from '@/types'

export async function getBlockedServicesByContractIds(
  contractIds: string[],
): Promise<BlockedServiceSummary[]> {
  const uniqueContractIds = [...new Set(contractIds)]
  if (uniqueContractIds.length === 0) return []

  const bindings = await db.query.contractVm.findMany({
    where: inArray(contractVm.contractId, uniqueContractIds),
    columns: {
      id: true,
      contractId: true,
      name: true,
      pausedUntil: true,
      isPausedBySystem: true,
    },
    with: {
      contract: {
        columns: {
          id: true,
          name: true,
        },
        with: {
          counterparty: {
            columns: {
              id: true,
            },
            with: {
              clientLinks: {
                columns: {},
                with: {
                  client: {
                    columns: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const grouped = new Map<string, typeof bindings>()
  for (const binding of bindings) {
    const list = grouped.get(binding.contractId) ?? []
    list.push(binding)
    grouped.set(binding.contractId, list)
  }

  const blockedServices = await Promise.all(
    [...grouped.entries()].map(async ([contractId, items]) => {
      const blockedItems = items.filter((item) => item.isPausedBySystem)
      if (blockedItems.length === 0) return null

      const latestPausedUntil =
        items
          .map((item) => item.pausedUntil)
          .filter((value): value is Date => value !== null)
          .sort((a, b) => b.getTime() - a.getTime())
          .at(0) ?? null

      const paymentTermDueDate = await getContractPaymentTermDueDate(contractId)

      return {
        contractId,
        contractName: items[0]?.contract.name ?? 'Без названия',
        clientName:
          items[0]?.contract.counterparty.clientLinks.at(0)?.client.name ??
          null,
        contractVmId: blockedItems[0]?.id ?? '',
        blockedVmNames: blockedItems.map((item) => item.name),
        totalVmCount: items.length,
        blockedVmCount: blockedItems.length,
        pausedUntil: latestPausedUntil ? latestPausedUntil.toISOString() : null,
        paymentTermDueDate: paymentTermDueDate
          ? paymentTermDueDate.toISOString()
          : null,
      } satisfies BlockedServiceSummary
    }),
  )

  return blockedServices
    .filter((service): service is BlockedServiceSummary => service !== null)
    .sort((a, b) => a.contractName.localeCompare(b.contractName, 'ru'))
}

export async function getPendingBlockedServicesByContractIds(
  contractIds: string[],
): Promise<PendingBlockSummary[]> {
  const uniqueContractIds = [...new Set(contractIds)]
  if (uniqueContractIds.length === 0) return []

  const now = new Date()

  const bindings = await db.query.contractVm.findMany({
    where: inArray(contractVm.contractId, uniqueContractIds),
    columns: {
      id: true,
      contractId: true,
      name: true,
      pausedUntil: true,
      isPausedBySystem: true,
    },
    with: {
      contract: {
        columns: { id: true, name: true },
        with: {
          counterparty: {
            columns: { id: true },
            with: {
              clientLinks: {
                columns: {},
                with: {
                  client: { columns: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const grouped = new Map<string, typeof bindings>()
  for (const binding of bindings) {
    const list = grouped.get(binding.contractId) ?? []
    list.push(binding)
    grouped.set(binding.contractId, list)
  }

  const pending = await Promise.all(
    [...grouped.entries()].map(async ([contractId, items]) => {
      if (items.some((item) => item.isPausedBySystem)) return null

      const overdueInvoice = await db.query.invoice.findFirst({
        where: and(
          eq(invoice.contractId, contractId),
          isNull(invoice.paidAt),
          isNull(invoice.archivedAt),
          lt(invoice.dueDate, now),
        ),
        columns: { id: true },
      })

      const latestPausedUntil =
        items
          .map((item) => item.pausedUntil)
          .filter((value): value is Date => value !== null && value > now)
          .sort((a, b) => b.getTime() - a.getTime())
          .at(0) ?? null

      let willSuspendAt: Date | null = null
      if (overdueInvoice) {
        willSuspendAt = latestPausedUntil ?? now
      } else {
        const dueDate = await getContractPaymentTermDueDate(contractId, now)
        if (dueDate && dueDate > now) willSuspendAt = dueDate
      }

      if (!willSuspendAt) return null

      return {
        contractId,
        contractName: items[0]?.contract.name ?? 'Без названия',
        clientName:
          items[0]?.contract.counterparty.clientLinks.at(0)?.client.name ??
          null,
        vmNames: items.map((item) => item.name),
        willSuspendAt: willSuspendAt.toISOString(),
      } satisfies PendingBlockSummary
    }),
  )

  return pending
    .filter((service): service is PendingBlockSummary => service !== null)
    .sort(
      (a, b) =>
        new Date(a.willSuspendAt).getTime() -
        new Date(b.willSuspendAt).getTime(),
    )
}
