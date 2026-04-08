import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { fetchDashboardData } from '#/components/dashboard/actions'
import { DashboardPage } from '#/components/dashboard/page'

const dashboardSearchSchema = z.object({
  scope: z.string().optional(),
})

export const Route = createFileRoute('/dashboard')({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    scope: search.scope,
  }),
  loader: ({ deps }) => fetchDashboardData({ data: { scope: deps.scope } }),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate({ from: '/dashboard' })
  const loaderData = Route.useLoaderData()

  return (
    <DashboardPage
      {...loaderData}
      onScopeChange={(scopeId) =>
        navigate({
          to: '/dashboard',
          search: { scope: scopeId },
        })
      }
    />
  )
}
