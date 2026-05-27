export function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU')
}

export function formatLongDate(value: string | Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}
