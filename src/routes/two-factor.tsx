import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '#/components/ui/input-otp'
import { authClient } from 'utils/auth-client'

export const Route = createFileRoute('/two-factor')({
  component: TwoFactorPage,
})

type Mode = 'totp' | 'otp'

function TwoFactorPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('totp')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  const verify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    const call =
      mode === 'totp'
        ? authClient.twoFactor.verifyTotp
        : authClient.twoFactor.verifyOtp
    await call(
      { code },
      {
        onSuccess: () => navigate({ to: '/dashboard' }),
        onError: (ctx) => {
          toast.error(ctx.error.message)
          setCode('')
        },
      },
    )
    setLoading(false)
  }

  const switchToEmail = async () => {
    setLoading(true)
    await authClient.twoFactor.sendOtp(undefined, {
      onSuccess: () => {
        setMode('otp')
        setOtpSent(true)
        setCode('')
        toast.success('Код отправлен на вашу почту')
      },
      onError: (ctx) => {
        toast.error(ctx.error.message)
      },
    })
    setLoading(false)
  }

  const switchToTotp = () => {
    setMode('totp')
    setCode('')
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-4 p-4 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Двухфакторная аутентификация
            </CardTitle>
            <CardDescription>
              {mode === 'totp'
                ? 'Введите код из приложения-аутентификатора.'
                : 'Введите код, который мы отправили на вашу почту.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={verify}
                autoFocus
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button
                className="w-full"
                disabled={code.length !== 6 || loading}
                onClick={verify}
              >
                Подтвердить
              </Button>
              {mode === 'totp' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={switchToEmail}
                >
                  Отправить код на почту
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loading || !otpSent}
                    onClick={switchToEmail}
                  >
                    Отправить ещё раз
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={switchToTotp}
                  >
                    Вернуться к приложению
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
