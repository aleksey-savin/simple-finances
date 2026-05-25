import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

import { auth } from './auth.server'

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    const url = new URL(request.url)
    const pathname = url.pathname

    const publicRoutes = [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/two-factor',
      '/verify-email',
    ]

    if (
      !session &&
      !publicRoutes.includes(pathname) &&
      !pathname.startsWith('/api/auth')
    ) {
      throw redirect({ to: '/login' })
    }

    if (
      session &&
      !session.session.secondFactorVerified &&
      pathname !== '/verify-email' &&
      !pathname.startsWith('/api/auth')
    ) {
      throw redirect({ to: '/verify-email' })
    }

    return await next()
  },
)
