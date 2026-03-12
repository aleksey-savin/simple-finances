import { useEffect } from 'react'
import {
  useAppStore,
  type Account,
  type Category,
  type Member,
} from '@/store/app-store'

// ─── Loose input types ──────────────────────────────────────────────────────
// Route loaders across the app return varying levels of account/category detail.
// These types represent the minimal common shape each loader guarantees.

type LooseMember = {
  id: string
  role: string
  user: { id: string; name: string; email: string }
}

type LooseAccount = {
  id: string
  name: string
  role?: string
  members?: LooseMember[]
}

type LooseCategory = {
  id: string
  name: string
  useForExpenses?: boolean
  useForIncome?: boolean
}

type SyncData = {
  accounts?: LooseAccount[]
  categories?: LooseCategory[]
}

// ─── Normalizers ────────────────────────────────────────────────────────────

function normalizeAccount(a: LooseAccount): Account {
  return {
    id: a.id,
    name: a.name,
    role: a.role ?? 'viewer',
    members: ((a.members ?? []) as LooseMember[]).map(
      (m): Member => ({
        id: m.id,
        role: m.role,
        user: m.user,
      }),
    ),
  }
}

function normalizeCategory(c: LooseCategory): Category {
  return {
    id: c.id,
    name: c.name,
    useForExpenses: c.useForExpenses ?? false,
    useForIncome: c.useForIncome ?? false,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Syncs accounts and/or categories from a route loader into the global app
 * store. Call this at the top of any route component whose loader returns
 * these resources.
 *
 * Loader shapes vary by route: some return full account objects (with `role`
 * and `members`), others only return `{ id, name }`. This hook normalises
 * every value to the full store shape before writing, filling missing fields
 * with safe defaults (`role: 'viewer'`, `members: []`, etc.).
 *
 * @example
 * function MovementsPage() {
 *   const { accounts, categories } = Route.useLoaderData()
 *   useSyncAppData({ accounts, categories })
 *   // ...
 * }
 */
export function useSyncAppData({ accounts, categories }: SyncData) {
  const setAccounts = useAppStore((s) => s.setAccounts)
  const setCategories = useAppStore((s) => s.setCategories)

  useEffect(() => {
    if (accounts !== undefined) {
      setAccounts(accounts.map(normalizeAccount))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, setAccounts])

  useEffect(() => {
    if (categories !== undefined) {
      setCategories(categories.map(normalizeCategory))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, setCategories])
}
