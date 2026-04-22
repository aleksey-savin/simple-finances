import { defineTask } from 'nitro/task'
import { runProxmoxVmManager } from '#/lib/proxmox-vm-manager'

export default defineTask({
  meta: {
    name: 'proxmox-vm-manager',
    description:
      'Suspends VMs bound to contracts with overdue invoices; resumes when paid.',
  },

  async run() {
    const result = await runProxmoxVmManager({ source: 'task' })
    return { result }
  },
})
