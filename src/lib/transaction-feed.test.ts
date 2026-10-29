import { describe, expect, it } from 'vitest'

import type { Invoice, TransactionFeedItem } from '#/types'

import {
  computeDayTotals,
  getFeedDateKey,
  getInvoiceStatus,
} from './transaction-feed'

type StatusInput = Parameters<typeof getInvoiceStatus>[0]

const money = (n: number) =>
  n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

function status(over: Partial<StatusInput> = {}): StatusInput {
  return {
    paymentStatus: 'unpaid',
    paidAt: null,
    dueDate: null,
    archivedAt: null,
    amount: '100000',
    settledAmount: 0,
    ...over,
  }
}

function invoice(
  kind: 'payable' | 'receivable',
  amount: number,
  paymentStatus: 'unpaid' | 'partial' | 'paid',
  createdAt: Date,
): TransactionFeedItem {
  return {
    kind,
    amount: String(amount),
    paymentStatus,
    createdAt,
  } as unknown as Invoice
}

function transfer(amount: number, transferredAt: Date): TransactionFeedItem {
  return {
    kind: 'transfer',
    amount: String(amount),
    transferredAt,
    createdAt: transferredAt,
  } as unknown as TransactionFeedItem
}

const now = new Date(2026, 9, 29, 12, 0)
const day = new Date(2026, 9, 28, 12, 0)

describe('getInvoiceStatus', () => {
  it('paid → positive «Оплачено 12.10.2026»', () => {
    expect(
      getInvoiceStatus(
        status({
          paymentStatus: 'paid',
          paidAt: new Date(2026, 9, 12, 12, 0),
        }),
        now,
      ),
    ).toEqual({ tone: 'positive', label: 'Оплачено 12.10.2026' })
  })

  it('partial overdue → pending «Частично 50 000,00 из 100 000,00»', () => {
    expect(
      getInvoiceStatus(
        status({
          paymentStatus: 'partial',
          settledAmount: 50000,
          dueDate: new Date(2026, 9, 1, 12, 0),
        }),
        now,
      ),
    ).toEqual({
      tone: 'pending',
      label: `Частично ${money(50000)} из ${money(100000)}`,
    })
  })

  it('archived unpaid → neutral «В архиве»', () => {
    expect(
      getInvoiceStatus(status({ archivedAt: new Date(2026, 8, 1) }), now),
    ).toEqual({ tone: 'neutral', label: 'В архиве' })
  })

  it('overdue → danger «Просрочен · до 20.10.2026»', () => {
    expect(
      getInvoiceStatus(status({ dueDate: new Date(2026, 9, 20, 12, 0) }), now),
    ).toEqual({ tone: 'danger', label: 'Просрочен · до 20.10.2026' })
  })

  it('due in future → pending «до 05.11.2026»', () => {
    expect(
      getInvoiceStatus(status({ dueDate: new Date(2026, 10, 5, 12, 0) }), now),
    ).toEqual({ tone: 'pending', label: 'до 05.11.2026' })
  })

  it('due today → pending «до 29.10.2026»', () => {
    expect(
      getInvoiceStatus(
        status({ dueDate: new Date(2026, 9, 29, 0, 0) }),
        new Date(2026, 9, 29, 15, 0),
      ),
    ).toEqual({ tone: 'pending', label: 'до 29.10.2026' })
  })

  it('paid without paidAt → positive «Оплачено»', () => {
    expect(
      getInvoiceStatus(status({ paymentStatus: 'paid', paidAt: null }), now),
    ).toEqual({ tone: 'positive', label: 'Оплачено' })
  })

  it('no due date → pending «Ждёт оплаты»', () => {
    expect(getInvoiceStatus(status(), now)).toEqual({
      tone: 'pending',
      label: 'Ждёт оплаты',
    })
  })
})

describe('computeDayTotals', () => {
  it('paid receivable 184000 + unpaid payable 95000 on 2026-10-28 → 184000', () => {
    const feed = [
      invoice('receivable', 184000, 'paid', day),
      invoice('payable', 95000, 'unpaid', day),
    ]
    expect(computeDayTotals(feed).get('2026-10-28')).toBe(184000)
  })

  it('transfers ignored; day of only transfers is absent', () => {
    const feed = [transfer(50000, day)]
    expect(computeDayTotals(feed).has('2026-10-28')).toBe(false)
    expect(computeDayTotals(feed).size).toBe(0)
  })

  it('day with only unpaid invoices is absent', () => {
    const feed = [
      invoice('receivable', 1000, 'unpaid', day),
      invoice('payable', 500, 'partial', day),
    ]
    expect(computeDayTotals(feed).has('2026-10-28')).toBe(false)
  })

  it('paid payable 612400 + paid receivable 420000 → −192400', () => {
    const feed = [
      invoice('payable', 612400, 'paid', day),
      invoice('receivable', 420000, 'paid', day),
    ]
    expect(computeDayTotals(feed).get('2026-10-28')).toBe(-192400)
  })

  it('computeDayTotals is computed over the whole feed, not a page', () => {
    const feed = [
      invoice('receivable', 100, 'paid', day),
      invoice('receivable', 200, 'paid', day),
      invoice('receivable', 400, 'paid', day),
    ]
    expect(getFeedDateKey(feed[0])).toBe('2026-10-28')
    expect(computeDayTotals(feed).get('2026-10-28')).toBe(700)
    expect(computeDayTotals(feed.slice(0, 2)).get('2026-10-28')).toBe(300)
  })
})
