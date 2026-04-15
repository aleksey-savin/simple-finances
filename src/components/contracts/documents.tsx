import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import {
  DocumentUploader,
  type DocumentItem,
} from '@/components/ui/document-uploader'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  addContractDocument,
  contractsQueryKey,
  DOCUMENT_FILE_ACCEPT,
  removeContractDocument,
  uploadDocument,
} from './actions'

type ContractDocumentsProps = {
  contractId: string
  documents: DocumentItem[]
  onRefresh?: () => Promise<void>
}

export function ContractDocuments({
  contractId,
  documents: initialDocuments,
  onRefresh,
}: ContractDocumentsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)

  const refresh = async () => {
    if (onRefresh) {
      await onRefresh()
    } else {
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: contractsQueryKey })
    }
  }

  const handleUpload = async (file: File, base64: string) => {
    const doc = await uploadDocument({
      data: {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileBase64: base64,
      },
    })
    await addContractDocument({ data: { contractId, documentId: doc.id } })
    setDocuments((prev) => [...prev, doc])
    await refresh()
    return doc
  }

  const handleRemove = async (doc: DocumentItem) => {
    await removeContractDocument({ data: { contractId, documentId: doc.id } })
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    await refresh()
  }

  return (
    <Field>
      <FieldLabel>Документы</FieldLabel>
      <DocumentUploader
        documents={documents}
        onUpload={handleUpload}
        onRemove={handleRemove}
        accept={DOCUMENT_FILE_ACCEPT}
      />
    </Field>
  )
}
