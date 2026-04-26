import '@tanstack/react-start/server-only'

import { inArray } from 'drizzle-orm'

import { db } from '#/db/index.server'
import { contractVm } from '#/db/schema'
import { getContractPaymentTermDueDate } from '#/lib/contract-payment-term'
import type { BlockedServiceSummary } from '@/types'

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
