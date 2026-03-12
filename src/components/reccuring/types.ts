// Manually typed to match the Drizzle query result in fetchRecurringData,
// avoiding a circular import between the route and the card component.

export type RuleWithRelations = {
  id: string
  type: string
  amount: string
  description: string
  categoryId: string
  currentAccountId: string
  cronExpression: string
  dueDaysFromCreation: number | null
  isActive: boolean
  lastRunAt: Date | null
  nextRunAt: Date | null
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
  category: { id: string; name: string }
  currentAccount: { id: string; name: string }
}
