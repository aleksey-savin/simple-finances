import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'
import { db } from '#/db'
import { recurringRule, currentAccountUser, currentAccount } from '#/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { Cron } from 'croner'
import z from 'zod'
import { toast } from 'sonner'

import { RefreshCw } from 'lucide-react'
import { useSyncAppData } from '@/hooks/use-sync-app-data'
import { RuleCard } from '#/components/reccuring/card'
import type { RuleWithRelations } from '#/components/reccuring/types'

// ─── Server functions ──────────────────────────────────────────────────────────

const fetchRecurringData = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const userId = session.user.id

  const memberships = await db
    .select({
      currentAccountId: currentAccountUser.currentAccountId,
      role: currentAccountUser.role,
    })
    .from(currentAccountUser)
    .where(eq(currentAccountUser.userId, userId))

  const accountIds = memberships.map((m) => m.currentAccountId)

  if (accountIds.length === 0) {
    const cats = await db.query.category.findMany({})
    return { rules: [], categories: cats, accounts: [] }
  }

  const [rules, cats, accounts] = await Promise.all([
    db.query.recurringRule.findMany({
      where: inArray(recurringRule.currentAccountId, accountIds),
      with: {
        category: { columns: { id: true, name: true } },
        currentAccount: { columns: { id: true, name: true } },
      },
    }),
    db.query.category.findMany({}),
    db.query.currentAccount.findMany({
      where: inArray(currentAccount.id, accountIds),
    }),
  ])

  return { rules, categories: cats, accounts }
})

// ── Toggle active ──────────────────────────────────────────────────────────────

const toggleRuleSchema = z.object({ id: z.string(), isActive: z.boolean() })

const toggleRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(toggleRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    // When re-activating, recalculate nextRunAt so it fires at the proper future time
    let nextRunAt: Date | null = null
    if (data.isActive) {
      const existing = await db.query.recurringRule.findFirst({
        where: eq(recurringRule.id, data.id),
        columns: { cronExpression: true },
      })
      if (existing) {
        const job = new Cron(existing.cronExpression, { paused: true })
        nextRunAt = job.nextRun() ?? null
      }
    }

    await db
      .update(recurringRule)
      .set({
        isActive: data.isActive,
        ...(data.isActive && nextRunAt ? { nextRunAt } : {}),
      })
      .where(eq(recurringRule.id, data.id))
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recurring')({
  component: RecurringPage,
  loader: () => fetchRecurringData(),
})

// Re-export for any consumers that previously imported this type from the route.
// Canonical definition lives in #/components/reccuring/types.
export type { RuleWithRelations } from '#/components/reccuring/types'

// ─── Component ────────────────────────────────────────────────────────────────

function RecurringPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const { rules, categories, accounts } = Route.useLoaderData()
  useSyncAppData({ accounts, categories })

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
              onToggle={(v) => handleToggle(rule, v)}
            />
          ))}
        </div>
      )}
      <Outlet />
    </>
  )
}
