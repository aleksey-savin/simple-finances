import { eq } from 'drizzle-orm'
import { Trash2 } from 'lucide-react'

import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import z from 'zod'

import { db } from '#/db'
import { category } from '#/db/schema'

import { Button } from '@/components/ui/button'

type Category = {
  id: string
  name: string
  useForExpenses: boolean
  useForIncome: boolean
}

const deleteCategorySchema = z.object({ id: z.string() })

const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(deleteCategorySchema)
  .handler(async ({ data }) => {
    await db.delete(category).where(eq(category.id, data.id))
  })

export const DeleteCategory = ({ category }: { category: Category }) => {
  const router = useRouter()
  const handleDelete = async () => {
    try {
      await deleteCategory({ data: { id: category.id } })
      await router.invalidate()
      toast.success('Категория удалена')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-destructive hover:text-destructive"
        title="Удалить"
        onClick={handleDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </>
  )
}
