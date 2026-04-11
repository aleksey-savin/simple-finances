import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { contract, contractTypeEnum } from '@/db/schema'
import { normalizeBase64Payload } from '#/lib/file-upload'
import {
  CONTRACT_FILE_MAX_SIZE_BYTES,
  normalizeContractUploadMeta,
} from '#/lib/contracts-file'
import { resolveSelectedScope } from '#/lib/company-scope'
import { getS3SignedObjectUrl, uploadBase64FileToS3 } from '#/lib/s3'
import { auth } from 'utils/auth'

export const contractsQueryKey = ['contracts'] as const

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
        fileUrl: true,
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
  signedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату заключения'),
  contractType: z.enum(contractTypeEnum.enumValues),
  fileUrl: z.string().min(1, 'Укажите ссылку или загрузите файл'),
  businessLineId: z.string().min(1, 'Выберите направление'),
  counterpartyId: z.string().min(1, 'Выберите контрагента'),
  companyId: z.string().optional(),
  amount: z.array(amountItemSchema).min(1, 'Добавьте хотя бы одну сумму'),
})

export const addContractSchema = contractSchema

const uploadContractFileSchema = z.object({
  fileName: z.string().trim().min(1, 'Выберите файл'),
  mimeType: z.string().trim().min(1, 'Не удалось определить тип файла'),
  fileSize: z.number().int().positive('Файл пустой'),
  fileBase64: z.string().trim().min(1, 'Файл пустой'),
})

export const uploadContractFile = createServerFn({ method: 'POST' })
  .inputValidator(uploadContractFileSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const normalizedMeta = normalizeContractUploadMeta({
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    })

    const normalizedBase64 = normalizeBase64Payload(data.fileBase64)
    if (!normalizedBase64) {
      throw new Error('Файл пустой')
    }

    const { objectKey } = await uploadBase64FileToS3({
      ...normalizedMeta,
      fileBase64: normalizedBase64,
      maxSizeBytes: CONTRACT_FILE_MAX_SIZE_BYTES,
      pathPrefix: `contracts/${session.user.id}`,
    })

    return { fileUrl: objectKey }
  })

const resolveContractFileUrlSchema = z.object({
  id: z.string().min(1),
})

export const resolveContractFileUrl = createServerFn({ method: 'POST' })
  .inputValidator(resolveContractFileUrlSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    const { selectedScope } = await resolveSelectedScope(
      session.user.id,
      request.headers,
    )

    const scopeWhere =
      selectedScope.kind === 'company'
        ? eq(contract.companyId, selectedScope.id)
        : and(isNull(contract.companyId), eq(contract.createdBy, session.user.id))

    const contractRow = await db.query.contract.findFirst({
      where: and(eq(contract.id, data.id), scopeWhere),
      columns: {
        fileUrl: true,
      },
    })

    if (!contractRow?.fileUrl) {
      throw new Error('Файл договора не найден')
    }

    const fileRef = contractRow.fileUrl.trim()

    if (/^https?:\/\//i.test(fileRef)) {
      return { url: fileRef }
    }

    const url = await getS3SignedObjectUrl({
      objectKey: fileRef,
      expiresInSeconds: 60 * 10,
    })

    return { url }
  })

export const addContract = createServerFn({ method: 'POST' })
  .inputValidator(addContractSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.insert(contract).values({
      name: data.name,
      number: data.number,
      signedAt: data.signedAt,
      contractType: data.contractType,
      fileUrl: data.fileUrl,
      businessLineId: data.businessLineId,
      counterpartyId: data.counterpartyId,
      companyId: data.companyId ?? null,
      amount: data.amount,
      createdBy: session.user.id,
    })
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
        fileUrl: data.fileUrl,
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
