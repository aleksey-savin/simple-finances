import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { toast } from 'sonner'

import { RefreshCw } from 'lucide-react'
import { RuleCard } from '#/components/reccuring/card'
import {
  createRecurringNow,
  fetchRecurringData,
  toggleRecurringRule,
} from '#/components/reccuring/actions'
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
  const { rules } = Route.useLoaderData()

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

  return (
    <>
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="size-10 opacity-30" />
          <p className="text-sm">Нет ни одного правила. Создайте первое!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
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
      )}
      <Outlet />
    </>
  )
}
