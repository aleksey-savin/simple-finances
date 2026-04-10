import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Share2, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { useQueryClient } from '@tanstack/react-query'
import { addMember, removeMember, accountsQueryKey } from './actions'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Combobox,
  type ComboboxOption,
} from '@/components/ui/combobox'
import { Separator } from '@/components/ui/separator'
import type { Member } from '#/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Читатель',
}

const roleOptions: ComboboxOption[] = [
  { value: 'editor', label: 'Редактор' },
  { value: 'viewer', label: 'Читатель' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareAccount({
  accountId,
  accountName,
  members,
}: {
  accountId: string
  accountName: string
  members: Member[]
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!email) return
    setLoading(true)
    try {
      await addMember({ data: { accountId, email, role } })
      await router.invalidate()
      queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      setEmail('')
      toast.success('Участник добавлен')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember({ data: { memberId, accountId } })
      await router.invalidate()
      queryClient.invalidateQueries({ queryKey: accountsQueryKey })
      toast.success('Участник удалён')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Произошла ошибка')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Поделиться"
        >
          <Share2 className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поделиться — {accountName}</DialogTitle>
          <DialogDescription>
            Управляйте доступом к счёту и приглашайте участников.
          </DialogDescription>
        </DialogHeader>

        {/* Members list */}
        <div className="flex flex-col gap-1">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {m.user.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {m.user.email}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {roleLabel[m.role] ?? m.role}
                </Badge>
                {m.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    title="Удалить участника"
                    onClick={() => handleRemove(m.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Add member form */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Добавить участника</p>
          <div className="flex gap-2">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Combobox
              options={roleOptions}
              value={role}
              onValueChange={(v) => setRole(v as 'editor' | 'viewer')}
              placeholder="Выберите роль"
              className="w-36"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={loading || !email}
            size="sm"
            className="self-start"
          >
            <UserPlus className="size-4" />
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
