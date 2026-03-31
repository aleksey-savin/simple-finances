import type { BankTransactionDirection } from '#/db/types'

export type ParsedBankStatement = {
  accountNumber: string | null
  startedAt: Date | null
  endedAt: Date | null
  documents: ParsedBankStatementDocument[]
}

export type ParsedBankStatementDocument = {
  documentType: string
  documentNumber: string | null
  documentDate: Date | null
  accountNumber: string | null
  direction: BankTransactionDirection
  amount: string
  bookedAt: Date
  valueDate: Date | null
  description: string | null
  counterpartyName: string | null
  counterpartyTin: string | null
  counterpartyAccount: string | null
  payerName: string | null
  payerTin: string | null
  payerAccount: string | null
  recipientName: string | null
  recipientTin: string | null
  recipientAccount: string | null
  externalId: string
  rawFields: Record<string, string>
}

const DOC_START = 'СекцияДокумент='
const DOC_END = 'КонецДокумента'

export function parseBankStatement(text: string): ParsedBankStatement {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const headerFields: Record<string, string> = {}
  const documents: ParsedBankStatementDocument[] = []

  let activeDocument: Record<string, string> | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith(DOC_START)) {
      activeDocument = {
        СекцияДокумент: line.slice(DOC_START.length),
      }
      continue
    }

    if (line === DOC_END) {
      if (activeDocument) {
        documents.push(buildDocument(activeDocument, headerFields.РасчСчет))
        activeDocument = null
      }
      continue
    }

    const delimiterIndex = line.indexOf('=')
    if (delimiterIndex === -1) continue

    const key = line.slice(0, delimiterIndex)
    const value = line.slice(delimiterIndex + 1)

    if (activeDocument) {
      activeDocument[key] = value
    } else {
      headerFields[key] = value
    }
  }

  return {
    accountNumber: emptyToNull(headerFields.РасчСчет),
    startedAt: parseStatementDate(headerFields.ДатаНачала),
    endedAt: parseStatementDate(headerFields.ДатаКонца),
    documents,
  }
}

export function parseStoredBankTransactionPayload(
  rawPayload: string | null | undefined,
) {
  if (!rawPayload) return null

  try {
    return JSON.parse(rawPayload) as ParsedBankStatementDocument
  } catch {
    return null
  }
}

export function normalizeCounterpartyName(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/["«»]/g, '')
    .replace(/\b(общество с ограниченной ответственностью|ооо)\b/g, '')
    .replace(/\b(индивидуальный предприниматель|ип)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractDocumentRefs(value: string | null | undefined) {
  const refs = new Set<string>()
  const source = value ?? ''
  const patterns = [
    /(?:сч(?:е|ё)т(?:у)?|сч\.?|упд|акт(?:у)?|согласно сч[её]ту)\s*№?\s*([A-Za-zА-Яа-я0-9/-]+)/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(source)) !== null) {
      refs.add(match[1].toLowerCase())
    }
  }

  return [...refs]
}

export function normalizeBankDocumentNumber(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function buildDocument(
  fields: Record<string, string>,
  statementAccountNumber?: string,
): ParsedBankStatementDocument {
  const direction = inferDirection(fields, statementAccountNumber)
  const bookedAt =
    parseStatementDate(
      direction === 'credit' ? fields.ДатаПоступило : fields.ДатаСписано,
    ) ??
    parseStatementDate(fields.Дата) ??
    new Date()

  const valueDate = parseStatementDate(fields.Дата)
  const amount = normalizeAmount(fields.Сумма)
  const accountNumber =
    emptyToNull(statementAccountNumber) ??
    emptyToNull(fields.ПлательщикСчет) ??
    emptyToNull(fields.ПолучательСчет)

  const payerName = emptyToNull(fields.Плательщик)
  const payerTin = normalizeTin(fields.ПлательщикИНН)
  const payerAccount = emptyToNull(
    fields.ПлательщикРасчСчет ?? fields.ПлательщикСчет,
  )
  const recipientName = emptyToNull(fields.Получатель)
  const recipientTin = normalizeTin(fields.ПолучательИНН)
  const recipientAccount = emptyToNull(
    fields.ПолучательРасчСчет ?? fields.ПолучательСчет,
  )

  const counterpartyName = direction === 'credit' ? payerName : recipientName
  const counterpartyTin = direction === 'credit' ? payerTin : recipientTin
  const counterpartyAccount =
    direction === 'credit' ? payerAccount : recipientAccount
  const documentNumber = normalizeBankDocumentNumber(fields.Номер)

  return {
    documentType: fields.СекцияДокумент ?? 'Документ',
    documentNumber,
    documentDate: parseStatementDate(fields.Дата),
    accountNumber,
    direction,
    amount,
    bookedAt,
    valueDate,
    description: emptyToNull(fields.НазначениеПлатежа),
    counterpartyName,
    counterpartyTin,
    counterpartyAccount,
    payerName,
    payerTin,
    payerAccount,
    recipientName,
    recipientTin,
    recipientAccount,
    externalId: buildExternalId({
      documentNumber,
      accountNumber,
      direction,
      amount,
      bookedAt,
      counterpartyName,
      description: fields.НазначениеПлатежа,
    }),
    rawFields: fields,
  }
}

function inferDirection(
  fields: Record<string, string>,
  statementAccountNumber?: string,
): BankTransactionDirection {
  if (fields.ДатаПоступило) return 'credit'
  if (fields.ДатаСписано) return 'debit'

  const statementAccount =
    emptyToNull(statementAccountNumber) ?? emptyToNull(fields.РасчСчет)
  const payerAccount = emptyToNull(
    fields.ПлательщикРасчСчет ?? fields.ПлательщикСчет,
  )
  const recipientAccount = emptyToNull(
    fields.ПолучательРасчСчет ?? fields.ПолучательСчет,
  )

  if (statementAccount && recipientAccount === statementAccount) return 'credit'
  if (statementAccount && payerAccount === statementAccount) return 'debit'

  return 'debit'
}

function buildExternalId(input: {
  accountNumber: string | null
  direction: BankTransactionDirection
  amount: string
  bookedAt: Date
  documentNumber?: string
  counterpartyName?: string | null
  description?: string | null
}) {
  const documentNumber = normalizeBankDocumentNumber(input.documentNumber)
  if (documentNumber) {
    return `doc:${documentNumber}`
  }

  const payload = [
    input.accountNumber ?? '',
    input.direction,
    input.amount,
    input.bookedAt.toISOString().slice(0, 10),
    normalizeCounterpartyName(input.counterpartyName),
    (input.description ?? '').trim().toLowerCase(),
  ].join('|')

  let hash = 2166136261

  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `tx_${Math.abs(hash).toString(16)}`
}

function parseStatementDate(value: string | null | undefined) {
  if (!value) return null

  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null

  const [, dd, mm, yyyy] = match
  return new Date(`${yyyy}-${mm}-${dd}T12:00:00.000Z`)
}

function normalizeAmount(value: string | null | undefined) {
  return Number(value ?? 0).toFixed(2)
}

function normalizeTin(value: string | null | undefined) {
  const normalized = (value ?? '').replace(/\D/g, '')
  return normalized.length > 0 ? normalized : null
}

function emptyToNull(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}
