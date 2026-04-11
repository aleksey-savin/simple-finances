import { extractFileExtension, sanitizeUploadFileName } from './file-upload'

export const CONTRACT_FILE_MAX_SIZE_BYTES = 20 * 1024 * 1024

export const CONTRACT_FILE_MAX_SIZE_MB = Math.round(
  CONTRACT_FILE_MAX_SIZE_BYTES / (1024 * 1024),
)

export const CONTRACT_FILE_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
] as const

export const CONTRACT_FILE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
] as const

const extensionToMimeTypeMap: Record<
  (typeof CONTRACT_FILE_ALLOWED_EXTENSIONS)[number],
  (typeof CONTRACT_FILE_ALLOWED_MIME_TYPES)[number]
> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export const CONTRACT_FILE_ACCEPT = CONTRACT_FILE_ALLOWED_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',')

export function extractContractFileExtension(fileName: string): string | null {
  return extractFileExtension(fileName)
}

export function resolveContractFileMimeTypeByExtension(
  extension: string | null | undefined,
): string | null {
  if (!extension) return null
  const normalized = extension.toLowerCase()
  if (!(normalized in extensionToMimeTypeMap)) return null
  return extensionToMimeTypeMap[
    normalized as keyof typeof extensionToMimeTypeMap
  ]
}

const contractFileMimeTypeSet = new Set<string>(CONTRACT_FILE_ALLOWED_MIME_TYPES)
const contractFileExtensionSet = new Set<string>(CONTRACT_FILE_ALLOWED_EXTENSIONS)

export function normalizeContractUploadMeta(input: {
  fileName: string
  mimeType: string
  fileSize: number
}): {
  fileName: string
  mimeType: string
  fileSize: number
} {
  if (input.fileSize > CONTRACT_FILE_MAX_SIZE_BYTES) {
    throw new Error('Размер файла превышает 20 МБ')
  }

  const normalizedName = sanitizeUploadFileName(input.fileName)
  if (!normalizedName) {
    throw new Error('Некорректное имя файла')
  }

  const extension = extractContractFileExtension(normalizedName)
  const normalizedMimeInput = input.mimeType.trim().toLowerCase()

  const normalizedMimeType = contractFileMimeTypeSet.has(normalizedMimeInput)
    ? normalizedMimeInput
    : resolveContractFileMimeTypeByExtension(extension)

  const extensionAllowed = extension
    ? contractFileExtensionSet.has(extension)
    : false

  if (!normalizedMimeType || !extensionAllowed) {
    throw new Error('Недопустимый формат файла')
  }

  return {
    fileName: normalizedName,
    mimeType: normalizedMimeType,
    fileSize: input.fileSize,
  }
}
