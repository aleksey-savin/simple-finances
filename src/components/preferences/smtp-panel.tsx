import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveSmtpSettings, testSmtpConnection } from './actions'

const smtpFormSchema = z.object({
  host: z.string().min(1, 'Укажите адрес сервера'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  encryption: z.enum(['none', 'starttls', 'ssl']),
  username: z.string().min(1, 'Укажите имя пользователя'),
  password: z.string().min(1, 'Укажите пароль'),
  fromName: z.string().min(1, 'Укажите имя отправителя'),
  fromEmail: z.string().email('Укажите корректный email'),
})

type EncryptionMode = 'none' | 'starttls' | 'ssl'

function encryptionToSettings(mode: EncryptionMode): { secure: boolean; port: number } {
  if (mode === 'ssl') return { secure: true, port: 465 }
  if (mode === 'starttls') return { secure: false, port: 587 }
  return { secure: false, port: 25 }
}

function settingsToEncryption(secure: boolean, port: number): EncryptionMode {
  if (secure) return 'ssl'
  if (port === 587) return 'starttls'
  return 'none'
}

type SmtpSettings = {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromName: string
  fromEmail: string
} | null

type SmtpFormProps = { settings: SmtpSettings }

function SmtpForm({ settings }: SmtpFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const initialEncryption = settings
    ? settingsToEncryption(settings.secure, settings.port)
    : 'starttls'

  const form = useForm({
    defaultValues: {
      host: settings?.host ?? '',
      port: settings?.port ?? 587,
      secure: settings?.secure ?? false,
      encryption: initialEncryption as EncryptionMode,
      username: settings?.username ?? '',
      password: settings?.password ?? '',
      fromName: settings?.fromName ?? '',
      fromEmail: settings?.fromEmail ?? '',
    },
    validators: { onSubmit: smtpFormSchema },
    onSubmit: async ({ value }) => {
      const { encryption, ...rest } = value
      const { secure, port } = encryptionToSettings(encryption)
      try {
        await saveSmtpSettings({ data: { ...rest, secure, port } })
        router.invalidate()
        toast.success('Настройки SMTP сохранены')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  async function handleSendTest() {
    if (!testEmail) return
    setIsSendingTest(true)
    try {
      await testSmtpConnection({ data: { to: testEmail } })
      toast.success(`Тестовое письмо отправлено на ${testEmail}`)
      setTestDialogOpen(false)
      setTestEmail('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка отправки')
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="grid gap-4 max-w-lg">
          <form.Field
            name="host"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Сервер (SMTP host)</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="smtp.example.com"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="encryption"
            children={(field) => (
              <Field>
                <FieldLabel>Шифрование</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => {
                    const mode = val as EncryptionMode
                    field.handleChange(mode)
                    const { port, secure } = encryptionToSettings(mode)
                    form.setFieldValue('port', port)
                    form.setFieldValue('secure', secure)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без шифрования (порт 25)</SelectItem>
                    <SelectItem value="starttls">STARTTLS (порт 587)</SelectItem>
                    <SelectItem value="ssl">SSL/TLS (порт 465)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <form.Field
            name="port"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Порт</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    max={65535}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="username"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Пользователь</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="user@example.com"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="password"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Пароль</FieldLabel>
                  <div className="relative">
                    <Input
                      id={field.name}
                      type={showPassword ? 'text' : 'password'}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="fromName"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Имя отправителя</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Моя компания"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="fromEmail"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Email отправителя</FieldLabel>
                  <Input
                    id={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="noreply@example.com"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <div className="flex gap-2 pt-2">
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение…' : 'Сохранить'}
                </Button>
              )}
            />
            {settings && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestDialogOpen(true)}
              >
                <Mail className="size-4" />
                Тест отправки
              </Button>
            )}
          </div>
        </div>
      </form>

      <Dialog
        open={testDialogOpen}
        onOpenChange={(open) => {
          setTestDialogOpen(open)
          if (!open) setTestEmail('')
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Тест отправки письма</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Field>
              <FieldLabel htmlFor="test-email">Email получателя</FieldLabel>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendTest()
                }}
                placeholder="test@example.com"
                autoFocus
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSendTest} disabled={isSendingTest || !testEmail}>
              {isSendingTest ? 'Отправка…' : 'Отправить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SmtpPreferencesPanel({ settings }: SmtpFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройки SMTP</CardTitle>
        <CardDescription>
          Исходящий почтовый сервер для отправки писем из системы
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SmtpForm settings={settings} />
      </CardContent>
    </Card>
  )
}
