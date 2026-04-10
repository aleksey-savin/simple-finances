import { CRON_PRESETS } from '@/components/recurring/constants'

export function getCronLabel(expr: string): string {
  const found = CRON_PRESETS.find(
    (preset) => preset.value === expr && preset.value !== 'custom',
  )
  return found ? found.label : expr
}

export function formatRuleDate(date: Date | string | null | undefined): string {
  if (!date) return '—'

  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function pluralDays(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100

  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'дня'
  }

  return 'дней'
}

export function formatRuleAmount(amount: string | number) {
  return Number(amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
