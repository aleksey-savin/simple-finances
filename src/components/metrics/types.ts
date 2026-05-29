import type { BankTransactionDirection } from '#/db/types'

export type ScoringMismatchRow = {
  bankTransactionId: string
  bankDescription: string | null
  bankCounterpartyName: string | null
  bankCounterpartyTin: string | null
  bankAmount: number
  bankDirection: BankTransactionDirection
  bankBookedAt: string
  invoiceDescription: string | null
  invoiceCounterpartyName: string | null
  invoiceAmount: number
  matchScore: number
  topMatchScore: number
}

export type ScoringMetricsLoaderData = {
  total: number
  highestCount: number
  notHighestCount: number
  highestPercentage: number
  mismatches: ScoringMismatchRow[]
}
