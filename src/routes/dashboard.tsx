import { createFileRoute } from '@tanstack/react-router'

import { fetchDashboardData } from '#/components/dashboard/actions'
import { DashboardPage } from '#/components/dashboard/page'

export const Route = createFileRoute('/dashboard')({
  loader: () => fetchDashboardData(),
  component: RouteComponent,
})

function RouteComponent() {
  const loaderData = Route.useLoaderData()
  return <DashboardPage {...loaderData} />
}
