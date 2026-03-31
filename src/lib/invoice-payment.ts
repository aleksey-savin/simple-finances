export type SettlementLike = {
  amount: number | string
  settledAt?: Date | string | null
}

export type PaymentState = {
  manualPaid: boolean
  settledAmount: number
  outstandingAmount: number
  effectivePaid: boolean
  effectivePartial: boolean
  status: 'unpaid' | 'partial' | 'paid'
  effectivePaidAt: Date | null
}

export function toMoneyCents(value: number | string | null | undefined) {
  return Math.round(Number(value ?? 0) * 100)
}

export function fromMoneyCents(value: number) {
  return Number((value / 100).toFixed(2))
}

export function getSettledAmount(
  settlements: SettlementLike[] | null | undefined,
) {
  const totalCents = (settlements ?? []).reduce(
    (sum, settlement) => sum + toMoneyCents(settlement.amount),
    0,
  )

  return fromMoneyCents(totalCents)
}

export function getPaymentState(input: {
  amount: number | string
  paidAt: Date | string | null | undefined
  settlements?: SettlementLike[] | null
}) {
  const amountCents = toMoneyCents(input.amount)
  const settledCents = toMoneyCents(getSettledAmount(input.settlements))
  const manualPaid = input.paidAt !== null && input.paidAt !== undefined
  const effectivePaid = manualPaid || settledCents >= amountCents
  const effectivePartial = !manualPaid && settledCents > 0 && !effectivePaid
  const outstandingAmount = manualPaid
    ? 0
    : fromMoneyCents(Math.max(amountCents - settledCents, 0))

  let effectivePaidAt: Date | null = null

  if (manualPaid) {
    effectivePaidAt = new Date(input.paidAt!)
  } else if (effectivePaid) {
    const latestSettledAt = (input.settlements ?? [])
      .map((settlement) =>
        settlement.settledAt ? new Date(settlement.settledAt) : null,
      )
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0]

    effectivePaidAt = latestSettledAt ?? null
  }

  return {
    manualPaid,
    settledAmount: fromMoneyCents(settledCents),
    outstandingAmount,
    effectivePaid,
    effectivePartial,
    status: effectivePaid ? 'paid' : effectivePartial ? 'partial' : 'unpaid',
    effectivePaidAt,
  } satisfies PaymentState
}

export function isInvoiceOpen(input: {
  amount: number | string
  paidAt: Date | string | null | undefined
  settlements?: SettlementLike[] | null
}) {
  return getPaymentState(input).status !== 'paid'
}
