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
  CalendarCheck,
  FileSpreadsheet,
  User,
  Wallet,
} from 'lucide-react'
import Accounts from '../accounts'
import Clients from '../clients'
import CounterParties from '../counterparties'
import Categories from '../categories'

const navMain = [
  {
    title: 'Обзор',
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
    ],
  },
  {
    title: 'Отчёты',
    items: [
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
        <div className="flex flex-col w-auto sm:hidden gap-2 mx-4">
          <Accounts />
          <Clients />
          <CounterParties />
          <Categories />
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
