import type { ImportedBankTransactionView } from '#/components/bank-import/actions'

export function getBankImportEntityLabel(
  direction: ImportedBankTransactionView['direction'],
  mode: 'singular' | 'plural' = 'singular',
) {
  if (direction === 'credit') {
    return mode === 'plural' ? 'доходы' : 'доход'
  }

  return mode === 'plural' ? 'расходы' : 'расход'
}
