export async function getRequest() {
  const mod = await import('@tanstack/react-start/server')
  return mod.getRequest()
}

export async function requireSession() {
  const [{ auth }, request] = await Promise.all([import('./auth'), getRequest()])
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw new Error('Не авторизован')
  return session
}
