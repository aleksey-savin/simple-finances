import { createServerFn } from '@tanstack/react-start'

import { desc, eq, inArray } from 'drizzle-orm'

import { db } from '#/db/index.server'
import {
  bankTransaction,
  counterparty,
  invoice,
  settlementScoring,
} from '#/db/schema'
import { parseStoredBankTransactionPayload } from '#/lib/bank-statement'
import { resolveScopedAccountIds } from '#/lib/company-scope'
import { getRequest, requireSession } from '#/utils/session.server'

import type {
  ScoringMetricsLoaderData,
  ScoringMismatchRow,
} from '#/components/metrics/types'

export const fetchScoringMetrics = createServerFn().handler(
  async (): Promise<ScoringMetricsLoaderData> => {
    const session = await requireSession()
    const request = await getRequest()

    const { accountIds } = await resolveScopedAccountIds(
      session.user.id,
      request.headers,
    )

    const empty: ScoringMetricsLoaderData = {
      total: 0,
      highestCount: 0,
      notHighestCount: 0,
      highestPercentage: 0,
      mismatches: [],
    }

    if (accountIds.length === 0) return empty

    const rows = await db
      .select({
        bankTransactionId: settlementScoring.bankTransactionId,
        matchScore: settlementScoring.matchScore,
        topMatchScore: settlementScoring.topMatchScore,
        bankDescription: bankTransaction.description,
        bankCounterpartyNameRaw: bankTransaction.counterpartyNameRaw,
        bankRawPayload: bankTransaction.rawPayload,
        bankAmount: bankTransaction.amount,
        bankDirection: bankTransaction.direction,
        bankBookedAt: bankTransaction.bookedAt,
        invoiceDescription: invoice.description,
        invoiceAmount: invoice.amount,
        invoiceCounterpartyName: counterparty.name,
      })
      .from(settlementScoring)
      .innerJoin(
        bankTransaction,
        eq(bankTransaction.id, settlementScoring.bankTransactionId),
      )
      .innerJoin(invoice, eq(invoice.id, settlementScoring.invoiceId))
      .leftJoin(counterparty, eq(counterparty.id, invoice.counterpartyId))
      .where(inArray(bankTransaction.currentAccountId, accountIds))
      .orderBy(desc(bankTransaction.bookedAt))

    if (rows.length === 0) return empty

    type Row = (typeof rows)[number]
    const byBankTransaction = new Map<string, Row[]>()
    for (const row of rows) {
      const bucket = byBankTransaction.get(row.bankTransactionId) ?? []
      bucket.push(row)
      byBankTransaction.set(row.bankTransactionId, bucket)
    }

    let total = 0
    let highestCount = 0
    const mismatches: ScoringMismatchRow[] = []

    for (const bucket of byBankTransaction.values()) {
      const groupTop = Math.max(...bucket.map((r) => r.topMatchScore))
      // Skip imports that had no real matching signal — accepting the "top" of an
      // all-zero candidate set tells us nothing about automatability.
      if (groupTop <= 0) continue

      total++

      const isHighest = bucket.some(
        (r) => r.topMatchScore > 0 && r.matchScore === r.topMatchScore,
      )
      if (isHighest) {
        highestCount++
        continue
      }

      // For the comparison table show the highest-scored invoice the user
      // actually picked (still below the top candidate).
      const representative = bucket.reduce((acc, r) =>
        r.matchScore > acc.matchScore ? r : acc,
      )
      const payload = parseStoredBankTransactionPayload(
        representative.bankRawPayload,
      )

      mismatches.push({
        bankTransactionId: representative.bankTransactionId,
        bankDescription:
          representative.bankDescription ?? payload?.description ?? null,
        bankCounterpartyName:
          representative.bankCounterpartyNameRaw ??
          payload?.counterpartyName ??
          null,
        bankCounterpartyTin: payload?.counterpartyTin ?? null,
        bankAmount: Number(representative.bankAmount),
        bankDirection: representative.bankDirection,
        bankBookedAt: representative.bankBookedAt.toISOString(),
        invoiceDescription: representative.invoiceDescription,
        invoiceCounterpartyName: representative.invoiceCounterpartyName,
        invoiceAmount: Number(representative.invoiceAmount),
        matchScore: representative.matchScore,
        topMatchScore: groupTop,
      })
    }

    const notHighestCount = total - highestCount
    const highestPercentage =
      total === 0 ? 0 : Math.round((highestCount / total) * 100)

    return {
      total,
      highestCount,
      notHighestCount,
      highestPercentage,
      mismatches,
    }
  },
)
