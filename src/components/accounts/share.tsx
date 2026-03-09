import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { Share2, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import { db } from '#/db'
import { currentAccountUser, user } from '#/db/schema'
import { auth } from 'utils/auth'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// ── Helpers ──────────────────────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Читатель',
}

async function requireOwner(accountId: string) {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const ownership = await db.query.currentAccountUser.findFirst({
    where: and(
      eq(currentAccountUser.currentAccountId, accountId),
      eq(currentAccountUser.userId, session.user.id),
      eq(currentAccountUser.role, 'owner'),
    ),
  })
  if (!ownership) throw new Error('Только владелец может управлять доступом')

  return session.user.id
}

// ── Server functions ──────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  accountId: z.string(),
  email: z.string().email('Введите корректный email'),
  role: z.enum(['editor', 'viewer']),
})

const addMember = createServerFn({ method: 'POST' })
  .inputValidator(addMemberSchema)
  .handler(async ({ data }) => {
    const invitedBy = await requireOwner(data.accountId)

    const targetUser = await db.query.user.findFirst({
      where: eq(user.email, data.email),
    })
    if (!targetUser) throw new Error('Пользователь не найден')

    const existing = await db.query.currentAccountUser.findFirst({
      where: and(
        eq(currentAccountUser.currentAccountId, data.accountId),
        eq(currentAccountUser.userId, targetUser.id),
      ),
    })
    if (existing) throw new Error('Пользователь уже является участником')

    await db.insert(currentAccountUser).values({
      currentAccountId: data.accountId,
      userId: targetUser.id,
      role: data.role,
      invitedBy,
    })
  })

const removeMemberSchema = z.object({
  memberId: z.string(),
  accountId: z.string(),
})

const removeMember = createServerFn({ method: 'POST' })
  .inputValidator(removeMemberSchema)
  .handler(async ({ data }) => {
    await requireOwner(data.accountId)

    const member = await db.query.currentAccountUser.findFirst({
      where: eq(currentAccountUser.id, data.memberId),
    })
    if (member?.role === 'owner') throw new Error('Нельзя удалить владельца')

    await db
      .delete(currentAccountUser)
      .where(eq(currentAccountUser.id, data.memberId))
  })

// ── Types ─────────────────────────────────────────────────────────────────────

export type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string }
}

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
            <Select
              value={role}
              onValueChange={(v) => setRole(v as 'editor' | 'viewer')}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Редактор</SelectItem>
                <SelectItem value="viewer">Читатель</SelectItem>
              </SelectContent>
            </Select>
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
