import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import { db } from '#/db'
import { recurringRule } from '#/db/schema'
import { auth } from 'utils/auth'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

// ─── Server function ──────────────────────────────────────────────────────────

const deleteRuleSchema = z.object({ id: z.string() })

const deleteRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(deleteRuleSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.delete(recurringRule).where(eq(recurringRule.id, data.id))
  })

// ─── Component ────────────────────────────────────────────────────────────────

type Rule = { id: string; description: string }

export const DeleteRule = ({ rule }: { rule: Rule }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    try {
      await deleteRecurringRule({ data: { id: rule.id } })
      await router.invalidate()
      toast.success('Правило удалено')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    } finally {
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" />
        Удалить
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить правило?</DialogTitle>
            <DialogDescription>
              Правило «{rule.description}» будет удалено безвозвратно. Уже
              созданные записи останутся.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirm}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
