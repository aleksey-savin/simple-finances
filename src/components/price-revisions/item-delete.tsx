import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { removeRevisionItem, priceRevisionQueryKey } from './actions'

export function DeleteRevisionItem({
  entityId,
  revisionId,
}: {
  entityId: string
  revisionId: string
}) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    setIsPending(true)
    try {
      await removeRevisionItem({ data: { id: entityId } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revisionId),
      })
      toast.success('Договор удалён из ревизии')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          disabled={isPending}
          title="Удалить из ревизии"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить договор из ревизии?</AlertDialogTitle>
          <AlertDialogDescription>
            Договор будет убран из этой ревизии. Его можно будет добавить снова
            кнопкой «Добавить договор».
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
