import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'

import { db } from '#/db'
import {
  bankTransaction,
  counterparty,
  currentAccount,
  currentAccountUser,
  invoice,
  settlement,
} from '#/db/schema'
import {
  buildBankTransactionImportKey,
  extractDocumentRefs,
  normalizeCounterpartyName,
  parseBankStatement,
  parseStoredBankTransactionPayload,
} from '#/lib/bank-statement'
import {
  fromMoneyCents,
  getPaymentState,
  getSettledAmount,
  toMoneyCents,
} from '#/lib/invoice-payment'
import { auth } from 'utils/auth'
import {
  getScopedCounterpartyIds,
  resolveSelectedScope,
} from '#/lib/company-scope'

const importBankStatementSchema = z.object({
  currentAccountId: z.string().min(1),
  content: z.string().min(1),
})

const fetchImportedBankTransactionsSchema = z.object({
  currentAccountId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .number()
    .int()
    .refine((value) => [25, 50, 100].includes(value), {
      message: 'Недопустимый размер страницы',
    })
    .default(25),
  search: z.string().trim().default(''),
  direction: z.enum(['all', 'credit', 'debit']).default('all'),
  status: z.enum(['all', 'matched', 'partial', 'unmatched']).default('all'),
})

const refreshImportedTransactionSchema = z.object({
  bankTransactionId: z.string(),
})

const attachBankTransactionSchema = z.object({
  bankTransactionId: z.string(),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().min(1),
        amount: z.number().min(0.01),
      }),
    )
    .min(1),
})

const createInvoiceFromTransactionSchema = z.object({
  bankTransactionId: z.string(),
  amount: z.number().min(0.01).optional(),
  description: z.string().min(2),
  categoryId: z.string().min(1),
  counterpartyId: z.string().optional(),
})

const deleteBankTransactionSchema = z.object({
  bankTransactionId: z.string(),
})

const unlinkBankTransactionSettlementSchema = z.object({
  settlementId: z.string(),
})

export type BankImportContext = Awaited<
  ReturnType<typeof fetchBankImportContext>
>
export type ImportedBankTransactionView = Awaited<
  ReturnType<typeof importBankStatement>
>[number]

export const fetchBankImportContext = createServerFn().handler(async () => {
  const request = getRequest()
  const { userId } = await requireSessionUser()
  const { selectedScope, accountIds } = await resolveSelectedScope(
    userId,
    request.headers,
  ).then((result) => ({
    selectedScope: result.selectedScope,
    accountIds: result.selectedScope.accountIds,
  }))
  const latestImportedAt = sql<Date | null>`max(${bankTransaction.bookedAt})`

  const [accounts, categories, counterparties] = await Promise.all([
    accountIds.length
      ? db
          .select({
            id: currentAccount.id,
            name: currentAccount.name,
            bankNameInitials: currentAccount.bankNameInitials,
            balance: currentAccount.balance,
            acceptPayments: currentAccount.acceptPayments,
            lastImportedAt: latestImportedAt,
          })
          .from(currentAccount)
          .leftJoin(
            bankTransaction,
            eq(bankTransaction.currentAccountId, currentAccount.id),
          )
          .where(inArray(currentAccount.id, accountIds))
          .groupBy(
            currentAccount.id,
            currentAccount.name,
            currentAccount.bankNameInitials,
            currentAccount.balance,
            currentAccount.acceptPayments,
          )
          .orderBy(asc(currentAccount.name))
      : [],
    db.query.category.findMany({
      columns: {
        id: true,
        name: true,
        useForExpenses: true,
        useForIncome: true,
        isShared: true,
      },
      orderBy: (table, { asc }) => asc(table.name),
    }),
    getScopedCounterpartyIds(userId, selectedScope).then((ids) =>
      ids.length > 0
        ? db.query.counterparty.findMany({
            where: inArray(counterparty.id, ids),
            columns: { id: true, name: true, tin: true },
            orderBy: (t, { asc }) => asc(t.name),
          })
        : [],
    ),
  ])

  return { accounts, categories, counterparties }
})

export const importBankStatement = createServerFn({ method: 'POST' })
  .inputValidator(importBankStatementSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireSessionUser()
    await assertAccountAccess(data.currentAccountId, userId)

    const selectedAccount = await db.query.currentAccount.findFirst({
      where: eq(currentAccount.id, data.currentAccountId),
      columns: {
        id: true,
        accountNumber: true,
      },
    })

    if (!selectedAccount) {
      throw new Error('Выбранный счёт не найден')
    }

    const parsed = parseBankStatement(data.content)
    const statementAccountNumber = normalizeAccountNumber(parsed.accountNumber)
    const selectedAccountNumber = normalizeAccountNumber(
      selectedAccount.accountNumber,
    )

    if (!selectedAccountNumber) {
      throw new Error('У выбранного счёта не заполнен номер расчётного счёта')
    }

    if (!statementAccountNumber) {
      throw new Error('В выписке не найден реквизит РасчСчет')
    }

    if (statementAccountNumber !== selectedAccountNumber) {
      throw new Error(
        `Номер счёта в выписке (${statementAccountNumber}) не совпадает с выбранным счётом (${selectedAccountNumber})`,
      )
    }

    if (parsed.documents.length === 0) {
      throw new Error('Выписка не содержит документов')
    }

    const existingTransactions = await db.query.bankTransaction.findMany({
      where: eq(bankTransaction.currentAccountId, data.currentAccountId),
      columns: {
        externalId: true,
        rawPayload: true,
      },
    })

    const existingExternalIds = new Set<string>()

    for (const row of existingTransactions) {
      const payload = parseStoredBankTransactionPayload(row.rawPayload)
      if (payload) {
        existingExternalIds.add(
          buildBankTransactionImportKey({
            documentNumber: payload.documentNumber,
            documentDate: payload.documentDate,
            bookedAt: payload.bookedAt,
            amount: payload.amount,
            direction: payload.direction,
            accountNumber: payload.accountNumber,
            counterpartyName: payload.counterpartyName,
            description: payload.description,
          }),
        )
        continue
      }

      if (row.externalId) {
        existingExternalIds.add(row.externalId)
      }
    }

    const importedIds = await db.transaction(async (tx) => {
      const nextIds: string[] = []
      const seenExternalIds = new Set<string>()
      let balanceDelta = 0

      for (const document of parsed.documents) {
        const importKey = buildBankTransactionImportKey({
          documentNumber: document.documentNumber,
          documentDate: document.documentDate,
          bookedAt: document.bookedAt,
          amount: document.amount,
          direction: document.direction,
          accountNumber: document.accountNumber,
          counterpartyName: document.counterpartyName,
          description: document.description,
        })

        if (
          existingExternalIds.has(importKey) ||
          seenExternalIds.has(importKey)
        ) {
          continue
        }

        seenExternalIds.add(importKey)

        const payload = JSON.stringify(document)
        const [created] = await tx
          .insert(bankTransaction)
          .values({
            currentAccountId: data.currentAccountId,
            direction: document.direction,
            amount: document.amount,
            currency: 'RUB',
            bookedAt: document.bookedAt,
            valueDate: document.valueDate,
            description: document.description,
            counterpartyNameRaw: document.counterpartyName,
            externalId: importKey,
            rawPayload: payload,
          })
          .onConflictDoNothing({
            target: [
              bankTransaction.currentAccountId,
              bankTransaction.externalId,
            ],
          })
          .returning({ id: bankTransaction.id })

        if (!created) {
          continue
        }

        existingExternalIds.add(importKey)
        balanceDelta +=
          document.direction === 'credit'
            ? Number(document.amount)
            : -Number(document.amount)

        nextIds.push(created.id)
      }

      if (balanceDelta !== 0) {
        await tx
          .update(currentAccount)
          .set({
            balance: sql`${currentAccount.balance} + ${balanceDelta.toFixed(2)}::numeric`,
            updatedBy: userId,
          })
          .where(eq(currentAccount.id, data.currentAccountId))
      }

      return nextIds
    })

    const rows = await Promise.all(importedIds.map((id) => buildImportRow(id)))

    return rows.sort(
      (left, right) =>
        new Date(right.bookedAt).getTime() - new Date(left.bookedAt).getTime(),
    )
  })

export const fetchImportedBankTransactions = createServerFn({ method: 'POST' })
  .inputValidator(fetchImportedBankTransactionsSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireSessionUser()
    await assertAccountAccess(data.currentAccountId, userId)

    return listImportedBankTransactions(
      data.currentAccountId,
      data.page,
      data.pageSize,
      data.search,
      data.direction,
      data.status,
    )
  })

export const refreshImportedTransaction = createServerFn({ method: 'POST' })
  .inputValidator(refreshImportedTransactionSchema)
  .handler(async ({ data }) => {
    await requireSessionUser()
    return buildImportRow(data.bankTransactionId)
  })

export const attachBankTransaction = createServerFn({ method: 'POST' })
  .inputValidator(attachBankTransactionSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireSessionUser()

    await db.transaction(async (tx) => {
      const bankRow = await tx.query.bankTransaction.findFirst({
        where: eq(bankTransaction.id, data.bankTransactionId),
        with: {
          settlements: {
            columns: { amount: true },
          },
        },
      })

      if (!bankRow) throw new Error('Банковская транзакция не найдена')

      await assertAccountAccess(bankRow.currentAccountId, userId)

      const bankAmountCents = toMoneyCents(bankRow.amount)
      const alreadyAllocatedCents = toMoneyCents(
        getSettledAmount(bankRow.settlements),
      )
      const requestedCents = data.allocations.reduce(
        (sum, allocation) => sum + toMoneyCents(allocation.amount),
        0,
      )

      if (alreadyAllocatedCents + requestedCents > bankAmountCents) {
        throw new Error('Сумма распределения превышает остаток транзакции')
      }

      const invoiceIds = [
        ...new Set(data.allocations.map((item) => item.invoiceId)),
      ]
      if (invoiceIds.length !== data.allocations.length) {
        throw new Error('Один invoice нельзя выбрать дважды в одной операции')
      }

      const invoiceRows = await tx.query.invoice.findMany({
        where: inArray(invoice.id, invoiceIds),
        with: {
          settlements: {
            columns: { amount: true, settledAt: true },
          },
        },
      })

      const invoiceById = new Map(invoiceRows.map((row) => [row.id, row]))
      const expectedKind =
        bankRow.direction === 'credit' ? 'receivable' : 'payable'

      for (const allocation of data.allocations) {
        const invoiceRow = invoiceById.get(allocation.invoiceId)

        if (!invoiceRow) throw new Error('Один из invoice не найден')
        if (invoiceRow.currentAccountId !== bankRow.currentAccountId) {
          throw new Error('Invoice принадлежит другому счёту')
        }
        if (invoiceRow.kind !== expectedKind) {
          throw new Error('Направление транзакции не совпадает с типом invoice')
        }
        if (invoiceRow.archivedAt) {
          throw new Error('Архивный invoice нельзя использовать для разнесения')
        }
        if (invoiceRow.paidAt) {
          throw new Error('Вручную оплаченный invoice не доступен для матчинга')
        }

        const state = getPaymentState({
          amount: invoiceRow.amount,
          paidAt: invoiceRow.paidAt,
          settlements: invoiceRow.settlements,
        })

        if (
          toMoneyCents(allocation.amount) >
          toMoneyCents(state.outstandingAmount)
        ) {
          throw new Error('Сумма распределения превышает остаток invoice')
        }
      }

      for (const allocation of data.allocations) {
        const invoiceRow = invoiceById.get(allocation.invoiceId)!

        await tx.insert(settlement).values({
          invoiceId: invoiceRow.id,
          bankTransactionId: bankRow.id,
          amount: allocation.amount.toFixed(2),
          settledAt: bankRow.bookedAt,
        })

        const refreshedSettlements = [
          ...invoiceRow.settlements,
          {
            amount: allocation.amount.toFixed(2),
            settledAt: bankRow.bookedAt,
          },
        ]
        const state = getPaymentState({
          amount: invoiceRow.amount,
          paidAt: invoiceRow.paidAt,
          settlements: refreshedSettlements,
        })

        if (state.status === 'paid' && !invoiceRow.paidAt) {
          await tx
            .update(invoice)
            .set({ paidAt: bankRow.bookedAt, updatedBy: userId })
            .where(eq(invoice.id, invoiceRow.id))
        }
      }
    })

    return buildImportRow(data.bankTransactionId)
  })

export const createInvoiceFromBankTransaction = createServerFn({
  method: 'POST',
})
  .inputValidator(createInvoiceFromTransactionSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireSessionUser()

    await db.transaction(async (tx) => {
      const bankRow = await tx.query.bankTransaction.findFirst({
        where: eq(bankTransaction.id, data.bankTransactionId),
        with: {
          settlements: {
            columns: { amount: true },
          },
        },
      })

      if (!bankRow) throw new Error('Банковская транзакция не найдена')
      await assertAccountAccess(bankRow.currentAccountId, userId)

      const bankAmountCents = toMoneyCents(bankRow.amount)
      const allocatedCents = toMoneyCents(getSettledAmount(bankRow.settlements))
      const remainingCents = Math.max(bankAmountCents - allocatedCents, 0)
      const requestedCents =
        data.amount !== undefined ? toMoneyCents(data.amount) : remainingCents

      if (requestedCents <= 0) {
        throw new Error('В транзакции не осталось свободной суммы')
      }
      if (requestedCents > remainingCents) {
        throw new Error('Сумма нового invoice превышает остаток транзакции')
      }

      const newInvoiceAmount = fromMoneyCents(requestedCents).toFixed(2)
      const kind = bankRow.direction === 'credit' ? 'receivable' : 'payable'

      const [created] = await tx
        .insert(invoice)
        .values({
          kind,
          amount: newInvoiceAmount,
          description: data.description,
          categoryId: data.categoryId,
          currentAccountId: bankRow.currentAccountId,
          counterpartyId: data.counterpartyId || null,
          createdAt: bankRow.bookedAt,
          paidAt: bankRow.bookedAt,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: invoice.id })

      await tx.insert(settlement).values({
        invoiceId: created.id,
        bankTransactionId: bankRow.id,
        amount: newInvoiceAmount,
        settledAt: bankRow.bookedAt,
      })
    })

    return buildImportRow(data.bankTransactionId)
  })

export const deleteBankTransaction = createServerFn({ method: 'POST' })
  .inputValidator(deleteBankTransactionSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireSessionUser()

    await db.transaction(async (tx) => {
      const bankRow = await tx.query.bankTransaction.findFirst({
        where: eq(bankTransaction.id, data.bankTransactionId),
        with: {
          settlements: {
            columns: { id: true },
          },
        },
      })

      if (!bankRow) {
        throw new Error('Банковская транзакция не найдена')
      }

      await assertAccountAccess(bankRow.currentAccountId, userId)

      if (bankRow.settlements.length > 0) {
        throw new Error('Нельзя удалить уже разнесённую банковскую транзакцию')
      }

      const signedAmount =
        bankRow.direction === 'credit'
          ? -Number(bankRow.amount)
          : Number(bankRow.amount)

      await tx
        .update(currentAccount)
        .set({
          balance: sql`${currentAccount.balance} + ${signedAmount.toFixed(2)}::numeric`,
          updatedBy: userId,
        })
        .where(eq(currentAccount.id, bankRow.currentAccountId))

      await tx
        .delete(bankTransaction)
        .where(eq(bankTransaction.id, data.bankTransactionId))
    })

    return { ok: true }
  })

export const unlinkBankTransactionSettlement = createServerFn({
  method: 'POST',
})
  .inputValidator(unlinkBankTransactionSettlementSchema)
  .handler(async ({ data }) => {
    const { userId } = await requireSessionUser()

    await db.transaction(async (tx) => {
      const settlementRow = await tx.query.settlement.findFirst({
        where: eq(settlement.id, data.settlementId),
        with: {
          bankTransaction: {
            columns: {
              currentAccountId: true,
            },
          },
          invoice: {
            columns: {
              id: true,
              amount: true,
              paidAt: true,
            },
            with: {
              settlements: {
                columns: {
                  id: true,
                  amount: true,
                  settledAt: true,
                },
              },
            },
          },
        },
      })

      if (!settlementRow) {
        throw new Error('Привязка не найдена')
      }

      await assertAccountAccess(
        settlementRow.bankTransaction.currentAccountId,
        userId,
      )

      await tx.delete(settlement).where(eq(settlement.id, data.settlementId))

      const remainingSettlements = settlementRow.invoice.settlements.filter(
        (item) => item.id !== settlementRow.id,
      )
      const nextState = getPaymentState({
        amount: settlementRow.invoice.amount,
        paidAt: null,
        settlements: remainingSettlements,
      })

      if (settlementRow.invoice.paidAt) {
        await tx
          .update(invoice)
          .set({
            paidAt:
              nextState.status === 'paid' ? nextState.effectivePaidAt : null,
            updatedBy: userId,
          })
          .where(eq(invoice.id, settlementRow.invoice.id))
      }
    })

    return { ok: true }
  })

async function buildImportRow(bankTransactionId: string) {
  const row = await db.query.bankTransaction.findFirst({
    where: eq(bankTransaction.id, bankTransactionId),
    with: {
      currentAccount: {
        columns: { id: true, name: true },
      },
      settlements: {
        columns: { id: true, amount: true, settledAt: true },
        with: {
          invoice: {
            columns: {
              id: true,
              description: true,
              amount: true,
              paidAt: true,
            },
            with: {
              counterparty: { columns: { id: true, name: true } },
              settlements: {
                columns: { amount: true, settledAt: true },
              },
            },
          },
        },
      },
    },
  })

  if (!row) throw new Error('Банковская транзакция не найдена')

  const payload = parseStoredBankTransactionPayload(row.rawPayload)
  const matchedAmount = getSettledAmount(row.settlements)
  const remainingAmount = fromMoneyCents(
    Math.max(toMoneyCents(row.amount) - toMoneyCents(matchedAmount), 0),
  )
  const status =
    remainingAmount <= 0
      ? 'matched'
      : matchedAmount > 0
        ? 'partial'
        : 'unmatched'

  return {
    id: row.id,
    currentAccount: row.currentAccount,
    direction: row.direction,
    amount: Number(row.amount),
    currency: row.currency,
    bookedAt: row.bookedAt.toISOString(),
    valueDate: row.valueDate?.toISOString() ?? null,
    description: row.description ?? payload?.description ?? null,
    counterpartyName:
      row.counterpartyNameRaw ?? payload?.counterpartyName ?? null,
    counterpartyTin: payload?.counterpartyTin ?? null,
    documentType: payload?.documentType ?? null,
    documentNumber: payload?.documentNumber ?? null,
    matchedAmount,
    remainingAmount,
    status,
    settlements: row.settlements.map((item) => {
      const invoiceState = getPaymentState({
        amount: item.invoice.amount,
        paidAt: item.invoice.paidAt,
        settlements: item.invoice.settlements,
      })

      return {
        id: item.id,
        amount: Number(item.amount),
        settledAt: item.settledAt.toISOString(),
        invoiceId: item.invoice.id,
        invoiceDescription: item.invoice.description,
        invoiceAmount: Number(item.invoice.amount),
        invoiceStatus: invoiceState.status,
        counterpartyName: item.invoice.counterparty?.name ?? null,
      }
    }),
    suggestedInvoices: await findMatchingInvoices(row.id, payload),
  }
}

async function listImportedBankTransactions(
  currentAccountId: string,
  page: number,
  pageSize: number,
  search: string,
  direction: 'all' | 'credit' | 'debit',
  status: 'all' | 'matched' | 'partial' | 'unmatched',
) {
  const normalizedSearch = search.trim()
  const settledAmountSql = sql`
    coalesce(
      (
        select sum("settlement"."amount")
        from "settlement"
        where "settlement"."bank_transaction_id" = "bank_transaction"."id"
      ),
      0
    )
  `
  const conditions = [eq(bankTransaction.currentAccountId, currentAccountId)]

  if (direction !== 'all') {
    conditions.push(eq(bankTransaction.direction, direction))
  }

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`
    conditions.push(
      or(
        ilike(bankTransaction.description, pattern),
        ilike(bankTransaction.counterpartyNameRaw, pattern),
        ilike(bankTransaction.externalId, pattern),
        ilike(bankTransaction.rawPayload, pattern),
      )!,
    )
  }

  if (status === 'matched') {
    conditions.push(sql`${settledAmountSql} >= ${bankTransaction.amount}`)
  } else if (status === 'partial') {
    conditions.push(
      sql`${settledAmountSql} > 0 and ${settledAmountSql} < ${bankTransaction.amount}`,
    )
  } else if (status === 'unmatched') {
    conditions.push(sql`${settledAmountSql} = 0`)
  }

  const where = and(...conditions)
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bankTransaction)
    .where(where)

  const total = Number(countRow?.count ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const offset = (safePage - 1) * pageSize

  const rows = await db
    .select({ id: bankTransaction.id })
    .from(bankTransaction)
    .where(where)
    .orderBy(desc(bankTransaction.bookedAt), desc(bankTransaction.createdAt))
    .limit(pageSize)
    .offset(offset)

  const items = await Promise.all(rows.map((row) => buildImportRow(row.id)))

  return {
    rows: items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

async function findMatchingInvoices(
  bankTransactionId: string,
  payload?: Awaited<ReturnType<typeof loadTransactionPayload>>,
) {
  const resolvedPayload =
    payload ?? (await loadTransactionPayload(bankTransactionId))
  const transaction = await db.query.bankTransaction.findFirst({
    where: eq(bankTransaction.id, bankTransactionId),
    columns: {
      id: true,
      amount: true,
      currentAccountId: true,
      direction: true,
      bookedAt: true,
    },
  })

  if (!transaction) throw new Error('Банковская транзакция не найдена')

  const expectedKind =
    transaction.direction === 'credit' ? 'receivable' : 'payable'

  const invoiceRows = await db.query.invoice.findMany({
    where: and(
      eq(invoice.currentAccountId, transaction.currentAccountId),
      eq(invoice.kind, expectedKind),
      isNull(invoice.archivedAt),
      isNull(invoice.paidAt),
    ),
    with: {
      counterparty: {
        columns: { id: true, name: true, tin: true },
      },
      settlements: {
        columns: { amount: true, settledAt: true },
      },
      category: {
        columns: { id: true, name: true },
      },
    },
    orderBy: (table) => [asc(table.createdAt)],
  })

  const targetAmountCents = toMoneyCents(transaction.amount)
  const normalizedCounterparty = normalizeCounterpartyName(
    resolvedPayload?.counterpartyName ?? '',
  )
  const refs = extractDocumentRefs(resolvedPayload?.description)

  return invoiceRows
    .map((invoiceRow) => {
      const state = getPaymentState({
        amount: invoiceRow.amount,
        paidAt: invoiceRow.paidAt,
        settlements: invoiceRow.settlements,
      })

      if (state.outstandingAmount <= 0) return null

      const reasons: string[] = []
      let score = 0
      const outstandingCents = toMoneyCents(state.outstandingAmount)
      const normalizedInvoiceCounterparty = normalizeCounterpartyName(
        invoiceRow.counterparty?.name,
      )

      if (
        resolvedPayload?.counterpartyTin &&
        invoiceRow.counterparty?.tin &&
        resolvedPayload.counterpartyTin === invoiceRow.counterparty.tin
      ) {
        score += 80
        reasons.push('совпадает ИНН контрагента')
      }

      if (
        normalizedCounterparty &&
        normalizedInvoiceCounterparty &&
        (normalizedCounterparty.includes(normalizedInvoiceCounterparty) ||
          normalizedInvoiceCounterparty.includes(normalizedCounterparty))
      ) {
        score += 40
        reasons.push('совпадает контрагент')
      }

      if (outstandingCents === targetAmountCents) {
        score += 35
        reasons.push('точное совпадение суммы')
      }

      if (outstandingCents > targetAmountCents) {
        score += 10
        reasons.push('доход/расход может быть частично закрыт')
      }

      if (
        resolvedPayload?.description &&
        invoiceRow.description &&
        normalizeCounterpartyName(resolvedPayload.description).includes(
          normalizeCounterpartyName(invoiceRow.description),
        )
      ) {
        score += 15
        reasons.push('назначение похоже на описание документа')
      }

      if (
        refs.length > 0 &&
        refs.some((ref) => invoiceRow.description.toLowerCase().includes(ref))
      ) {
        score += 25
        reasons.push('найден номер документа в назначении')
      }

      const dateDistanceDays = Math.abs(
        Math.round(
          (transaction.bookedAt.getTime() - invoiceRow.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
      if (dateDistanceDays <= 14) {
        score += 10
        reasons.push('даты близки')
      }

      return {
        id: invoiceRow.id,
        description: invoiceRow.description,
        amount: Number(invoiceRow.amount),
        outstandingAmount: state.outstandingAmount,
        settledAmount: state.settledAmount,
        createdAt: invoiceRow.createdAt.toISOString(),
        dueDate: invoiceRow.dueDate?.toISOString() ?? null,
        counterpartyId: invoiceRow.counterparty?.id ?? null,
        counterpartyName: invoiceRow.counterparty?.name ?? null,
        categoryName: invoiceRow.category.name,
        score,
        reasons,
      }
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
}

async function loadTransactionPayload(bankTransactionId: string) {
  const row = await db.query.bankTransaction.findFirst({
    where: eq(bankTransaction.id, bankTransactionId),
    columns: { rawPayload: true },
  })

  return parseStoredBankTransactionPayload(row?.rawPayload)
}

async function requireSessionUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    throw new Error('Не авторизован')
  }

  return { userId: session.user.id }
}

async function assertAccountAccess(currentAccountId: string, userId: string) {
  const membership = await db.query.currentAccountUser.findFirst({
    where: and(
      eq(currentAccountUser.currentAccountId, currentAccountId),
      eq(currentAccountUser.userId, userId),
    ),
    columns: { id: true },
  })

  if (!membership) {
    throw new Error('Нет доступа к выбранному счёту')
  }
}

function normalizeAccountNumber(value: string | number | null | undefined) {
  const normalized = String(value ?? '')
    .replace(/\D/g, '')
    .trim()

  return normalized.length > 0 ? normalized : null
}
