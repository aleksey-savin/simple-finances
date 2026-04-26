import '@tanstack/react-start/server-only'

import { getRequest as getServerRequest } from '@tanstack/react-start/server'

import { auth } from './auth.server'

export async function getRequest() {
  return getServerRequest()
}

export async function requireSession() {
  const request = await getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw new Error('Не авторизован')
  return session
}
