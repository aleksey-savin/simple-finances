import { createFileRoute } from '@tanstack/react-router'

import TasksPage from '@/components/tasks'
import { fetchTasks } from '@/components/tasks/actions'

export const Route = createFileRoute('/tasks')({
  loader: () => fetchTasks(),
  component: RouteComponent,
})

function RouteComponent() {
  const data = Route.useLoaderData()
  return <TasksPage data={data} />
}
