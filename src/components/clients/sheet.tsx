import { useState } from 'react'
import { Plus } from 'lucide-react'

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
import { AddClientForm } from './form'
import { ClientsList } from './list'

export default function Clients() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default">
          <Plus />
          Клиент
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle>Клиенты</SheetTitle>
          <SheetDescription>
            Добавьте и управляйте клиентами для аналитики
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 px-4 pt-2 pb-4">
          <AddClientForm />
        </div>
        <Separator />
        <ClientsList />
      </SheetContent>
    </Sheet>
  )
}
