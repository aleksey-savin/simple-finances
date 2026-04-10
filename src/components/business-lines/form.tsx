import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import z from 'zod'

import type { BusinessLine } from '@/types'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  addBusinessLine,
  businessLinesQueryKey,
  updateBusinessLine,
} from './actions'

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
})

type BusinessLineFormProps =
  | { businessLine?: undefined; onDone?: undefined }
  | { businessLine: BusinessLine; onDone: () => void }

export const BusinessLineForm = ({
  businessLine: current,
  onDone,
}: BusinessLineFormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = current !== undefined

  const form = useForm({
    defaultValues: {
      name: current?.name ?? '',
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await updateBusinessLine({
            data: {
              id: current.id,
              name: value.name,
            },
          })
          await router.invalidate()
          await queryClient.invalidateQueries({
            queryKey: businessLinesQueryKey,
          })
          await queryClient.invalidateQueries({ queryKey: ['contracts'] })
          toast.success('Направление обновлено')
          onDone()
          return
        }

        await addBusinessLine({
          data: {
            name: value.name,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({
          queryKey: businessLinesQueryKey,
        })
        form.reset()
        toast.success('Направление добавлено')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id={isEdit ? 'edit-business-line-form' : 'add-business-line-form'}
      className={
        isEdit
          ? 'flex flex-col gap-3 pt-2'
          : 'flex-1 flex flex-col gap-4 min-h-0'
      }
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <div
        className={
          isEdit
            ? 'flex flex-col gap-3'
            : 'grid flex-1 auto-rows-min gap-4 px-4'
        }
      >
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Название</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Введите название направления"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <Button type="submit">{isEdit ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </form>
  )
}

export const AddBusinessLineForm = () => <BusinessLineForm />

export const EditBusinessLineForm = ({
  businessLine,
  onDone,
}: {
  businessLine: BusinessLine
  onDone: () => void
}) => <BusinessLineForm businessLine={businessLine} onDone={onDone} />
