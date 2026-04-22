import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Link, useRouter } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NavUser } from './nav-user'
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Building,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronsUpDown,
  FileSpreadsheet,
  Folder,
  LayoutDashboard,
  List,
  ReceiptRussianRuble,
  Settings,
  TrendingUp,
  User,
  UserRound,
  Wallet,
} from 'lucide-react'
import { fetchAppScopes } from '#/components/layout/actions'

// Must match APP_SCOPE_COOKIE_NAME in lib/company-scope.ts
const SCOPE_COOKIE_NAME = 'app_scope'

export const appScopesQueryKey = ['app-scopes'] as const

const navMain = [
  {
    title: 'Обзор',
    items: [
      {
        title: 'Dashboard',
        icon: <LayoutDashboard className="size-5" />,
        url: '/dashboard',
      },
    ],
  },
  {
    title: 'Финансы',
    items: [
      {
        title: 'Все операции',
        icon: <Wallet className="size-5" />,
        url: '/transactions',
      },
      {
        title: 'Расписание платежей',
        icon: <CalendarCheck className="size-5" />,
        url: '/recurring',
      },
      {
        title: 'Банковские выписки',
        icon: <FileSpreadsheet className="size-5" />,
        url: '/bank-import',
      },
      {
        title: 'Дебиторка',
        icon: <BanknoteArrowUp className="size-5" />,
        url: '/receivables',
      },
      {
        title: 'Платежи и обязательства',
        icon: <BanknoteArrowDown className="size-5" />,
        url: '/payables',
      },
    ],
  },
  {
    title: 'CRM',
    items: [
      {
        title: 'Клиенты',
        icon: <User className="size-5" />,
        url: '/clients',
      },
    ],
  },
  {
    title: 'Инструменты',
    items: [
      {
        title: 'Ревизии цен',
        icon: <TrendingUp className="size-5" />,
        url: '/price-revisions',
        hideForPersonal: true,
      },
    ],
  },
  {
    title: 'Администрирование',
    collapsible: true,
    items: [
      {
        title: 'Бизнес-направления',
        icon: <Folder className="size-5" />,
        url: '/business-lines',
        hideForPersonal: true,
      },
      {
        title: 'Договоры',
        icon: <FileSpreadsheet className="size-5" />,
        url: '/contracts',
        hideForPersonal: true,
      },

      {
        title: 'Категории платежей',
        icon: <List className="size-5" />,
        url: '/categories',
      },

      {
        title: 'Контрагенты',
        icon: <ReceiptRussianRuble className="size-5" />,
        url: '/counterparties',
      },
      {
        title: 'Мои компании',
        icon: <Building className="size-5" />,
        url: '/companies',
      },
      {
        title: 'Пользователи',
        icon: <User className="size-5" />,
        url: '/users',
      },
      {
        title: 'Расчётные счета',
        icon: <Wallet className="size-5" />,
        url: '/current-accounts',
      },
    ],
  },
  {
    title: '',
    collapsible: false,
    items: [
      {
        title: 'Настройки',
        icon: <Settings className="size-5" />,
        url: '/preferences',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: scopeData } = useQuery({
    queryKey: appScopesQueryKey,
    queryFn: () => fetchAppScopes(),
  })

  const scopes = scopeData?.scopes ?? []
  const selectedScope =
    scopes.find((s) => s.id === scopeData?.selectedScopeId) ?? scopes[0]
  const isPersonal = selectedScope?.kind === 'personal'

  function handleScopeChange(scopeId: string) {
    document.cookie = `${SCOPE_COOKIE_NAME}=${encodeURIComponent(scopeId)}; path=/; max-age=31536000; SameSite=Lax`
    queryClient.invalidateQueries({ queryKey: appScopesQueryKey })
    router.invalidate()
  }

  const filteredNavMain = navMain
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !isPersonal || !('hideForPersonal' in item && item.hideForPersonal),
      ),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <span className="flex min-w-0 items-center gap-2">
                    {selectedScope?.kind === 'personal' ? (
                      <UserRound className="size-4 shrink-0" />
                    ) : (
                      <Building2 className="size-4 shrink-0" />
                    )}
                    <span className="truncate font-semibold">
                      {selectedScope?.name ?? '…'}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-popper-anchor-width]"
                align="start"
              >
                {scopes.map((scope) => (
                  <DropdownMenuItem
                    key={scope.id}
                    onSelect={() => handleScopeChange(scope.id)}
                    className="flex items-center gap-2"
                  >
                    {scope.kind === 'personal' ? (
                      <UserRound className="size-4 text-muted-foreground" />
                    ) : (
                      <Building2 className="size-4 text-muted-foreground" />
                    )}
                    <span>{scope.name}</span>
                    {scope.id === selectedScope?.id && (
                      <Check className="ml-auto size-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {filteredNavMain.map((group) =>
          'collapsible' in group && group.collapsible ? (
            <Collapsible key={group.title} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center">
                    {group.title}
                    <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className="flex items-center gap-2 text-base"
                          >
                            <Link to={item.url}>
                              {item.icon && <span>{item.icon}</span>}
                              {item.title}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ) : (
            <SidebarGroup key={group.title}>
              {group.title && (
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="flex items-center gap-2 text-base"
                      >
                        <Link to={item.url}>
                          {item.icon && <span>{item.icon}</span>}
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
