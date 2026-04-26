import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import * as z from 'zod'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { authClient } from 'utils/auth-client'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

const schema = z.object({
  email: z.email('Укажите корректный email'),
})

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset(
        { email: value.email, redirectTo: '/reset-password' },
        {
          onSuccess: () => setSent(true),
          onError: (ctx) => toast.error(ctx.error.message),
        },
      )
    },
  })

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-4 p-4 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Восстановление пароля</CardTitle>
            <CardDescription>
              Введите email — мы отправим ссылку для сброса пароля.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center text-sm">
                <p className="text-muted-foreground">
                  Письмо отправлено. Проверьте почту и перейдите по ссылке.
                </p>
                <Link to="/login" className="underline underline-offset-4">
                  Вернуться ко входу
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  <form.Field
                    name="email"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="email"
                            autoComplete="email"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="m@example.com"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />
                  <Field>
                    <Button type="submit" disabled={form.state.isSubmitting}>
                      Отправить ссылку
                    </Button>
                    <FieldDescription className="text-center">
                      <Link
                        to="/login"
                        className="underline underline-offset-4"
                      >
                        Вернуться ко входу
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
