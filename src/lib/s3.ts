import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { extractFileExtension, normalizeBase64Payload } from './file-upload'

const DEFAULT_S3_REGION = 'ru-central1'
const DEFAULT_UPLOADS_PREFIX = 'uploads'

type S3Config = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  kmsKeyId?: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Переменная окружения ${name} не задана`)
  }
  return value
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '')
}

function getS3Config(): S3Config {
  return {
    endpoint: getRequiredEnv('S3_ENDPOINT').replace(/\/+$/, ''),
    region: process.env.S3_REGION?.trim() || DEFAULT_S3_REGION,
    bucket: getRequiredEnv('S3_BUCKET_NAME'),
    accessKeyId: getRequiredEnv('S3_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('S3_SECRET_ACCESS_KEY'),
    forcePathStyle: parseBooleanEnv(process.env.S3_FORCE_PATH_STYLE, true),
    kmsKeyId: process.env.S3_KMS_KEY_ID?.trim() || undefined,
  }
}

function formatDatetimeForKey(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
}

function buildObjectKey(
  pathPrefix: string,
  fileName: string,
  fileNamePrefix?: string,
): string {
  const extension = extractFileExtension(fileName)
  const extensionSuffix = extension ? `.${extension}` : ''
  const normalizedPrefix = trimSlashes(pathPrefix) || DEFAULT_UPLOADS_PREFIX

  const baseName = fileNamePrefix
    ? `${fileNamePrefix}_${formatDatetimeForKey(new Date())}`
    : randomUUID()

  return `${normalizedPrefix}/${baseName}${extensionSuffix}`
}

export type UploadBase64FileToS3Input = {
  fileName: string
  mimeType: string
  fileSize: number
  fileBase64: string
  pathPrefix?: string
  fileNamePrefix?: string
  maxSizeBytes?: number
}

export type UploadBase64FileToS3Result = {
  objectKey: string
}

export async function uploadBase64FileToS3(
  params: UploadBase64FileToS3Input,
): Promise<UploadBase64FileToS3Result> {
  const config = getS3Config()

  const normalizedBase64 = normalizeBase64Payload(params.fileBase64)
  if (!normalizedBase64) {
    throw new Error('Файл пустой')
  }

  const buffer = Buffer.from(normalizedBase64, 'base64')
  if (buffer.byteLength === 0) {
    throw new Error('Файл пустой')
  }

  if (
    typeof params.maxSizeBytes === 'number' &&
    buffer.byteLength > params.maxSizeBytes
  ) {
    throw new Error('Размер файла превышает допустимый лимит')
  }

  if (buffer.byteLength !== params.fileSize) {
    throw new Error('Не удалось проверить размер файла')
  }

  const objectKey = buildObjectKey(
    params.pathPrefix ?? DEFAULT_UPLOADS_PREFIX,
    params.fileName,
    params.fileNamePrefix,
  )

  const s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: params.mimeType,
      ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(params.fileName)}`,
      ...(config.kmsKeyId
        ? {
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: config.kmsKeyId,
          }
        : {}),
    }),
  )

  return {
    objectKey,
  }
}

export async function deleteS3Object(objectKey: string): Promise<void> {
  const config = getS3Config()
  const key = trimSlashes(objectKey)
  if (!key) return

  const s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}

export type GetS3SignedObjectUrlInput = {
  objectKey: string
  expiresInSeconds?: number
}

export async function getS3SignedObjectUrl(
  params: GetS3SignedObjectUrlInput,
): Promise<string> {
  const config = getS3Config()
  const objectKey = trimSlashes(params.objectKey)
  if (!objectKey) {
    throw new Error('Некорректный ключ файла')
  }

  const s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
    {
      expiresIn: params.expiresInSeconds ?? 600,
    },
  )

  return url
}
