import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const { auth } = await import('./auth')
    const session = await auth.api.getSession({ headers: request.headers })
    const url = new URL(request.url)
    const pathname = url.pathname

    const publicRoutes = [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/two-factor',
    ]

    if (
      !session &&
      !publicRoutes.includes(pathname) &&
      !pathname.startsWith('/api/auth')
    ) {
      throw redirect({ to: '/login' })
    }
    return await next()
  },
)
