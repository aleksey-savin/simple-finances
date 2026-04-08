import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { auth } from 'utils/auth'

export const fetchUsers = createServerFn().handler(async () => {
  const request = getRequest()

  return auth.api.listUsers({
    query: {
      limit: 100,
      sortBy: 'name',
      sortDirection: 'desc',
    },
    headers: request.headers,
  })
})

export const fetchUser = createServerFn()
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const request = getRequest()

    return auth.api.getUser({
      query: { id: userId },
      headers: request.headers,
    })
  })
