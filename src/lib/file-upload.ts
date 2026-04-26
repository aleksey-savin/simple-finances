export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать файл'))
    }

    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Не удалось прочитать файл'))
        return
      }

      const base64 = result.includes(',') ? result.split(',').at(-1) : result
      if (!base64) {
        reject(new Error('Файл пустой'))
        return
      }

      resolve(base64)
    }

    reader.readAsDataURL(file)
  })
}

export function sanitizeUploadFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}

export function extractFileExtension(fileName: string): string | null {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  if (dotIndex === -1 || dotIndex === normalized.length - 1) return null
  return normalized.slice(dotIndex + 1)
}

export function normalizeBase64Payload(payload: string): string {
  const normalized = payload.includes(',')
    ? (payload.split(',').at(-1)?.trim() ?? '')
    : payload.trim()
  return normalized
}
