import { createFileRoute } from '@tanstack/react-router'

import { fetchPriceRevisions } from '@/components/price-revisions/actions'
import { PriceRevisionList } from '@/components/price-revisions/list'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/price-revisions/')({
  loader: () => fetchPriceRevisions(),
  component: PriceRevisionsPage,
})

function PriceRevisionsPage() {
  const revisions = Route.useLoaderData()

  return revisions.length === 0 ? (
    <Card className="p-8 text-center text-sm text-muted-foreground">
      Ревизий пока нет. Создайте первую — нажмите «+» в заголовке.
    </Card>
  ) : (
    <PriceRevisionList revisions={revisions} />
  )
}
