import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import z from 'zod'
import { useForm } from '@tanstack/react-form'
import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { accounts } from '#/db/schema'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Field, FieldError, FieldLabel } from './ui/field'

const formSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
})

const addAccount = createServerFn({ method: 'POST' })
  .inputValidator(formSchema)
  .handler(async ({ data }) => {
    const [inserted] = await db
      .insert(accounts)
      .values({
        name: data.name,
      })
      .returning({ id: accounts.id })
    return inserted.id
  })

export const AddAccount = () => {
  const [open, setOpen] = useState(false)
  const form = useForm({
    defaultValues: { name: '' },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      try {
        await addAccount({
          data: {
            name: value.name,
          },
        })
        toast.success('Счёт успешно добавлен')
        setOpen(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <PlusCircle /> Счёт
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Новый счёт</SheetTitle>
            <SheetDescription>
              Добавьте новый счёт для ваших расходов и доходов.
            </SheetDescription>
          </SheetHeader>
          <form
            id="add-account-form"
            className="flex-1 flex flex-col gap-6 min-h-0"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <form.Field
                name="name"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Имя</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Введите имя счёта"
                        autoComplete="off"
                        type="text"
                        required
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              />
            </div>
            <SheetFooter>
              <Button type="submit">Создать</Button>
              <SheetClose asChild>
                <Button variant="outline">Закрыть</Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
