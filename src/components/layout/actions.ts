import { createServerFn } from '@tanstack/react-start'

import { resolveSelectedScope } from '#/lib/company-scope'
import { getRequest, requireSession } from '#/utils/session.server'

export const fetchAppScopes = createServerFn().handler(async () => {
  const session = await requireSession()
  const request = await getRequest()

  const { scopes, selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  return {
    scopes: scopes.map(({ id, name, kind }) => ({ id, name, kind })),
    selectedScopeId: selectedScope.id,
  }
})
