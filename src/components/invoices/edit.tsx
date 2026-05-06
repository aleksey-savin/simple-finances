import { useState } from 'react'

import type { Invoice as DBInvoice } from '@/db/types'

import { EditInvoiceForm } from './form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'

export type EditableInvoiceItem = {
  id: string
  kind: 'payable' | 'receivable'
  amount: string
  description: string
  category: { id: string; name: string }
  currentAccount: { id: string; name: string }
  counterparty: { id: string; name: string } | null
  dueDate: Date | string | null
  paidAt: Date | string | null
  createdAt: Date | string
  archivedAt: Date | string | null
  createdBy?: string
  linkedInvoiceId?: string | null
  contractId?: string | null
}

type EditInvoiceProps = {
  item: EditableInvoiceItem
  categories: {
    id: string
    name: string
    useForExpenses: boolean
    useForIncome: boolean
    isShared: boolean
  }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string; linkedUserId?: string | null }[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditInvoice({
  item,
  categories,
  accounts,
  counterparties = [],
  open: controlledOpen,
  onOpenChange,
}: EditInvoiceProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const invoiceForForm = {
    id: item.id,
    kind: item.kind,
    amount: item.amount,
    description: item.description,
    categoryId: item.category.id,
    currentAccountId: item.currentAccount.id,
    counterpartyId: item.counterparty?.id ?? null,
    dueDate: item.dueDate,
    paidAt: item.paidAt,
    createdAt: item.createdAt,
    archivedAt: item.archivedAt,
    createdBy: item.createdBy,
    linkedInvoiceId: item.linkedInvoiceId,
    contractId: item.contractId,
  } as unknown as DBInvoice

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Редактировать"
          >
            <Pencil className="size-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item.kind === 'payable'
              ? 'Редактировать расход'
              : 'Редактировать доход'}
          </DialogTitle>
          <DialogDescription>
            Измените данные записи и сохраните обновления.
          </DialogDescription>
        </DialogHeader>
        <EditInvoiceForm
          invoice={invoiceForForm}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          onDone={() => setOpen(false)}
          asDialog
        />
      </DialogContent>
    </Dialog>
  )
}
