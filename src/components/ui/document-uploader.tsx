import { useState } from 'react'
import { Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { readFileAsBase64 } from '#/lib/file-upload'
import { Button } from './button'
import { Input } from './input'

export type DocumentItem = {
  id: string
  name: string
  url: string
}

type DocumentUploaderProps = {
  documents: DocumentItem[]
  onUpload: (file: File, base64: string) => Promise<DocumentItem>
  onRemove: (doc: DocumentItem) => Promise<void>
  accept?: string
  disabled?: boolean
}

export function DocumentUploader({
  documents,
  onUpload,
  onRemove,
  accept,
  disabled,
}: DocumentUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      setIsUploading(true)
      for (const file of selectedFiles) {
        const base64 = await readFileAsBase64(file)
        await onUpload(file, base64)
      }
      setSelectedFiles([])
      setInputKey((k) => k + 1)
      toast.success(
        selectedFiles.length === 1
          ? 'Файл загружен'
          : `Загружено файлов: ${selectedFiles.length}`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Не удалось загрузить файл',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async (doc: DocumentItem) => {
    try {
      setRemovingId(doc.id)
      await onRemove(doc)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Не удалось удалить документ',
      )
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.length > 0 && (
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{doc.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                title="Удалить документ"
                disabled={disabled || removingId === doc.id}
                onClick={() => handleRemove(doc)}
              >
                {removingId === doc.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-md border border-dashed p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            key={inputKey}
            type="file"
            accept={accept}
            multiple
            className="h-auto cursor-pointer py-2"
            disabled={disabled || isUploading}
            onChange={(event) => {
              setSelectedFiles(Array.from(event.target.files ?? []))
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleUpload}
            disabled={disabled || selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {isUploading
              ? 'Загрузка...'
              : selectedFiles.length > 1
                ? `Загрузить (${selectedFiles.length})`
                : 'Загрузить'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. До 50 МБ.
        </p>
      </div>
    </div>
  )
}
