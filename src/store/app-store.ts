import { create } from 'zustand'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string }
}

export type Account = {
  id: string
  name: string
  role: string
  members: Member[]
}

export type Category = {
  id: string
  name: string
  useForExpenses: boolean
  useForIncome: boolean
}

// ─── Store ─────────────────────────────────────────────────────────────────────

type AppState = {
  accounts: Account[]
  categories: Category[]
  setAccounts: (accounts: Account[]) => void
  setCategories: (categories: Category[]) => void
  setAppData: (data: { accounts: Account[]; categories: Category[] }) => void
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  categories: [],

  setAccounts: (accounts) => set({ accounts }),

  setCategories: (categories) => set({ categories }),

  setAppData: ({ accounts, categories }) => set({ accounts, categories }),
}))

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectAccounts = (state: AppState) => state.accounts
export const selectCategories = (state: AppState) => state.categories
export const selectExpenseCategories = (state: AppState) =>
  state.categories.filter((c) => c.useForExpenses)
export const selectIncomeCategories = (state: AppState) =>
  state.categories.filter((c) => c.useForIncome)
