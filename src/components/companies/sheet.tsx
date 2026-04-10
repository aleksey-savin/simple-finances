import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'

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
import { AddCompanyForm } from './form'
import { CompaniesList } from './list'

export default function Companies() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default">
          <Plus />
          Компания
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            Компании
          </SheetTitle>
          <SheetDescription>
            Объединяйте счета в компании для dashboard и аналитики
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 px-4 pt-2 pb-4">
          <AddCompanyForm />
        </div>
        <Separator />
        <CompaniesList />
      </SheetContent>
    </Sheet>
  )
}
