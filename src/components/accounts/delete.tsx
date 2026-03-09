import { eq } from 'drizzle-orm'
import { Trash2 } from 'lucide-react'

import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import z from 'zod'

import { db } from '#/db'
import { currentAccount } from '#/db/schema'

import { Button } from '@/components/ui/button'

type Account = {
  id: string
  name: string
}

const deleteAccountSchema = z.object({ id: z.string() })

const deleteAccount = createServerFn({ method: 'POST' })
  .inputValidator(deleteAccountSchema)
  .handler(async ({ data }) => {
    await db.delete(currentAccount).where(eq(currentAccount.id, data.id))
  })

export const DeleteAccount = ({ account }: { account: Account }) => {
  const router = useRouter()
  const handleDelete = async () => {
    try {
      await deleteAccount({ data: { id: account.id } })
      await router.invalidate()
      toast.success('Счёт удалён')
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
