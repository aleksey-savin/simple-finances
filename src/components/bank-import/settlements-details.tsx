import { useState } from 'react'
import { Link2, Loader2, Unlink2 } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { ImportedBankTransactionView } from '#/components/bank-import/actions'
import { unlinkBankTransactionSettlement } from '#/components/bank-import/actions'
import { getBankImportEntityLabel } from '#/components/bank-import/labels'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export function BankTransactionSettlementsDetails({
  row,
  trigger = 'inline',
}: {
  row: ImportedBankTransactionView
  trigger?: 'inline' | 'button'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<
    ImportedBankTransactionView['settlements'][number] | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (row.settlements.length === 0) {
    return null
  }

  const handleUnlink = async () => {
    if (!unlinkTarget) return

    setIsSubmitting(true)

    try {
      await unlinkBankTransactionSettlement({
        data: {
          settlementId: unlinkTarget.id,
        },
      })
      setUnlinkTarget(null)
      await router.invalidate()
      toast.success('Привязка удалена')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Не удалось удалить привязку',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {trigger === 'inline' ? (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setOpen(true)}
        >
          Привязки:{' '}
          {row.settlements
            .map((settlement) => settlement.invoiceDescription)
            .join(', ')}
        </button>
      ) : (
        <Button
          variant="ghost"
          className="h-auto w-fit p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          <Link2 className="size-3.5" />
          Управлять привязками
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Привязки банковской транзакции</DialogTitle>
            <DialogDescription>
              Здесь можно посмотреть связанные{' '}
              {getBankImportEntityLabel(row.direction, 'plural')} и отвязать
              ненужные привязки.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {row.settlements.map((settlement) => (
              <div
                key={settlement.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {settlement.invoiceDescription}
                    </p>
                    <Badge variant="outline">{settlement.invoiceStatus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {settlement.counterpartyName ?? 'Без контрагента'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Привязано {formatMoney(settlement.amount)} ₽ от{' '}
                    {formatDate(settlement.settledAt)}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => setUnlinkTarget(settlement)}
                >
                  <Unlink2 className="size-4" />
                  Отвязать
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={unlinkTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setUnlinkTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Отвязать {getBankImportEntityLabel(row.direction)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Привязка к «{unlinkTarget?.invoiceDescription}» будет удалена.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="gap-2"
              onClick={handleUnlink}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Отвязка...
                </>
              ) : (
                <>
                  <Unlink2 className="size-4" />
                  Отвязать
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
