import { PlusCircle } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

import { AddAccountForm } from '.'

import { Separator } from '../ui/separator'

import { AccountsList } from '.'

import type { Member } from './share'

type Account = {
  id: string
  name: string
  role: string
  members: Member[]
}

const Accounts = ({ accounts }: { accounts: Account[] }) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <PlusCircle /> Счет
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Счета</SheetTitle>
          <SheetDescription>Управление счетами.</SheetDescription>
        </SheetHeader>

        <div className="px-6 pt-2 pb-4 shrink-0">
          <AddAccountForm />
        </div>
        <Separator />
        <AccountsList accounts={accounts} />
        <SheetFooter className="px-6 py-4 border-t">
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Закрыть
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default Accounts
