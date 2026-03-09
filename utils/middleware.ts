import { createMiddleware } from '@tanstack/react-start'
import { auth } from './auth'
import { redirect } from '@tanstack/react-router'

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    const url = new URL(request.url)
    const pathname = url.pathname

    const publicRoutes = ['/login', '/signup', '/api/meetings']

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
