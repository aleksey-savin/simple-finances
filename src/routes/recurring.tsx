import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { RefreshCw, X } from 'lucide-react'
import { RuleCard } from '#/components/reccuring/card'
import {
  createRecurringNow,
  fetchRecurringData,
  toggleRecurringRule,
} from '#/components/reccuring/actions'
import { Button } from '#/components/ui/button'
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from '#/components/ui/multi-select-combobox'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import type { RuleWithRelations } from '@/types'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring')({
  component: RecurringPage,
  loader: () => fetchRecurringData(),
})

// Re-export for any consumers that previously imported this type from the route.
// Canonical definition lives in src/types.ts.
export type { RuleWithRelations } from '@/types'

// ─── Component ────────────────────────────────────────────────────────────────

function RecurringPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const { rules, categories, accounts, counterparties } = Route.useLoaderData()
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>(
    'all',
  )
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [accountFilter, setAccountFilter] = useState<string[]>([])
  const [counterpartyFilter, setCounterpartyFilter] = useState<string[]>([])

  const categoryOptions: MultiSelectOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))
  const accountOptions: MultiSelectOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }))
  const counterpartyOptions: MultiSelectOption[] = counterparties.map(
    (counterparty) => ({
      value: counterparty.id,
      label: counterparty.name,
    }),
  )

  const handleToggle = async (rule: RuleWithRelations, isActive: boolean) => {
    try {
      await toggleRecurringRule({ data: { id: rule.id, isActive } })
      await router.invalidate()
      toast.success(
        isActive ? 'Правило активировано' : 'Правило приостановлено',
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  const handleCreateNow = async (rule: RuleWithRelations) => {
    try {
      await createRecurringNow({ data: { id: rule.id } })
      await router.invalidate()
      toast.success(rule.type === 'expense' ? 'Расход создан' : 'Доход создан')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter.length > 0 ||
    accountFilter.length > 0 ||
    counterpartyFilter.length > 0

  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter([])
    setAccountFilter([])
    setCounterpartyFilter([])
  }

  const filteredRules = useMemo(() => {
    return rules
      .filter((rule) => {
        if (typeFilter !== 'all' && rule.type !== typeFilter) return false
        if (
          categoryFilter.length > 0 &&
          !categoryFilter.includes(rule.category.id)
        )
          return false
        if (
          accountFilter.length > 0 &&
          !accountFilter.includes(rule.currentAccount.id)
        )
          return false
        if (
          counterpartyFilter.length > 0 &&
          !counterpartyFilter.includes(rule.counterparty?.id ?? '')
        )
          return false

        return true
      })
      .sort((a, b) => {
        const aTime =
          a.isActive && a.nextRunAt ? new Date(a.nextRunAt).getTime() : Infinity
        const bTime =
          b.isActive && b.nextRunAt ? new Date(b.nextRunAt).getTime() : Infinity

        if (aTime !== bTime) return aTime - bTime
        return a.description.localeCompare(b.description, 'ru')
      })
  }, [rules, typeFilter, categoryFilter, accountFilter, counterpartyFilter])

  return (
    <>
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="size-10 opacity-30" />
          <p className="text-sm">Нет ни одного правила. Создайте первое!</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap w-full lg:justify-between items-center gap-2">
            <ToggleGroup variant="outline" type="single" value={typeFilter}>
              {(['all', 'income', 'expense'] as const).map((t) => (
                <ToggleGroupItem
                  value={t}
                  key={t}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'all' ? 'Все' : t === 'income' ? 'Доходы' : 'Расходы'}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <MultiSelectCombobox
              options={categoryOptions}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Все категории"
              searchPlaceholder="Поиск категории…"
              emptyText="Категории не найдены"
            />

            <MultiSelectCombobox
              options={accountOptions}
              value={accountFilter}
              onValueChange={setAccountFilter}
              placeholder="Все счета"
              searchPlaceholder="Поиск счета…"
              emptyText="Счета не найдены"
            />

            <MultiSelectCombobox
              options={counterpartyOptions}
              value={counterpartyFilter}
              onValueChange={setCounterpartyFilter}
              placeholder="Все контрагенты"
              searchPlaceholder="Поиск контрагента…"
              emptyText="Контрагенты не найдены"
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Сброс
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {filteredRules.length} из {rules.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {filteredRules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Ничего не найдено
              </p>
            )}
            {filteredRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() =>
                  navigate({
                    to: '/recurring/$id/edit',
                    params: { id: rule.id },
                  })
                }
                onCreateNow={() => handleCreateNow(rule)}
                onToggle={(v) => handleToggle(rule, v)}
              />
            ))}
          </div>
        </>
      )}
      <Outlet />
    </>
  )
}
