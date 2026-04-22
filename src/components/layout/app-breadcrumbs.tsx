import React from 'react'
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
    dashboard: { label: 'Dashboard', showAddButton: false },
    transactions: { label: 'Все операции', showAddButton: true },
    'bank-import': { label: 'Банковские выписки', showAddButton: false },
    recurring: { label: 'Запланированные платежи', showAddButton: true },
    receivables: { label: 'Дебиторская задолженность', showAddButton: false },
    payables: { label: 'Платежи и обязательства', showAddButton: false },
    companies: { label: 'Мои компании', showAddButton: true },
    clients: { label: 'Клиенты', showAddButton: true },
    counterparties: { label: 'Контрагенты', showAddButton: true },
    contracts: { label: 'Договоры', showAddButton: true },
    'business-lines': { label: 'Бизнес-направления', showAddButton: true },
    'price-revisions': { label: 'Ревизии цен', showAddButton: true },
    'current-accounts': { label: 'Расчётные счета', showAddButton: true },
    categories: { label: 'Категории', showAddButton: true },
    users: { label: 'Пользователи', showAddButton: true },
    preferences: { label: 'Настройки', showAddButton: false },
  }

// Context-aware labels for known child segments.
// Keyed by parent segment → child segment → label string.
const CHILD_LABELS: Record<string, Record<string, string>> = {
  recurring: {
    new: 'Новое правило',
    edit: 'Редактировать правило',
  },
  companies: {
    new: 'Новая компания',
  },
  clients: {
    new: 'Новый клиент',
  },
  counterparties: {
    new: 'Новый контрагент',
  },
  contracts: {
    new: 'Новый договор',
  },
  'business-lines': {
    new: 'Новое направление',
  },
  'price-revisions': {
    new: 'Новая ревизия',
  },
  'current-accounts': {
    new: 'Новый расчётный счёт',
  },
  categories: {
    new: 'Новая категория',
  },
  users: {
    new: 'Новый пользователь',
  },
}

export function AppBreadCrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const matches = useMatches()

  const allSegments = pathname.split('/').filter(Boolean)

  // Walk path segments and collect those we can label.
  // Stop at the first segment that is neither a known top-level route nor a
  // known child of the previous segment (e.g. a raw UUID param).
  const segments: string[] = []
  for (const seg of allSegments) {
    if (seg in ROUTE_LABELS) {
      segments.push(seg)
    } else {
      const parent = segments[segments.length - 1]
      if (parent && CHILD_LABELS[parent]?.[seg] !== undefined) {
        segments.push(seg)
        break // nothing navigable can come after a terminal child segment
      }
      break
    }
  }

  if (segments.length === 0) return null

  // Check if we're on a view page (URL contains /view at the end)
  const isViewPage = pathname.includes('/view')
  const lastSegment = segments[segments.length - 1]

  // True when there are path segments beyond what we recognise in labels
  // (e.g. a UUID like /price-revisions/:id). In this case the last known
  // segment becomes a breadcrumb link back to the parent list, and we show
  // the entity name from loader data as the current page title.
  const isDetailPage = !isViewPage && allSegments.length > segments.length

  // Get loader data from the current active route match
  const activeMatch = matches[matches.length - 1]
  const loaderData = activeMatch?.loaderData as any

  // Get entity name for view pages or detail pages
  let entityName = ''
  if (isViewPage && loaderData) {
    if (lastSegment === 'clients' || lastSegment === 'wishlist') {
      entityName = loaderData.company?.name || ''
    } else {
      entityName = loaderData.name || ''
    }
  } else if (isDetailPage && loaderData) {
    entityName = loaderData.name || ''
  }

  // Resolve a display label for any segment, using parent context when needed.
  const getLabel = (segment: string, index: number): string => {
    if (segment in ROUTE_LABELS) {
      return ROUTE_LABELS[segment].label
    }
    const parent = segments[index - 1]
    if (parent) {
      return CHILD_LABELS[parent]?.[segment] ?? segment
    }
    return segment
  }

  // The + button is only shown on a root entity page (last segment is a top-level
  // route) that has showAddButton enabled.
  const showAddButton =
    !isViewPage &&
    !isDetailPage &&
    segments.length > 0 &&
    lastSegment in ROUTE_LABELS &&
    (ROUTE_LABELS[lastSegment]?.showAddButton ?? false)

  return (
    <div className="flex items-center">
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const href = '/' + segments.slice(0, index + 1).join('/')
            const label = getLabel(segment, index)
            const isLast = index === segments.length - 1

            const isLink = !isLast || isViewPage || isDetailPage
            const showSeparator = !isLast || isDetailPage

            return (
              <React.Fragment key={href}>
                <BreadcrumbItem className="text-lg">
                  {isLink ? (
                    <BreadcrumbLink asChild>
                      <Link to={href}>{label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="font-semibold">
                      {label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {showSeparator && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}

          {/* Show Add button on root entity pages like /recurring or /users */}
          {showAddButton && (
            <BreadcrumbItem>
              <Button
                variant="success"
                asChild
                size="sm"
                className="gap-2 ml-2"
              >
                <Link to={`/${lastSegment}/new` as any}>
                  <PlusIcon className="size-4" />
                </Link>
              </Button>
            </BreadcrumbItem>
          )}

          {/* Show entity name on view pages and detail pages */}
          {(isViewPage || isDetailPage) && entityName && (
            <BreadcrumbItem className="text-lg">
              <BreadcrumbPage className="font-semibold">
                {entityName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
