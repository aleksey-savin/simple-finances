import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Separator } from '../ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { AddContractForm } from './form'
import { ContractsList } from './list'

export default function Contracts() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default">
          <Plus />
          Договор
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Договоры
          </SheetTitle>
          <SheetDescription>
            Храните номер, дату, тип, контрагента и суммы договора
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 px-4 pt-2 pb-4">
          <AddContractForm />
        </div>
        <Separator />
        <ContractsList />
      </SheetContent>
    </Sheet>
  )
}
