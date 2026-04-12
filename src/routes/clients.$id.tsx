import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  fetchClientDetail,
  clientDetailQueryKey,
} from '@/components/clients/actions'
import { ClientDetailPage } from '@/components/clients/detail-page'

export const Route = createFileRoute('/clients/$id')({
  loader: ({ params }) => fetchClientDetail({ data: { id: params.id } }),
  component: ClientDetailRoute,
})

function ClientDetailRoute() {
  const initialData = Route.useLoaderData()
  const { data: client } = useQuery({
    queryKey: clientDetailQueryKey(initialData.id),
    queryFn: () => fetchClientDetail({ data: { id: initialData.id } }),
    initialData,
    staleTime: 30_000,
  })
  return <ClientDetailPage client={client} />
}
