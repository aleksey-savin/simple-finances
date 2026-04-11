import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/price-revisions')({
  component: () => <Outlet />,
})
