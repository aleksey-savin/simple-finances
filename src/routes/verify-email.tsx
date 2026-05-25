import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
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
import { useSession } from '#/hooks/use-session'
import { authClient } from 'utils/auth-client'

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const sentRef = useRef(false)

  const email = session?.user.email

  const sendOtp = async () => {
    if (!email) return
    setSending(true)
    await authClient.emailOtp.sendVerificationOtp(
      { email, type: 'email-verification' },
      {
        onSuccess: () => {
          toast.success('Код отправлен на вашу почту')
        },
        onError: (ctx) => {
          toast.error(ctx.error.message)
        },
      },
    )
    setSending(false)
  }

  useEffect(() => {
    if (!email || sentRef.current) return
    sentRef.current = true
    void sendOtp()
  }, [email])

  const verify = async () => {
    if (!email || code.length !== 6) return
    setLoading(true)
    await authClient.emailOtp.verifyEmail(
      { email, otp: code },
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

  const signOut = async () => {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  if (!email) return null

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-4 p-4 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Подтверждение входа</CardTitle>
            <CardDescription>
              Мы отправили 6-значный код на {email}.
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
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={sending}
                  onClick={sendOtp}
                >
                  Отправить ещё раз
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Выйти
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
