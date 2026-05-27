import { useForm } from '@tanstack/react-form'
import z from 'zod'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type ContactFormValues = {
  name: string
  position: string
  phone: string
  email: string
}

const contactSchema = z.object({
  name: z.string().min(1, 'Введите имя'),
  position: z.string(),
  phone: z.string(),
  email: z.union([z.string().email('Некорректный email'), z.literal('')]),
})

export function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: ContactFormValues
  onSubmit: (values: ContactFormValues) => Promise<void>
  onCancel: () => void
}) {
  const form = useForm({
    defaultValues: defaultValues ?? {
      name: '',
      position: '',
      phone: '',
      email: '',
    },
    validators: { onSubmit: contactSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Имя *</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Иван Иванов"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="position">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Должность</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Директор"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Телефон</FieldLabel>
            <Input
              id={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="+7 900 000 00 00"
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="ivan@example.com"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="sm" disabled={isSubmitting}>
              Сохранить
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
