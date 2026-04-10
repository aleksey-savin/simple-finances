import { createFileRoute, Link } from '@tanstack/react-router'
import { ShieldOff } from 'lucide-react'

export const Route = createFileRoute('/403')({
  component: ForbiddenPage,
})

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldOff className="size-12 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-6xl font-bold text-muted-foreground">403</p>
      <h1 className="text-2xl font-semibold">Доступ запрещён</h1>
      <p className="text-sm text-muted-foreground">
        У вас нет прав для просмотра этой страницы.
      </p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Вернуться на главную
      </Link>
    </div>
  )
}
