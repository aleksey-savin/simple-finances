import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const injectedHeadScriptsVirtualModule =
  'tanstack-start-injected-head-scripts:v'
const injectedHeadScriptsResolvedModule = `\0${injectedHeadScriptsVirtualModule}`

const config = defineConfig({
  envPrefix: ['VITE_', 'APP_'],
  plugins: [
    tanstackStart(),
    {
      name: 'tanstack-start-injected-head-scripts-fallback',
      resolveId(id) {
        if (id === injectedHeadScriptsVirtualModule) {
          return injectedHeadScriptsResolvedModule
        }
      },
      load(id) {
        if (id === injectedHeadScriptsResolvedModule) {
          return 'export const injectedHeadScripts = undefined'
        }
      },
    },
    devtools(),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      serverDir: 'server',
      experimental: { tasks: true, vite: {} },
      scheduledTasks: {
        '* * * * *': ['recurring', 'proxmox-vm-manager', 'invoice-reminders'],
      },
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    viteReact(),
  ],
})

export default config
