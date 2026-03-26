import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { deleteInvoice } from './actions'

import { Button } from '@/components/ui/button'
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
} from '@/components/ui/alert-dialog'

type DeleteInvoiceProps = {
  entityId: string
  kind: 'payable' | 'receivable'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteInvoice({
  entityId,
  kind,
  open: controlledOpen,
  onOpenChange,
}: DeleteInvoiceProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const handleDelete = async () => {
    try {
      await deleteInvoice({ data: { id: entityId } })
      await router.invalidate()
      toast.success(kind === 'payable' ? 'Расход удалён' : 'Доход удалён')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            title="Удалить"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Удалить {kind === 'payable' ? 'расход' : 'доход'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить.
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
