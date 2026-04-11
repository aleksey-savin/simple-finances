import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import z from 'zod'

import {
  businessLinesQueryKey,
  fetchBusinessLines,
} from '@/components/business-lines/actions'
import { Button } from '#/components/ui/button'
import { Combobox } from '#/components/ui/combobox'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { createPriceRevision, priceRevisionsQueryKey } from './actions'

const formSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  businessLineId: z.string().min(1, 'Выберите направление'),
})

export function PriceRevisionForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: businessLines = [] } = useQuery({
    queryKey: businessLinesQueryKey,
    queryFn: () => fetchBusinessLines(),
  })

  const form = useForm({
    defaultValues: { name: '', businessLineId: '' },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      try {
        await createPriceRevision({ data: value })
        await router.invalidate()
        queryClient.invalidateQueries({ queryKey: priceRevisionsQueryKey })
        toast.success('Ревизия создана')
        form.reset()
        onDone?.()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка')
      }
    },
  })

  const businessLineOptions = businessLines.map((bl) => ({
    value: bl.id,
    label: bl.name,
  }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Название ревизии</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="IT-аутсорсинг Q2 2026"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="businessLineId">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Бизнес-направление</FieldLabel>
              <Combobox
                options={businessLineOptions}
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                placeholder="Выберите направление"
                searchPlaceholder="Поиск..."
                emptyText="Не найдено"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )
        }}
      </form.Field>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            Создать ревизию
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
