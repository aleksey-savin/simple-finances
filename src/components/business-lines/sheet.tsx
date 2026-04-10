import { useState } from 'react'
import { Briefcase, Plus } from 'lucide-react'

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
import { AddBusinessLineForm } from './form'
import { BusinessLinesList } from './list'

export default function BusinessLines() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default">
          <Plus />
          Направление
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="size-4" />
            Направления
          </SheetTitle>
          <SheetDescription>
            Создавайте направления и связывайте с ними договоры
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 px-4 pt-2 pb-4">
          <AddBusinessLineForm />
        </div>
        <Separator />
        <BusinessLinesList />
      </SheetContent>
    </Sheet>
  )
}
