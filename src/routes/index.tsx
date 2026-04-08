import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
  loader: () => {
    throw redirect({ to: '/dashboard' })
  },
})

function App() {
  return null
}
