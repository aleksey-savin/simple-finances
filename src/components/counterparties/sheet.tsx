import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Plus } from 'lucide-react'
import { AddCounterpartyForm } from './form'
import { CounterpartiesList } from './list'
import { Separator } from '../ui/separator'

export default function CounterParties() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default">
          <Plus />
          Контрагент
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle>Получатели платежа</SheetTitle>
          <SheetDescription>
            Добавьте и управляйте получателями платежей
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pt-2 pb-4 shrink-0">
          <AddCounterpartyForm onDone={() => setOpen(false)} />
        </div>
        <Separator />
        <CounterpartiesList />
      </SheetContent>
    </Sheet>
  )
}
