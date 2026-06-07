import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { tasksQueryKey } from './actions'

// Centralises cache invalidation + error toasts for every task mutation.
export function useTasksActions() {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function run<T>(
    promise: Promise<T>,
    success?: string,
  ): Promise<T | undefined> {
    try {
      const result = await promise
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      if (success) toast.success(success)
      return result
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
      return undefined
    }
  }

  return { run }
}
