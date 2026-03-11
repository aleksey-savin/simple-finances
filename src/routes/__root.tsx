import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { TooltipProvider } from '#/components/ui/tooltip'
import { AppSidebar } from '#/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { authMiddleware } from 'utils/middleware'
import { authClient } from 'utils/auth-client'
import { Separator } from '#/components/ui/separator'
import { AppBreadcrumb } from '#/components/app-breadcrumb'
import { ModeToggle } from '#/components/mode-toggle'
import { ThemeProvider } from '#/components/theme-provider'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

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
        title: 'Доходы / расходы',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  server: {
    middleware: [authMiddleware],
  },
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>
          <ThemeProvider>
            <TooltipProvider>
              {isPending ? null : session?.user ? (
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <header
                      className={`flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between`}
                    >
                      <div className="flex gap-4 items-center">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                          orientation="vertical"
                          className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <AppBreadcrumb />
                      </div>
                      <ModeToggle />
                    </header>
                    <div className="flex flex-col gap-4 p-8">{children}</div>
                  </SidebarInset>

                  {/* <main className="container flex flex-col gap-4 px-4 pb-8 pt-14">
                  {children}
                </main> */}
                </SidebarProvider>
              ) : (
                <>{children}</>
              )}
            </TooltipProvider>
          </ThemeProvider>

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
