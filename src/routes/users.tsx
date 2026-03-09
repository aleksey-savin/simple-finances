import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from 'utils/auth'

import { roleLabels } from '@/utils/roleLabels'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontalIcon } from 'lucide-react'

const fetchUsers = createServerFn().handler(async () => {
  const request = getRequest()
  const data = await auth.api.listUsers({
    query: {
      limit: 100,
      sortBy: 'name',
      sortDirection: 'desc',
    },
    headers: request.headers,
  })
  return data
})

export const Route = createFileRoute('/users')({
  loader: () => fetchUsers(),
  component: RouteComponent,
})

function RouteComponent() {
  const users = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Заблокирован</TableHead>
            <TableHead>Дата создания</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {roleLabels[user.role ?? 'user'] ?? user.role}
              </TableCell>
              <TableCell>{user.banned ? 'Да' : 'Нет'}</TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleString('ru-RU')}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontalIcon />
                      <span className="sr-only">Открыть меню</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        navigate({
                          to: '/users/$id/update',
                          params: { id: user.id },
                        })
                      }
                    >
                      Изменить
                    </DropdownMenuItem>
                    {user.banned ? (
                      <DropdownMenuItem
                        onClick={() =>
                          navigate({
                            to: '/users/$id/unban',
                            params: { id: user.id },
                          })
                        }
                      >
                        Разблокировать
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          navigate({
                            to: '/users/$id/ban',
                            params: { id: user.id },
                          })
                        }
                      >
                        Заблокировать
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        navigate({
                          to: '/users/$id/delete',
                          params: { id: user.id },
                        })
                      }
                    >
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Outlet />
    </>
  )
}
