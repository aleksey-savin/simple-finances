const HTML_ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
}

export function decodeHtmlEntities(value: string | null | undefined) {
  if (!value) {
    return value ?? null
  }

  return value.replace(
    /&quot;|&#34;|&apos;|&#39;|&amp;|&lt;|&gt;/g,
    (entity) => HTML_ENTITY_MAP[entity] ?? entity,
  )
}
