import { createServerFn } from '@tanstack/react-start'
import { getRequest } from 'utils/session'

import { auth } from 'utils/auth'

export const fetchUsers = createServerFn().handler(async () => {
  const request = await getRequest()

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
    const request = await getRequest()

    return auth.api.getUser({
      query: { id: userId },
      headers: request.headers,
    })
  })
