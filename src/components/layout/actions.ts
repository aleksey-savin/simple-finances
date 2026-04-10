import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { resolveSelectedScope } from '#/lib/company-scope'
import { auth } from 'utils/auth'

export const fetchAppScopes = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    throw new Error('Не авторизован')
  }

  const { scopes, selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  return {
    scopes: scopes.map(({ id, name, kind }) => ({ id, name, kind })),
    selectedScopeId: selectedScope.id,
  }
})
