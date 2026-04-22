import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import z from 'zod'

import type { BusinessLine } from '@/types'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  addBusinessLine,
  businessLinesQueryKey,
  updateBusinessLine,
} from './actions'

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  allowServerBindings: z.boolean(),
  allowNotifications: z.boolean(),
})

type BusinessLineFormProps =
  | { businessLine?: undefined; onDone?: () => void }
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
      allowServerBindings: current?.allowServerBindings ?? true,
      allowNotifications: current?.allowNotifications ?? true,
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await updateBusinessLine({
            data: {
              id: current.id,
              name: value.name,
              allowServerBindings: value.allowServerBindings,
              allowNotifications: value.allowNotifications,
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
            allowServerBindings: value.allowServerBindings,
            allowNotifications: value.allowNotifications,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({
          queryKey: businessLinesQueryKey,
        })
        form.reset()
        toast.success('Направление добавлено')
        onDone?.()
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

        <form.Field name="allowServerBindings">
          {(field) => (
            <Field>
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div className="space-y-0.5">
                  <FieldLabel htmlFor={field.name} className="cursor-pointer">
                    Разрешить привязку серверов
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    В договорах этого направления можно привязывать ВМ Proxmox
                  </p>
                </div>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field name="allowNotifications">
          {(field) => (
            <Field>
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div className="space-y-0.5">
                  <FieldLabel htmlFor={field.name} className="cursor-pointer">
                    Отправлять уведомления об оплате
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Email-напоминания по счетам договоров этого направления
                  </p>
                </div>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              </div>
            </Field>
          )}
        </form.Field>

        <Button type="submit">{isEdit ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </form>
  )
}

export const AddBusinessLineForm = ({ onDone }: { onDone?: () => void }) => (
  <BusinessLineForm onDone={onDone} />
)

export const EditBusinessLineForm = ({
  businessLine,
  onDone,
}: {
  businessLine: BusinessLine
  onDone: () => void
}) => <BusinessLineForm businessLine={businessLine} onDone={onDone} />
