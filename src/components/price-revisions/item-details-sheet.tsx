import { useState } from 'react'
import { Eye, ExternalLink, Loader2, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { resolveDocumentUrl } from '@/components/contracts/actions'
import type { PriceRevisionItemRow } from '@/types'

type DocumentLink = { id: string; name: string }

function ContractDocumentLinks({ documents }: { documents: DocumentLink[] }) {
  const [openingId, setOpeningId] = useState<string | null>(null)

  if (documents.length === 0) return null

  const handleOpen = async (documentId: string) => {
    const popup = window.open('about:blank', '_blank')
    if (!popup) {
      toast.error('Браузер заблокировал всплывающее окно')
      return
    }
    try {
      setOpeningId(documentId)
      const { url } = await resolveDocumentUrl({ data: { documentId } })
      popup.location.replace(url)
    } catch (error) {
      popup.close()
      toast.error(
        error instanceof Error ? error.message : 'Не удалось открыть документ',
      )
    } finally {
      setOpeningId((prev) => (prev === documentId ? null : prev))
    }
  }

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {documents.map((doc) => (
        <button
          key={doc.id}
          type="button"
          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          disabled={openingId === doc.id}
          onClick={() => void handleOpen(doc.id)}
        >
          {openingId === doc.id ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ExternalLink className="size-3" />
          )}
          {doc.name}
        </button>
      ))}
    </div>
  )
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(date))
}

function formatSignedDate(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

function Chronology({ item }: { item: PriceRevisionItemRow }) {
  const status = item.status
  const hasAgreed = ['agreed', 'notified', 'signed', 'success'].includes(status)
  const hasSent = ['notified', 'signed', 'success'].includes(status)
  const hasSigned = ['signed', 'success'].includes(status)

  const rows = [
    hasAgreed && item.agreedAt
      ? { label: 'Согласовано', date: item.agreedAt }
      : null,
    hasSent && item.notifiedAt
      ? { label: 'Документы отправлены', date: item.notifiedAt }
      : null,
    hasSigned && item.signedAt
      ? { label: 'Документы подписаны', date: item.signedAt }
      : null,
    status === 'success' && item.completedAt
      ? { label: 'Завершён', date: item.completedAt }
      : null,
  ].filter((r): r is { label: string; date: Date } => r !== null)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Нет событий</p>
  }

  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((r) => (
        <span
          key={r.label}
          className="text-xs text-muted-foreground tabular-nums"
        >
          {r.label}: {formatDate(r.date)}
        </span>
      ))}
    </div>
  )
}

export function RevisionItemDetailsCell({
  item,
}: {
  item: PriceRevisionItemRow
}) {
  const [open, setOpen] = useState(false)
  const { counterparty } = item.contract
  const { client, contacts } = counterparty

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Подробнее"
        >
          <Eye className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Подробнее</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              Договор
            </h3>
            <div className="font-medium">{item.contract.name}</div>
            {item.contract.number && (
              <div className="text-xs text-muted-foreground">
                №{item.contract.number}
              </div>
            )}
            {item.contract.signedAt && (
              <div className="text-xs text-muted-foreground">
                Дата подписания: {formatSignedDate(item.contract.signedAt)}
              </div>
            )}
            <ContractDocumentLinks documents={item.contract.documents} />
          </section>

          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              Контрагент
            </h3>
            {client ? (
              <>
                <div className="font-medium">{client.name}</div>
                <div className="text-xs text-muted-foreground">
                  ({counterparty.name})
                </div>
              </>
            ) : (
              <div className="font-medium">{counterparty.name}</div>
            )}
            {contacts.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {contacts.map((c) => (
                  <div key={c.id} className="text-xs text-muted-foreground">
                    <span>{c.name}</span>
                    {c.position && (
                      <span className="ml-1 opacity-70">{c.position}</span>
                    )}
                    <div className="flex flex-wrap gap-x-2">
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-0.5 hover:text-foreground"
                        >
                          <Phone className="size-2.5" />
                          {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-0.5 hover:text-foreground"
                        >
                          <Mail className="size-2.5" />
                          {c.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {item.managers.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                Менеджеры
              </h3>
              {item.managers.map((m) => (
                <span key={m.userId} className="text-sm">
                  {m.name}
                </span>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              Хронология
            </h3>
            <Chronology item={item} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
