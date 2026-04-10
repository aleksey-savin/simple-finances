import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { RefreshCw, Search, X } from 'lucide-react'
import { RuleCard } from '#/components/reccuring/card'
import { RecurringSummaryCards } from '#/components/reccuring/summary-cards'
import { RuleTableRow } from '#/components/reccuring/table-row'
import {
  createRecurringNow,
  fetchRecurringData,
  toggleRecurringRule,
} from '#/components/reccuring/actions'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from '#/components/ui/multi-select-combobox'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import type { RuleWithRelations } from '@/types'
import { getCronLabel } from '#/components/reccuring/utils'

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
  const { rules, categories, accounts, counterparties, currentMonthTotals } =
    Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'payable' | 'receivable'
  >('all')
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
      toast.success(rule.type === 'payable' ? 'Расход создан' : 'Доход создан')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    categoryFilter.length > 0 ||
    accountFilter.length > 0 ||
    counterpartyFilter.length > 0

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setCategoryFilter([])
    setAccountFilter([])
    setCounterpartyFilter([])
  }

  const filteredRules = useMemo(() => {
    return rules
      .filter((rule) => {
        if (search.trim()) {
          const query = search.trim().toLowerCase()
          const haystack = [
            rule.description,
            rule.category.name,
            rule.currentAccount.name,
            rule.counterparty?.name ?? '',
            getCronLabel(rule.cronExpression),
            Number(rule.amount).toLocaleString('ru-RU'),
          ]
            .join(' ')
            .toLowerCase()

          if (!haystack.includes(query)) return false
        }

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
  }, [
    rules,
    search,
    typeFilter,
    categoryFilter,
    accountFilter,
    counterpartyFilter,
  ])

  return (
    <>
      <RecurringSummaryCards currentMonthTotals={currentMonthTotals} />

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="size-10 opacity-30" />
          <p className="text-sm">Нет ни одного правила. Создайте первое!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по правилу, категории, счёту..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap w-full items-center gap-4 lg:justify-between">
              <ToggleGroup variant="outline" type="single" value={typeFilter}>
                {(['all', 'receivable', 'payable'] as const).map((t) => (
                  <ToggleGroupItem
                    value={t}
                    key={t}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === 'all'
                      ? 'Все'
                      : t === 'receivable'
                        ? 'Доходы'
                        : 'Расходы'}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <MultiSelectCombobox
                options={accountOptions}
                value={accountFilter}
                onValueChange={setAccountFilter}
                placeholder="Все счета"
                searchPlaceholder="Поиск счета…"
                emptyText="Счета не найдены"
              />

              <MultiSelectCombobox
                options={categoryOptions}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                placeholder="Все категории"
                searchPlaceholder="Поиск категории…"
                emptyText="Категории не найдены"
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

              <span className="ml-auto text-xs text-muted-foreground">
                {filteredRules.length} из {rules.length}
              </span>
            </div>
          </Card>

          {filteredRules.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              Ничего не найдено
            </Card>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:hidden">
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
                    onToggle={(value) => handleToggle(rule, value)}
                  />
                ))}
              </div>

              <Card className="hidden p-4 sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Правило</TableHead>
                      <TableHead className="w-72 font-bold">
                        Расписание
                      </TableHead>
                      <TableHead className="w-64 font-bold">Запуски</TableHead>
                      <TableHead className="w-32 text-center font-bold">
                        Статус
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        Сумма
                      </TableHead>
                      <TableHead className="text-right font-bold">
                        Действия
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => (
                      <RuleTableRow
                        key={rule.id}
                        rule={rule}
                        onEdit={() =>
                          navigate({
                            to: '/recurring/$id/edit',
                            params: { id: rule.id },
                          })
                        }
                        onCreateNow={() => handleCreateNow(rule)}
                        onToggle={(value) => handleToggle(rule, value)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      )}
      <Outlet />
    </>
  )
}
