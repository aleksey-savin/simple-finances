import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  fetchPriceRevision,
  priceRevisionQueryKey,
} from '@/components/price-revisions/actions'
import { PriceRevisionDetailPage } from '@/components/price-revisions/detail-page'

export const Route = createFileRoute('/price-revisions/$id')({
  loader: ({ params }) => fetchPriceRevision({ data: { id: params.id } }),
  component: PriceRevisionDetailRoute,
})

function PriceRevisionDetailRoute() {
  const initialData = Route.useLoaderData()
  const { data: revision } = useQuery({
    queryKey: priceRevisionQueryKey(initialData.id),
    queryFn: () => fetchPriceRevision({ data: { id: initialData.id } }),
    initialData,
    staleTime: 30_000,
  })
  return <PriceRevisionDetailPage revision={revision} />
}
