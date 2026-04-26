import { createFileRoute } from '@tanstack/react-router'
import { Bell, Mail, Server } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchSmtpSettings } from '@/components/preferences/actions'
import { SmtpPreferencesPanel } from '@/components/preferences/smtp-panel'
import {
  ProxmoxPreferencesPanel,
  NotificationsPreferencesPanel,
} from '@/components/preferences/proxmox-panel'

export const Route = createFileRoute('/preferences')({
  loader: () => fetchSmtpSettings(),
  component: PreferencesPage,
})

function PreferencesPage() {
  const settings = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6 p-4">
      <Tabs defaultValue="smtp">
        <TabsList>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="size-4" />
            SMTP-сервер
          </TabsTrigger>
          <TabsTrigger value="proxmox" className="flex items-center gap-2">
            <Server className="size-4" />
            Proxmox
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="size-4" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smtp">
          <SmtpPreferencesPanel settings={settings} />
        </TabsContent>

        <TabsContent value="proxmox">
          <ProxmoxPreferencesPanel />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsPreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
