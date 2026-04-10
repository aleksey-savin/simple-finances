import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Loader2, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  fetchCompanyMembers,
  addCompanyMember,
  removeCompanyMember,
  companyMembersQueryKey,
  companiesQueryKey,
} from './actions'
import { fetchUsers } from '#/components/users/actions'

const ROLE_OPTIONS = [
  { value: 'member', label: 'Участник' },
  { value: 'owner', label: 'Владелец' },
  { value: 'viewer', label: 'Наблюдатель' },
]

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
}

export function CompanyMembers({ companyId }: { companyId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')
  const [isAdding, setIsAdding] = useState(false)

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: companyMembersQueryKey(companyId),
    queryFn: () => fetchCompanyMembers({ data: { companyId } }),
  })

  const { data: usersResponse } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => fetchUsers(),
  })

  const allUsers = usersResponse?.users ?? []
  const memberUserIds = new Set(members.map((m) => m.userId))

  const availableUserOptions = allUsers
    .filter((u) => !memberUserIds.has(u.id))
    .map((u) => ({
      value: u.id,
      label: u.name ?? u.email,
      description: u.email,
    }))

  async function handleAdd() {
    if (!selectedUserId) {
      toast.error('Выберите пользователя')
      return
    }

    setIsAdding(true)
    try {
      await addCompanyMember({
        data: { companyId, userId: selectedUserId, role: selectedRole },
      })
      setSelectedUserId('')
      setSelectedRole('member')
      await queryClient.invalidateQueries({
        queryKey: companyMembersQueryKey(companyId),
      })
      queryClient.invalidateQueries({ queryKey: companiesQueryKey })
      router.invalidate()
      toast.success('Пользователь добавлен в компанию')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(userId: string, name: string) {
    try {
      await removeCompanyMember({ data: { companyId, userId } })
      await queryClient.invalidateQueries({
        queryKey: companyMembersQueryKey(companyId),
      })
      queryClient.invalidateQueries({ queryKey: companiesQueryKey })
      router.invalidate()
      toast.success(`${name} удалён из компании`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <p className="text-sm font-medium">Участники компании</p>

      {membersLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Загрузка...
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет участников</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {roleLabel(member.role)}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(member.userId, member.name)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Добавить участника
        </p>

        <Field>
          <FieldLabel>Пользователь</FieldLabel>
          <Combobox
            options={availableUserOptions}
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            placeholder="Выберите пользователя"
            searchPlaceholder="Поиск по имени или email..."
            emptyText="Нет доступных пользователей"
          />
        </Field>

        <Field>
          <FieldLabel>Роль</FieldLabel>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button
          type="button"
          size="sm"
          className="gap-1.5 self-start"
          onClick={handleAdd}
          disabled={isAdding || !selectedUserId}
        >
          {isAdding ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <UserPlus className="size-3.5" />
          )}
          Добавить
        </Button>
      </div>
    </div>
  )
}
