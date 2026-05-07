import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'

import { authClient } from 'utils/auth-client'

const rootRoute = getRouteApi('__root__')

export function useSession() {
  const initialSession = rootRoute.useLoaderData()
  const { data: clientSession, isPending } = authClient.useSession()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated && !isPending
    ? (clientSession ?? null)
    : initialSession
}
