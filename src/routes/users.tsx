import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import {
  MoreHorizontalIcon,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { fetchUsers } from '@/components/users/actions'
import { roleLabels } from '@/utils/roleLabels'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

export const Route = createFileRoute('/users')({
  loader: () => fetchUsers(),
  component: UsersPage,
})

function UsersPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  const allUsers = data.users ?? []

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>(
    'all',
  )

  const query = search.trim().toLowerCase()

  const filteredUsers = allUsers.filter((user) => {
    if (query) {
      const role = user.role ?? 'user'
      const haystack = [
        user.name ?? '',
        user.email ?? '',
        roleLabels[role] ?? role,
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(query)) return false
    }

    if (roleFilter !== 'all' && (user.role ?? 'user') !== roleFilter) {
      return false
    }

    if (statusFilter === 'active' && user.banned) return false
    if (statusFilter === 'banned' && !user.banned) return false

    return true
  })

  const hasActiveFilters =
    search.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all'

  const openUpdate = (id: string) => {
    navigate({ to: '/users/$id/update', params: { id } })
  }

  const openBan = (id: string) => {
    navigate({ to: '/users/$id/ban', params: { id } })
  }

  const openUnban = (id: string) => {
    navigate({ to: '/users/$id/unban', params: { id } })
  }

  const openDelete = (id: string) => {
    navigate({ to: '/users/$id/delete', params: { id } })
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, email или роли"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ToggleGroup
              variant="outline"
              type="single"
              value={roleFilter}
              onValueChange={(value) => {
                if (value) setRoleFilter(value as typeof roleFilter)
              }}
            >
              <ToggleGroupItem value="all">Все роли</ToggleGroupItem>
              <ToggleGroupItem value="user">Пользователь</ToggleGroupItem>
              <ToggleGroupItem value="admin">Администратор</ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              variant="outline"
              type="single"
              value={statusFilter}
              onValueChange={(value) => {
                if (value) setStatusFilter(value as typeof statusFilter)
              }}
            >
              <ToggleGroupItem value="all">Все</ToggleGroupItem>
              <ToggleGroupItem value="active">Активные</ToggleGroupItem>
              <ToggleGroupItem value="banned">Заблокированные</ToggleGroupItem>
            </ToggleGroup>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                }}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Сброс
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredUsers.length} из {allUsers.length}
            </span>
          </div>
        </Card>

        {filteredUsers.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredUsers.map((user) => {
                const role = user.role ?? 'user'

                return (
                  <Card key={user.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{user.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="secondary">
                            {roleLabels[role] ?? role}
                          </Badge>
                          {user.banned ? (
                            <Badge variant="destructive">Заблокирован</Badge>
                          ) : (
                            <Badge variant="outline">Активен</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontalIcon className="size-4" />
                            <span className="sr-only">Открыть меню</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openUpdate(user.id)}>
                            Изменить
                          </DropdownMenuItem>
                          {user.banned ? (
                            <DropdownMenuItem
                              onClick={() => openUnban(user.id)}
                            >
                              Разблокировать
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => openBan(user.id)}>
                              Заблокировать
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openDelete(user.id)}
                          >
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Имя</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Роль</TableHead>
                    <TableHead className="font-bold">Статус</TableHead>
                    <TableHead className="font-bold">Дата создания</TableHead>
                    <TableHead className="w-20 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const role = user.role ?? 'user'

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            {role === 'admin' ? (
                              <ShieldCheck className="size-4 text-primary" />
                            ) : (
                              <UserRound className="size-4 text-muted-foreground" />
                            )}
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{roleLabels[role] ?? role}</TableCell>
                        <TableCell>
                          {user.banned ? (
                            <Badge variant="destructive">Заблокирован</Badge>
                          ) : (
                            <Badge variant="outline">Активен</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontalIcon className="size-4" />
                                <span className="sr-only">Открыть меню</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openUpdate(user.id)}
                              >
                                Изменить
                              </DropdownMenuItem>
                              {user.banned ? (
                                <DropdownMenuItem
                                  onClick={() => openUnban(user.id)}
                                >
                                  Разблокировать
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => openBan(user.id)}
                                >
                                  Заблокировать
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openDelete(user.id)}
                              >
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <Outlet />
    </>
  )
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('ru-RU')
}
