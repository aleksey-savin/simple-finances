import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ShieldOff } from 'lucide-react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect, useRef, useState } from 'react'

import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { TooltipProvider } from '#/components/ui/tooltip'
import { AppSidebar } from '#/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { authMiddleware } from '#/utils/auth-middleware'
import { authClient } from 'utils/auth-client'
import { ThemeProvider } from '#/components/theme-provider'
import { AppHeader } from '#/components/layout/app-header'
import { Toaster } from '#/components/ui/sonner'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

const fetchRootSession = createServerFn({ method: 'GET' }).handler(async () => {
  const [{ auth }, { getRequest }] = await Promise.all([
    import('#/utils/auth.server'),
    import('#/utils/session.server'),
  ])
  const request = await getRequest()

  return auth.api.getSession({ headers: request.headers })
})

function RootError({ error }: { error: unknown }) {
  const isForbidden =
    error instanceof Error &&
    (error.message.includes('403') ||
      error.message.toLowerCase().includes('forbidden') ||
      error.message.includes('Нет доступа') ||
      error.message.includes('Не авторизован') ||
      error.message.includes('доступ'))

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <ShieldOff
          className="size-12 text-muted-foreground"
          strokeWidth={1.5}
        />
        <p className="text-6xl font-bold text-muted-foreground">403</p>
        <h1 className="text-2xl font-semibold">Доступ запрещён</h1>
        <p className="text-sm text-muted-foreground">
          У вас нет прав для просмотра этой страницы.
        </p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Вернуться на главную
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-muted-foreground">500</p>
      <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : 'Неизвестная ошибка'}
      </p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Вернуться на главную
      </Link>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="text-sm text-muted-foreground">
        Запрашиваемая страница не существует.
      </p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Вернуться на главную
      </Link>
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: () => fetchRootSession(),
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: import.meta.env.VITE_APP_TITLE || 'Портал',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  errorComponent: ({ error }) => <RootError error={error} />,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  server: {
    middleware: [authMiddleware],
  },
})

function NavigationProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  return (
    <div aria-hidden className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden">
      <div
        className="h-full w-full bg-primary transition-all duration-300"
        style={{
          transform: isLoading ? 'translateX(-20%)' : 'translateX(-100%)',
          opacity: isLoading ? 1 : 0,
        }}
      />
    </div>
  )
}

function AnimatedOutlet({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const ref = useRef<HTMLDivElement>(null)
  const prevPathname = useRef(pathname)

  if (prevPathname.current !== pathname) {
    prevPathname.current = pathname
    ref.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      easing: 'ease-out',
      fill: 'forwards',
    })
  }

  return (
    <div ref={ref} className="flex min-w-0 flex-col gap-4 p-2 sm:p-6">
      {children}
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const initialSession = Route.useLoaderData()
  const [isHydrated, setIsHydrated] = useState(false)
  const { data: clientSession, isPending } = authClient.useSession()
  const session =
    isHydrated && !isPending ? (clientSession ?? null) : initialSession

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <NavigationProgress />
        <TanStackQueryProvider>
          <ThemeProvider>
            <TooltipProvider>
              {session?.user ? (
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <AppHeader />
                    <AnimatedOutlet>{children}</AnimatedOutlet>
                  </SidebarInset>
                </SidebarProvider>
              ) : (
                <>{children}</>
              )}
            </TooltipProvider>
          </ThemeProvider>

          <Toaster richColors />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
