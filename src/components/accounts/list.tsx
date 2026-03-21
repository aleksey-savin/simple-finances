import { Pencil, Tag } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAccounts, accountsQueryKey } from './actions'

import { Button } from '@/components/ui/button'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '../ui/item'

import { EditAccountForm } from '.'
import { DeleteAccount } from '.'
import { ShareAccount } from './share'
import type { Account } from '#/types'
import { authClient } from 'utils/auth-client'

function AccountRow({
  account,
  editingId,
  setEditingId,
}: {
  account: Account
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const { data: session } = authClient.useSession()

  const isEditing = editingId === account.id
  const isOwner = account.createdBy === session?.user.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <Tag className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>{account.name}</ItemTitle>
        </ItemContent>

        <ItemActions>
          {isOwner && (
            <ShareAccount
              accountId={account.id}
              accountName={account.name}
              members={account.members}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : account.id)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteAccount accountId={account.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="border border-t-0 rounded-b-md px-4 pb-4 -mt-0.5 bg-muted/30">
          <EditAccountForm
            account={account}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  )
}

export const AccountsList = () => {
  const { data: accounts = [] } = useQuery({
    queryKey: accountsQueryKey,
    queryFn: () => fetchAccounts(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <>
      <div className="px-6 py-3 shrink-0">
        <p className="text-sm font-medium text-muted-foreground">
          Все счета ({accounts.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Нет счетов
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
