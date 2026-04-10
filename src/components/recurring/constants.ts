export const CRON_PRESETS = [
  { label: 'Ежедневно (9:00)', value: '0 9 * * *' },
  { label: 'Еженедельно в пн (9:00)', value: '0 9 * * 1' },
  { label: 'Раз в 2 недели в пн (9:00)', value: '0 9 * * 1/2' },
  { label: 'Ежемесячно (1-е число, 9:00)', value: '0 9 1 * *' },
  { label: 'Ежеквартально (9:00)', value: '0 9 1 1,4,7,10 *' },
  { label: 'Ежегодно (1 янв, 9:00)', value: '0 9 1 1 *' },
  { label: 'Свой вариант', value: 'custom' },
] as const
