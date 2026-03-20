import { useState } from 'react'
import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { EditIncomeForm } from './form'
import type { Income } from '#/types'
import type { Income as DBIncome } from '@/db/types'

type EditIncomeProps = {
  item: Income
  categories: { id: string; name: string; useForIncome: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const EditIncome = ({
  item,
  categories,
  accounts,
  counterparties = [],
  open: controlledOpen,
  onOpenChange,
}: EditIncomeProps) => {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const incomeForForm = {
    id: item.id,
    amount: item.amount,
    description: item.description,
    categoryId: item.category.id,
    currentAccountId: item.currentAccount.id,
    counterpartyId: item.counterparty?.id ?? null,
    dueDate: item.dueDate,
    paidAt: item.paidAt,
    createdAt: item.createdAt,
  } as unknown as DBIncome

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
          <DialogTitle>Редактировать доход</DialogTitle>
        </DialogHeader>
        <EditIncomeForm
          income={incomeForForm}
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
