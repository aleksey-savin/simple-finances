import { createMiddleware } from '@tanstack/react-start'
import z from 'zod'

import {
  normalizeBase64Payload,
  sanitizeUploadFileName,
} from '#/lib/file-upload'

const base64FileUploadInputSchema = z.object({
  fileName: z.string().trim().min(1, 'Выберите файл'),
  mimeType: z.string().trim().min(1, 'Не удалось определить тип файла'),
  fileSize: z.number().int().positive('Файл пустой'),
  fileBase64: z.string().trim().min(1, 'Файл пустой'),
})

export const requireSessionUserServerFnMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const [{ auth }, { getRequest }] = await Promise.all([
    import('./auth'),
    import('@tanstack/react-start/server'),
  ])
  const request = await getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  return next({
    context: {
      sessionUserId: session.user.id,
    },
  })
})

export const base64FileUploadServerFnMiddleware = createMiddleware({
  type: 'function',
})
  .inputValidator(base64FileUploadInputSchema)
  .server(async ({ data, next }) => {
    const normalizedFileName = sanitizeUploadFileName(data.fileName)
    if (!normalizedFileName) {
      throw new Error('Некорректное имя файла')
    }

    const normalizedMimeType = data.mimeType.trim().toLowerCase()
    if (!normalizedMimeType) {
      throw new Error('Не удалось определить тип файла')
    }

    const normalizedBase64 = normalizeBase64Payload(data.fileBase64)
    if (!normalizedBase64) {
      throw new Error('Файл пустой')
    }

    return next({
      context: {
        uploadFile: {
          fileName: normalizedFileName,
          mimeType: normalizedMimeType,
          fileSize: data.fileSize,
          fileBase64: normalizedBase64,
        },
      },
    })
  })
