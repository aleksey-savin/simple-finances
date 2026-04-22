import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'

import { db } from '#/db'
import { clientCounterparty, contact, contract } from '#/db/schema'

export type ContractNotificationContext = {
  contractId: string
  contractLabel: string
  toEmail: string
  contactName: string
}

export function formatDateRu(value: Date | string) {
  return new Intl.DateTimeFormat('ru-RU').format(new Date(value))
}

export async function getContractNotificationContext(
  contractId: string,
): Promise<ContractNotificationContext | null> {
  const contractRow = await db.query.contract.findFirst({
    where: eq(contract.id, contractId),
    columns: { id: true, name: true, number: true, counterpartyId: true },
  })

  if (!contractRow) return null

  const clientLinks = await db
    .select({ clientId: clientCounterparty.clientId })
    .from(clientCounterparty)
    .where(eq(clientCounterparty.counterpartyId, contractRow.counterpartyId))
    .limit(10)

  if (clientLinks.length === 0) return null

  const contacts = await db
    .select({ email: contact.email, name: contact.name })
    .from(contact)
    .where(
      and(
        inArray(
          contact.clientId,
          clientLinks.map((row) => row.clientId),
        ),
        isNotNull(contact.email),
      ),
    )
    .orderBy(asc(contact.createdAt))
    .limit(1)

  if (contacts.length === 0 || !contacts[0].email) return null

  const contractLabel = contractRow.name

  return {
    contractId: contractRow.id,
    contractLabel,
    toEmail: contacts[0].email,
    contactName: contacts[0].name,
  }
}
