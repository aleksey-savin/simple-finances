import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'

import { Pencil, Search, Tag, X } from 'lucide-react'

import { authClient } from 'utils/auth-client'
import { BalanceCorrection } from '@/components/accounts/balance-correction'
import { EditAccountForm } from '@/components/accounts/form-edit'
import { DeleteAccount } from '@/components/accounts/delete'
import { ShareAccount } from '@/components/accounts/share'
import { fetchAccounts } from '@/components/accounts/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { decodeHtmlEntities } from '@/lib/html-entities'

const roleLabel: Record<string, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Читатель',
}

export const Route = createFileRoute('/current-accounts')({
  loader: () => fetchAccounts(),
  component: CurrentAccountsPage,
})

function CurrentAccountsPage() {
  const accounts = Route.useLoaderData()
  const { data: session } = authClient.useSession()

  const [search, setSearch] = useState('')
  const [acceptPaymentsFilter, setAcceptPaymentsFilter] = useState<
    'all' | 'accept' | 'reject'
  >('all')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingAccount =
    accounts.find((account) => account.id === editingId) ?? null

  const query = search.trim().toLowerCase()
  const filteredAccounts = accounts.filter((account) => {
    if (query) {
      const haystack = [
        account.name,
        account.bankNameInitials ?? '',
        account.bankBik ?? '',
        account.accountNumber ?? '',
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(query)) return false
    }

    if (acceptPaymentsFilter === 'accept' && !account.acceptPayments) {
      return false
    }

    if (acceptPaymentsFilter === 'reject' && account.acceptPayments) {
      return false
    }

    return true
  })

  const hasActiveFilters =
    search.trim() !== '' || acceptPaymentsFilter !== 'all'

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по счёту, банку или БИК"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ToggleGroup
              variant="outline"
              type="single"
              value={acceptPaymentsFilter}
              onValueChange={(value) => {
                if (value) {
                  setAcceptPaymentsFilter(value as typeof acceptPaymentsFilter)
                }
              }}
            >
              <ToggleGroupItem value="all">Все</ToggleGroupItem>
              <ToggleGroupItem value="accept">Принимают</ToggleGroupItem>
              <ToggleGroupItem value="reject">Не принимают</ToggleGroupItem>
            </ToggleGroup>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setAcceptPaymentsFilter('all')
                }}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Сброс
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredAccounts.length} из {accounts.length}
            </span>
          </div>
        </Card>

        {filteredAccounts.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredAccounts.map((account) => {
                const isOwner = account.createdBy === session?.user.id

                return (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{account.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {decodeHtmlEntities(account.bankNameInitials) ?? '—'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMoney(account.balance)} ₽
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {account.acceptPayments
                            ? 'Принимает платежи'
                            : 'Не принимает платежи'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
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
                          className="size-8"
                          onClick={() => setEditingId(account.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <BalanceCorrection account={account} />
                        <DeleteAccount accountId={account.id} />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Счёт</TableHead>
                    <TableHead className="font-bold">Банк</TableHead>
                    <TableHead className="font-bold">Баланс</TableHead>
                    <TableHead className="font-bold">Роль</TableHead>
                    <TableHead className="font-bold">Платежи</TableHead>
                    <TableHead className="w-48 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const isOwner = account.createdBy === session?.user.id

                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <Tag className="size-4 text-muted-foreground" />
                            {account.name}
                          </div>
                          {account.accountNumber ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {account.accountNumber}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {decodeHtmlEntities(account.bankNameInitials) ?? '—'}
                        </TableCell>
                        <TableCell>{formatMoney(account.balance)} ₽</TableCell>
                        <TableCell>
                          {roleLabel[account.role] ?? account.role}
                        </TableCell>
                        <TableCell>
                          {account.acceptPayments ? 'Принимает' : 'Нет'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
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
                              className="size-8"
                              onClick={() => setEditingId(account.id)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <BalanceCorrection account={account} />
                            <DeleteAccount accountId={account.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={editingAccount !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование счёта</DialogTitle>
            <DialogDescription>{editingAccount?.name}</DialogDescription>
          </DialogHeader>
          {editingAccount ? (
            <EditAccountForm
              account={editingAccount}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Outlet />
    </>
  )
}

function formatMoney(value: string) {
  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
