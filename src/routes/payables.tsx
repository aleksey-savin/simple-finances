import { createFileRoute } from '@tanstack/react-router'

import { fetchPayables } from '#/components/payables/actions'
import { PayablesPage } from '#/components/payables/payables-page'

function PayablesRouteComponent() {
  return <PayablesPage {...Route.useLoaderData()} />
}

export const Route = createFileRoute('/payables')({
  component: PayablesRouteComponent,
  loader: () => fetchPayables(),
})
