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

import { EditExpenseForm } from './form'
import type { Expense } from '#/types'
import type { Expense as DBExpense } from '@/db/types'

type EditExpenseProps = {
  item: Expense
  categories: { id: string; name: string; useForExpenses: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const EditExpense = ({
  item,
  categories,
  accounts,
  counterparties = [],
  open: controlledOpen,
  onOpenChange,
}: EditExpenseProps) => {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const expenseForForm = {
    id: item.id,
    amount: item.amount,
    description: item.description,
    categoryId: item.category.id,
    currentAccountId: item.currentAccount.id,
    counterpartyId: item.counterparty?.id ?? null,
    dueDate: item.dueDate,
    paidAt: item.paidAt,
    createdAt: item.createdAt,
  } as unknown as DBExpense

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
          <DialogTitle>Редактировать расход</DialogTitle>
        </DialogHeader>
        <EditExpenseForm
          expense={expenseForForm}
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
