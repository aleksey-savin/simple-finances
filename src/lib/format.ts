export function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU')
}
