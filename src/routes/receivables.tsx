import { createFileRoute } from '@tanstack/react-router'

import { fetchReceivables } from '#/components/receivables/actions'
import { ReceivablesPage } from '#/components/receivables/receivables-page'

function ReceivablesRouteComponent() {
  return <ReceivablesPage {...Route.useLoaderData()} />
}

export const Route = createFileRoute('/receivables')({
  component: ReceivablesRouteComponent,
  loader: () => fetchReceivables(),
})
