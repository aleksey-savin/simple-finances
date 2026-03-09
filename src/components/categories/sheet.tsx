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

import { AddCategoryForm } from '.'

import { Separator } from '../ui/separator'

import { CategoriesList } from '.'

type Category = {
  id: string
  name: string
  useForExpenses: boolean
  useForIncome: boolean
}

const Categories = ({ categories }: { categories: Category[] }) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <PlusCircle /> Категория
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Категории</SheetTitle>
          <SheetDescription>
            Управление категориями расходов и доходов.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pt-2 pb-4 shrink-0">
          <AddCategoryForm />
        </div>
        <Separator />
        <CategoriesList categories={categories} />
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

export default Categories
