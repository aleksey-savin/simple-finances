import type { Account, Category, Counterparty } from '#/types'
import { create } from 'zustand'

// ─── Store ─────────────────────────────────────────────────────────────────────

type AppState = {
  accounts: Account[]
  categories: Category[]
  counterparties: Counterparty[]
  setAccounts: (accounts: Account[]) => void
  setCategories: (categories: Category[]) => void
  setCounterparties: (counterparties: Counterparty[]) => void
  setAppData: (data: { accounts: Account[]; categories: Category[] }) => void
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  categories: [],
  counterparties: [],

  setAccounts: (accounts) => set({ accounts }),

  setCategories: (categories) => set({ categories }),

  setCounterparties: (counterparties) => set({ counterparties }),

  setAppData: ({ accounts, categories }) => set({ accounts, categories }),
}))

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectAccounts = (state: AppState) => state.accounts
export const selectCategories = (state: AppState) => state.categories
export const selectCounterparties = (state: AppState) => state.counterparties
export const selectExpenseCategories = (state: AppState) =>
  state.categories.filter((c) => c.useForExpenses)
export const selectIncomeCategories = (state: AppState) =>
  state.categories.filter((c) => c.useForIncome)
