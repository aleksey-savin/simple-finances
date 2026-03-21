import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
  loader: () => {
    throw redirect({ to: '/transactions' })
  },
})

function App() {
  return null
}
