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

import { Link } from '@tanstack/react-router'
import { NavUser } from './nav-user'
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Building,
  CalendarCheck,
  FileSpreadsheet,
  Folder,
  LayoutDashboard,
  List,
  ReceiptRussianRuble,
  User,
  Wallet,
} from 'lucide-react'

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
    title: 'Справочники',
    items: [
      {
        title: 'Бизнес-направления',
        icon: <Folder className="size-5" />,
        url: '/business-lines',
      },
      {
        title: 'Договоры',
        icon: <FileSpreadsheet className="size-5" />,
        url: '/contracts',
      },
      {
        title: 'Категории платежей',
        icon: <List className="size-5" />,
        url: '/categories',
      },
      {
        title: 'Клиенты',
        icon: <User className="size-5" />,
        url: '/clients',
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
        title: 'Расчётные счета',
        icon: <Wallet className="size-5" />,
        url: '/current-accounts',
      },
    ],
  },
  {
    title: 'Администрирование',
    items: [
      {
        title: 'Пользователи',
        icon: <User className="size-5" />,
        url: '/users',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader></SidebarHeader>
      <SidebarContent>
        {navMain.map((item) => (
          <SidebarGroup key={item.title}>
            {item.title && <SidebarGroupLabel>{item.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((child) => (
                  <SidebarMenuItem key={child.title}>
                    <SidebarMenuButton
                      asChild
                      className="flex items-center gap-2 text-base"
                    >
                      <Link to={child.url}>
                        {child.icon && <span>{child.icon}</span>}
                        {child.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
