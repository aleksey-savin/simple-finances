import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
  loader: () => {
    throw redirect({ to: '/movements' })
  },
})

function App() {
  return null
}
