import { useRouterState, Link, useMatches } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

const ROUTE_LABELS: Record<string, { label: string; showAddButton: boolean }> =
  {
    movements: { label: 'Движение средств', showAddButton: false },
    recurring: { label: 'Запланированные платежи', showAddButton: true },
    receivables: { label: 'Дебиторская задолженность', showAddButton: false },
    payables: { label: 'Платежи и обязательства', showAddButton: false },
    users: { label: 'Пользователи', showAddButton: true },
  }

export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const matches = useMatches()

  const allSegments = pathname.split('/').filter(Boolean)

  // Only include segments that have a known label — stop at the first dynamic
  // param (UUID, numeric ID) or action word (new, update, delete, …).
  // This prevents dialog/modal routes from appearing in the breadcrumb while
  // staying flexible: just add an entry to ROUTE_LABELS for any new real page.
  const segments: string[] = []
  for (const seg of allSegments) {
    if (!(seg in ROUTE_LABELS)) break
    segments.push(seg)
  }

  if (segments.length === 0) return null

  // Check if we're on a view page (URL contains /view at the end)
  const isViewPage = pathname.includes('/view')
  const lastSegment = segments[segments.length - 1]

  // Get loader data from the current active route match
  const activeMatch = matches[matches.length - 1]
  const loaderData = activeMatch?.loaderData as any

  // Get entity name for view pages
  let entityName = ''
  if (isViewPage && loaderData) {
    // Special case for clients - use company.name
    if (lastSegment === 'clients' || lastSegment === 'wishlist') {
      entityName = loaderData.company?.name || ''
    } else {
      // For all other entities - use entity.name
      entityName = loaderData.name || ''
    }
  }

  // Check if the last segment should show an add button
  const showAddButton = ROUTE_LABELS[lastSegment]?.showAddButton ?? false

  return (
    <div className="flex items-center">
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const href = '/' + segments.slice(0, index + 1).join('/')
            const label = ROUTE_LABELS[segment]?.label ?? segment
            const isLast = index === segments.length - 1

            return (
              <BreadcrumbItem key={href} className="text-lg">
                {!isLast ? (
                  <>
                    <BreadcrumbLink asChild>
                      <Link to={href}>{label}</Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                ) : isViewPage ? (
                  <>
                    <BreadcrumbLink asChild>
                      <Link to={href}>{label}</Link>
                    </BreadcrumbLink>
                  </>
                ) : (
                  <BreadcrumbPage className="font-semibold">
                    {label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            )
          })}

          {/* Show Add button on root entity pages like /clients or /users */}
          {!isViewPage && segments.length > 0 && showAddButton && (
            <BreadcrumbItem>
              <Button asChild size="sm" className="gap-2 ml-2">
                <Link to={`/${lastSegment}/new` as any}>
                  <PlusIcon className="size-4" />
                </Link>
              </Button>
            </BreadcrumbItem>
          )}

          {/* Show entity name on view pages */}
          {isViewPage && entityName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-lg">
                <BreadcrumbPage className="font-semibold">
                  {entityName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
