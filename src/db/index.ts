import type { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres'

import * as schema from './schema.ts'

type Database = ReturnType<typeof drizzleNodePostgres>

function createBrowserDatabaseProxy(): Database {
  return new Proxy(
    {},
    {
      get() {
        throw new Error('Database access is only available on the server')
      },
    },
  ) as Database
}

export const db: Database = import.meta.env.SSR
  ? (await import('drizzle-orm/node-postgres')).drizzle(
      process.env.DATABASE_URL!,
      { schema },
    )
  : createBrowserDatabaseProxy()
