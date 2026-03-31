import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { ImportedBankTransactionView } from '#/components/bank-import/actions'
import { getBankImportEntityLabel } from '#/components/bank-import/labels'
import { Loader2 } from 'lucide-react'

export function BankImportDeleteDialog({
  open,
  target,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  target: ImportedBankTransactionView | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить банковскую транзакцию?</DialogTitle>
          <DialogDescription>
            Эта строка выписки не связана с{' '}
            {target ? getBankImportEntityLabel(target.direction) : 'записью'} и
            будет удалена безвозвратно.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
