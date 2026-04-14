import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  contract,
  contractDocument,
  contractTypeEnum,
  document,
} from '@/db/schema'
import { normalizeBase64Payload } from '#/lib/file-upload'
import { resolveSelectedScope } from '#/lib/company-scope'
import { getS3SignedObjectUrl, uploadBase64FileToS3 } from '#/lib/s3'
import { auth } from 'utils/auth'

export const contractsQueryKey = ['contracts'] as const

const DOCUMENT_FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024
const DOCUMENT_FILE_MAX_SIZE_MB = 50

const DOCUMENT_FILE_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
] as const

const DOCUMENT_FILE_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
])

export const DOCUMENT_FILE_ACCEPT = DOCUMENT_FILE_ALLOWED_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(',')

export const fetchContracts = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  const { selectedScope } = await resolveSelectedScope(
    session.user.id,
    request.headers,
  )

  const whereClause =
    selectedScope.kind === 'company'
      ? eq(contract.companyId, selectedScope.id)
      : and(isNull(contract.companyId), eq(contract.createdBy, session.user.id))

  return db.query.contract
    .findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        number: true,
        signedAt: true,
        contractType: true,
        amount: true,
        businessLineId: true,
        counterpartyId: true,
        companyId: true,
        createdBy: true,
      },
      with: {
        businessLine: {
          columns: {
            id: true,
            name: true,
          },
        },
        counterparty: {
          columns: {
            id: true,
            name: true,
          },
        },
        contractDocuments: {
          with: {
            document: {
              columns: {
                id: true,
                name: true,
                url: true,
              },
            },
          },
        },
      },
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((rows) =>
      rows.map((row) => {
        if (row.businessLine === null) {
          throw new Error('Для договора не найдено направление')
        }
        if (row.counterparty === null) {
          throw new Error('Для договора не найден контрагент')
        }

        return {
          ...row,
          businessLine: row.businessLine,
          counterparty: row.counterparty,
          companyId: row.companyId,
          documents: row.contractDocuments.map((cd) => cd.document),
        }
      }),
    )
})

const amountItemSchema = z
  .string()
  .trim()
  .min(1, 'Введите сумму')
  .transform((value) => value.replace(',', '.'))
  .refine((value) => !Number.isNaN(Number(value)), 'Сумма должна быть числом')
  .refine((value) => Number(value) > 0, 'Сумма должна быть больше нуля')

const contractSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  number: z.string().trim().min(1, 'Укажите номер договора'),
  signedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату заключения'),
  contractType: z.enum(contractTypeEnum.enumValues),
  businessLineId: z.string().min(1, 'Выберите направление'),
  counterpartyId: z.string().min(1, 'Выберите контрагента'),
  companyId: z.string().optional(),
  amount: z.array(amountItemSchema).min(1, 'Добавьте хотя бы одну сумму'),
})

export const addContractSchema = contractSchema

const uploadDocumentSchema = z.object({
  fileName: z.string().trim().min(1, 'Выберите файл'),
  mimeType: z.string().trim().min(1, 'Не удалось определить тип файла'),
  fileSize: z.number().int().positive('Файл пустой'),
  fileBase64: z.string().trim().min(1, 'Файл пустой'),
})

export const uploadDocument = createServerFn({ method: 'POST' })
  .inputValidator(uploadDocumentSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    if (data.fileSize > DOCUMENT_FILE_MAX_SIZE_BYTES) {
      throw new Error(`Размер файла превышает ${DOCUMENT_FILE_MAX_SIZE_MB} МБ`)
    }

    const normalizedMimeType = data.mimeType.trim().toLowerCase()
    if (!DOCUMENT_FILE_ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
      throw new Error('Недопустимый формат файла')
    }

    const normalizedBase64 = normalizeBase64Payload(data.fileBase64)
    if (!normalizedBase64) {
      throw new Error('Файл пустой')
    }

    const { objectKey } = await uploadBase64FileToS3({
      fileName: data.fileName,
      mimeType: normalizedMimeType,
      fileSize: data.fileSize,
      fileBase64: normalizedBase64,
      maxSizeBytes: DOCUMENT_FILE_MAX_SIZE_BYTES,
      pathPrefix: 'contracts',
      fileNamePrefix: 'contract',
    })

    const [inserted] = await db
      .insert(document)
      .values({
        name: data.fileName,
        url: objectKey,
        uploadedBy: session.user.id,
      })
      .returning({ id: document.id, name: document.name, url: document.url })

    return inserted
  })

const resolveDocumentUrlSchema = z.object({
  documentId: z.string().min(1),
})

export const resolveDocumentUrl = createServerFn({ method: 'POST' })
  .inputValidator(resolveDocumentUrlSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const doc = await db.query.document.findFirst({
      where: eq(document.id, data.documentId),
      columns: { url: true },
    })

    if (!doc?.url) {
      throw new Error('Документ не найден')
    }

    const fileRef = doc.url.trim()

    if (/^https?:\/\//i.test(fileRef)) {
      return { url: fileRef }
    }

    const url = await getS3SignedObjectUrl({
      objectKey: fileRef,
      expiresInSeconds: 60 * 10,
    })

    return { url }
  })

const contractDocumentSchema = z.object({
  contractId: z.string().min(1),
  documentId: z.string().min(1),
})

export const addContractDocument = createServerFn({ method: 'POST' })
  .inputValidator(contractDocumentSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.insert(contractDocument).values({
      contractId: data.contractId,
      documentId: data.documentId,
    })
  })

export const removeContractDocument = createServerFn({ method: 'POST' })
  .inputValidator(contractDocumentSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db
      .delete(contractDocument)
      .where(
        and(
          eq(contractDocument.contractId, data.contractId),
          eq(contractDocument.documentId, data.documentId),
        ),
      )
  })

export const addContract = createServerFn({ method: 'POST' })
  .inputValidator(addContractSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const [inserted] = await db
      .insert(contract)
      .values({
        name: data.name,
        number: data.number,
        signedAt: data.signedAt,
        contractType: data.contractType,
        businessLineId: data.businessLineId,
        counterpartyId: data.counterpartyId,
        companyId: data.companyId ?? null,
        amount: data.amount,
        createdBy: session.user.id,
      })
      .returning({ id: contract.id })

    return { id: inserted.id }
  })

export const updateContractSchema = contractSchema.extend({
  id: z.string(),
})

export const updateContract = createServerFn({ method: 'POST' })
  .inputValidator(updateContractSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db
      .update(contract)
      .set({
        name: data.name,
        number: data.number,
        signedAt: data.signedAt,
        contractType: data.contractType,
        businessLineId: data.businessLineId,
        counterpartyId: data.counterpartyId,
        companyId: data.companyId ?? null,
        amount: data.amount,
      })
      .where(eq(contract.id, data.id))
  })

const deleteContractSchema = z.object({ id: z.string() })

export const deleteContract = createServerFn({ method: 'POST' })
  .inputValidator(deleteContractSchema)
  .handler(async ({ data }) => {
    await db.delete(contract).where(eq(contract.id, data.id))
  })
