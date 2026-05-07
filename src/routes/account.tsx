import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { ShieldCheck, ShieldOff } from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '#/components/ui/input-otp'
import { Separator } from '#/components/ui/separator'
import { authClient } from 'utils/auth-client'
import { useSession } from '#/hooks/use-session'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

type TotpSetupStep = 'idle' | 'password' | 'qr' | 'done'
type DisableStep = 'idle' | 'confirm'

function TwoFactorSection({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  const [setupStep, setSetupStep] = useState<TotpSetupStep>('idle')
  const [disableStep, setDisableStep] = useState<DisableStep>('idle')
  const [password, setPassword] = useState('')
  const [totpUri, setTotpUri] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const startSetup = async () => {
    if (!password) return
    setLoading(true)
    const { data, error } = await authClient.twoFactor.enable({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setTotpUri(data.totpURI)
    setPassword('')
    setSetupStep('qr')
  }

  const verifyTotp = async () => {
    if (code.length !== 6) return
    setLoading(true)
    await authClient.twoFactor.verifyTotp(
      { code },
      {
        onSuccess: () => {
          toast.success('Двухфакторная аутентификация включена')
          setSetupStep('idle')
          setCode('')
          onToggle()
        },
        onError: (ctx) => {
          toast.error(ctx.error.message)
          setCode('')
        },
      },
    )
    setLoading(false)
  }

  const disable = async () => {
    if (!password) return
    setLoading(true)
    await authClient.twoFactor.disable(
      { password },
      {
        onSuccess: () => {
          toast.success('Двухфакторная аутентификация отключена')
          setDisableStep('idle')
          setPassword('')
          onToggle()
        },
        onError: (ctx) => toast.error(ctx.error.message),
      },
    )
    setLoading(false)
  }

  const cancelAll = () => {
    setSetupStep('idle')
    setDisableStep('idle')
    setPassword('')
    setCode('')
    setTotpUri('')
  }

  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-green-600" />
          <span>Двухфакторная аутентификация включена</span>
        </div>
        {disableStep === 'idle' ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setDisableStep('confirm')}
          >
            Отключить 2FA
          </Button>
        ) : (
          <div className="flex flex-col gap-3 max-w-sm">
            <p className="text-sm text-muted-foreground">
              Введите пароль для подтверждения.
            </p>
            <FieldGroup>
              <Field>
                <FieldLabel>Пароль</FieldLabel>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && disable()}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!password || loading}
                  onClick={disable}
                >
                  Отключить
                </Button>
                <Button size="sm" variant="outline" onClick={cancelAll}>
                  Отмена
                </Button>
              </div>
            </FieldGroup>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldOff className="size-4" />
        <span>Двухфакторная аутентификация отключена</span>
      </div>

      {setupStep === 'idle' && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setSetupStep('password')}
        >
          Настроить 2FA
        </Button>
      )}

      {setupStep === 'password' && (
        <div className="flex flex-col gap-3 max-w-sm">
          <p className="text-sm text-muted-foreground">
            Введите пароль, чтобы начать настройку.
          </p>
          <FieldGroup>
            <Field>
              <FieldLabel>Пароль</FieldLabel>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startSetup()}
              />
            </Field>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!password || loading}
                onClick={startSetup}
              >
                Далее
              </Button>
              <Button size="sm" variant="outline" onClick={cancelAll}>
                Отмена
              </Button>
            </div>
          </FieldGroup>
        </div>
      )}

      {setupStep === 'qr' && (
        <div className="flex flex-col gap-4 max-w-sm">
          <p className="text-sm text-muted-foreground">
            Отсканируйте QR-код в приложении-аутентификаторе (Google
            Authenticator, Authy и т.п.), затем введите 6-значный код.
          </p>
          <div className="rounded-md border p-3 w-fit bg-white">
            <QRCodeSVG value={totpUri} size={160} />
          </div>
          <div className="flex flex-col gap-3">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={verifyTotp}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={code.length !== 6 || loading}
                onClick={verifyTotp}
              >
                Подтвердить
              </Button>
              <Button size="sm" variant="outline" onClick={cancelAll}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountPage() {
  const session = useSession()
  const { refetch } = authClient.useSession()
  const user = session?.user as
    | (NonNullable<typeof session>['user'] & { twoFactorEnabled?: boolean })
    | undefined

  if (!user) return null

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Аккаунт</h1>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Имя</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-1">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Безопасность</CardTitle>
          <CardDescription>
            Управление двухфакторной аутентификацией
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSection
            enabled={user.twoFactorEnabled ?? false}
            onToggle={() => refetch()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
