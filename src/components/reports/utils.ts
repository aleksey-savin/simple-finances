import type { ProfitabilityMonthPoint } from '#/types'

export type ProfitabilityBasis = 'cash' | 'accrual'

export type BasisValues = {
  incomeActual: number
  expenseActual: number
  incomePlanned: number
  expensePlanned: number
  /** Realized + forecast. */
  income: number
  expense: number
  net: number
}

/** Resolve a month point to displayed values for the chosen basis (cash/accrual),
 * folding the current-month forecast into the totals. */
export function basisValues(
  point: ProfitabilityMonthPoint,
  basis: ProfitabilityBasis,
): BasisValues {
  const incomeActual = basis === 'cash' ? point.incomeCash : point.incomeAccrual
  const expenseActual =
    basis === 'cash' ? point.expenseCash : point.expenseAccrual
  const incomePlanned =
    basis === 'cash' ? point.plannedIncomeCash : point.plannedIncomeAccrual
  const expensePlanned =
    basis === 'cash' ? point.plannedExpenseCash : point.plannedExpenseAccrual

  const income = incomeActual + incomePlanned
  const expense = expenseActual + expensePlanned

  return {
    incomeActual,
    expenseActual,
    incomePlanned,
    expensePlanned,
    income,
    expense,
    net: income - expense,
  }
}
