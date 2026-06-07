import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Input } from '@/components/ui/input'

import { addTask } from './actions'
import { useTasksActions } from './hooks'

export function AddTaskInput({ listId }: { listId: string }) {
  const { run } = useTasksActions()
  const [value, setValue] = useState('')

  async function submit() {
    const description = value.trim()
    if (!description) return
    setValue('')
    await run(addTask({ data: { listId, description } }))
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Plus className="size-4 shrink-0 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder="Новая задача…"
        className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
    </div>
  )
}
