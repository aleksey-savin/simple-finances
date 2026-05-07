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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { authClient } from 'utils/auth-client'

type TwoFactorMethod = 'totp' | 'email'

export const Route = createFileRoute('/two-factor')({
  validateSearch: (search: Record<string, unknown>) => ({
    method: search.method === 'email' ? 'email' : 'totp',
    emailSent: search.emailSent === true || search.emailSent === 'true',
  }),
  component: TwoFactorPage,
})

function TotpTab() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    await authClient.twoFactor.verifyTotp(
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

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-muted-foreground text-sm text-center">
        Введите 6-значный код из приложения-аутентификатора.
      </p>
      <InputOTP
        maxLength={6}
        value={code}
        onChange={setCode}
        onComplete={verify}
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
    </div>
  )
}

function EmailOtpTab({ sent }: { sent: boolean }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    setLoading(true)
    await authClient.twoFactor.sendOtp(undefined, {
      onSuccess: () =>
        navigate({
          to: '/two-factor',
          search: { method: 'email', emailSent: true },
          replace: true,
        }),
      onError: (ctx) => {
        toast.error(ctx.error.message)
      },
    })
    setLoading(false)
  }

  const verify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    await authClient.twoFactor.verifyOtp(
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

  return (
    <div className="flex flex-col items-center gap-4">
      {sent ? (
        <>
          <p className="text-muted-foreground text-sm text-center">
            Код отправлен на вашу почту. Введите его ниже.
          </p>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={verify}
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
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm text-center">
            Мы отправим одноразовый код на вашу электронную почту.
          </p>
          <Button className="w-full" disabled={loading} onClick={sendOtp}>
            Отправить код
          </Button>
        </>
      )}
    </div>
  )
}

function TwoFactorPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  const selectMethod = (method: string) => {
    const nextMethod: TwoFactorMethod = method === 'email' ? 'email' : 'totp'
    navigate({
      to: '/two-factor',
      search: {
        method: nextMethod,
        emailSent: nextMethod === 'email' ? search.emailSent : false,
      },
      replace: true,
    })
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-4 p-4 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Двухфакторная аутентификация
            </CardTitle>
            <CardDescription>Подтвердите вашу личность.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={search.method} onValueChange={selectMethod}>
              <TabsList className="w-full">
                <TabsTrigger value="totp" className="flex-1">
                  Приложение
                </TabsTrigger>
                <TabsTrigger value="email" className="flex-1">
                  Email
                </TabsTrigger>
              </TabsList>
              <TabsContent value="totp" className="pt-4">
                <TotpTab />
              </TabsContent>
              <TabsContent value="email" className="pt-4">
                <EmailOtpTab sent={search.emailSent} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
