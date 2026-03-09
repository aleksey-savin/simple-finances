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

const navMain = [
  {
    title: 'Обзор',
    items: [
      {
        title: 'Лента',
        url: '/',
      },
      {
        title: 'Расписание',
        url: '/recurring',
      },
    ],
  },
  {
    title: 'Задолженности',
    items: [
      {
        title: 'Дебиторка',
        url: '/receivables',
      },
      {
        title: 'Кредиторка',
        url: '/payables',
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
                    <SidebarMenuButton asChild className="text-base">
                      <Link to={child.url}>{child.title}</Link>
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
