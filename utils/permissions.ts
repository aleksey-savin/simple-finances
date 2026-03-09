import { createAccessControl } from 'better-auth/plugins/access'
import {
  defaultStatements,
  adminAc,
  userAc,
} from 'better-auth/plugins/admin/access'
/**
 * make sure to use `as const` so typescript can infer the type correctly
 */
const statement = {
  ...defaultStatements,
} as const

export const ac = createAccessControl(statement)

export const user = ac.newRole({ ...userAc.statements })

export const admin = ac.newRole({
  ...adminAc.statements,
})
