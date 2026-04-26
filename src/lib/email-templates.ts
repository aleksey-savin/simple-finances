export type EmailTemplate = {
  subject: string
  html: string
  text: string
}

type EmailTone = 'critical' | 'warning' | 'success' | 'info'

const BRAND_NAME = 'F1Lab'
const SUPPORT_EMAIL = 'info@f1lab.ru'
const SUPPORT_PHONE = '+7 423 202 52 96'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getToneStyles(tone: EmailTone) {
  switch (tone) {
    case 'critical':
      return {
        accent: '#ba1a1a',
        icon: '⛔',
      }
    case 'warning':
      return {
        accent: '#9a6700',
        icon: '⚠',
      }
    case 'success':
      return {
        accent: '#006c4f',
        icon: '✔',
      }
    default:
      return {
        accent: '#0059b3',
        icon: 'ℹ',
      }
  }
}

function renderEmailLayout(params: {
  title: string
  tone: EmailTone
  metaLabel?: string
  metaValue?: string
  statusText: string
  sectionsHtml?: string[]
}): string {
  const tone = getToneStyles(params.tone)
  const sectionsHtml = params.sectionsHtml?.filter(Boolean) ?? []
  const metaValue = params.metaValue?.trim() ?? ''

  return `
<!DOCTYPE html>
<html lang="ru">
  <body style="margin:0;padding:0;background:#f9f9f9;font-family:Inter,Arial,sans-serif;color:#1a1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e2e2;">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid #e2e2e2;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Space Grotesk',Inter,Arial,sans-serif;font-size:22px;font-weight:700;color:#111827;">
                      ${BRAND_NAME}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 28px 20px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="6" style="background:${tone.accent};font-size:0;line-height:0;">&nbsp;</td>
                    <td style="padding-left:12px;font-family:'Space Grotesk',Inter,Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:700;color:#1a1c1c;">
                      ${escapeHtml(params.title)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 24px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${tone.accent};background:#f3f4f6;">
                  <tr>
                    <td style="padding:16px 18px;">
                      ${
                        metaValue
                          ? `
                      <div style="font-size:11px;line-height:1;font-weight:700;letter-spacing:0.1em;color:${tone.accent};margin-bottom:8px;">
                        ${escapeHtml(metaValue)}
                      </div>
                      `
                          : ''
                      }
                      <div style="font-family:'Space Grotesk',Inter,Arial,sans-serif;font-size:20px;line-height:1.2;font-weight:700;color:#111827;">
                        ${escapeHtml(params.statusText)}
                      </div>
                    </td>
                    <td align="right" valign="middle" style="padding:16px 18px;font-size:30px;line-height:1;color:${tone.accent};">
                      ${tone.icon}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${
              sectionsHtml.length > 0
                ? `
            <tr>
              <td style="padding:0 28px 16px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${sectionsHtml
                    .map(
                      (item) => `
                  <tr>
                    <td style="padding:8px 0;font-size:14px;line-height:1.6;color:#3f4b45;">
                      ${item}
                    </td>
                  </tr>
                  `,
                    )
                    .join('')}
                </table>
              </td>
            </tr>
            `
                : ''
            }

            <tr>
              <td style="padding:10px 28px 22px 28px;text-align:center;font-size:13px;line-height:1.6;color:#6b7280;">
                Если у вас возникли вопросы или нужна помощь — мы всегда на связи.<br/>
                <span style="color:#006c4f;">${SUPPORT_EMAIL}</span> &nbsp;|&nbsp; <span style="color:#006c4f;">${SUPPORT_PHONE}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim()
}

export function buildInvoiceReminderEmail(params: {
  contactName: string
  contractLabel: string
  dueDateLabel: string
  renewalHtml?: string
  renewalText?: string
}): EmailTemplate {
  const renewalHtml = params.renewalHtml?.trim() || ''
  const renewalText = params.renewalText ?? ''

  return {
    subject: `Напоминание об оплате счёта до ${params.dueDateLabel}`,
    html: renderEmailLayout({
      title: 'Напоминаем об оплате',
      tone: 'critical',
      metaLabel: 'Услуга',
      metaValue: params.contractLabel,
      statusText: `Срок истекает: ${params.dueDateLabel}`,
      sectionsHtml: [
        renewalHtml,
        'Чтобы избежать приостановки услуги, пожалуйста, оплатите направленный в ЭДО счёт.',
        'Если оплата уже выполнена — просьба проигнорировать это сообщение.',
      ],
    }),
    text: `Здравствуйте, ${params.contactName}!\n\nСрок действия услуги "${params.contractLabel}" истекает ${params.dueDateLabel}.${
      renewalText ? `\n\n${renewalText}` : ''
    }\n\nЧтобы избежать приостановки услуги, пожалуйста, оплатите направленный в ЭДО счёт.\nЕсли оплата уже выполнена — просьба проигнорировать это сообщение.\n\nЕсли у вас возникли вопросы или нужна помощь — мы всегда на связи.`,
  }
}

export function buildGracePeriodExtendedEmail(params: {
  contactName: string
  contractLabel: string
  extendedUntilLabel: string
}): EmailTemplate {
  const safeContract = escapeHtml(params.contractLabel)
  const safeUntil = escapeHtml(params.extendedUntilLabel)

  return {
    subject: `Срок оплаты услуги продлён до ${params.extendedUntilLabel}`,
    html: renderEmailLayout({
      title: 'Срок оплаты услуги продлён',
      tone: 'success',
      metaLabel: 'Услуга',
      metaValue: params.contractLabel,
      statusText: `Продлено до: ${params.extendedUntilLabel}`,
      sectionsHtml: [
        `Срок оплаты услуги "<strong style="color:#111827;text-decoration:underline;">${safeContract}</strong>" продлён до <strong>${safeUntil}</strong>.`,
        'Блокировка услуги в этот период применяться не будет.',
      ],
    }),
    text: `Здравствуйте, ${params.contactName}!\n\nСрок оплаты услуги "${params.contractLabel}" продлён до ${params.extendedUntilLabel}.\n\nБлокировка услуги в этот период применяться не будет.\n\nЕсли у вас возникли вопросы или нужна помощь — мы на связи.`,
  }
}

export function buildServiceSuspendedEmail(params: {
  contactName: string
  contractLabel: string
  vmList: string
}): EmailTemplate {
  const safeContract = escapeHtml(params.contractLabel)
  const safeVmList = escapeHtml(params.vmList)

  return {
    subject: `Услуга заблокирована: ${params.contractLabel}`,
    html: renderEmailLayout({
      title: 'Услуга заблокирована',
      tone: 'critical',
      metaLabel: 'Услуга',
      metaValue: params.contractLabel,
      statusText: 'Доступ приостановлен',
      sectionsHtml: [
        `Услуга по договору "<strong style="color:#111827;text-decoration:underline;">${safeContract}</strong>" заблокирована из-за просрочки оплаты.`,
        `Затронутые ВМ: <strong>${safeVmList}</strong>.`,
        'После оплаты просроченного счёта доступ будет восстановлен автоматически.',
      ],
    }),
    text: `Здравствуйте, ${params.contactName}!\n\nУслуга по договору "${params.contractLabel}" заблокирована из-за просрочки оплаты.\n\nЗатронутые ВМ: ${params.vmList}.\n\nПосле оплаты просроченного счёта доступ будет восстановлен автоматически.`,
  }
}

export function buildServiceResumedEmail(params: {
  contactName: string
  contractLabel: string
  vmList: string
}): EmailTemplate {
  const safeContract = escapeHtml(params.contractLabel)
  const safeVmList = escapeHtml(params.vmList)

  return {
    subject: `Доступ к услуге восстановлен: ${params.contractLabel}`,
    html: renderEmailLayout({
      title: 'Доступ к услуге восстановлен',
      tone: 'success',
      metaLabel: 'Услуга',
      metaValue: params.contractLabel,
      statusText: 'Сервис снова доступен',
      sectionsHtml: [
        `Доступ к услуге по договору "<strong style="color:#111827;text-decoration:underline;">${safeContract}</strong>" восстановлен.`,
        `ВМ: <strong>${safeVmList}</strong>.`,
      ],
    }),
    text: `Здравствуйте, ${params.contactName}!\n\nДоступ к услуге по договору "${params.contractLabel}" восстановлен.\n\nВМ: ${params.vmList}.`,
  }
}

export function buildSmtpTestEmail(): EmailTemplate {
  return {
    subject: 'Тест SMTP — SMB Budget',
    html: renderEmailLayout({
      title: 'Проверка SMTP',
      tone: 'info',
      metaLabel: 'Сервис',
      metaValue: 'SMTP',
      statusText: 'SMTP работает корректно',
      sectionsHtml: [
        'Тестовое письмо отправлено успешно.',
        'Если вы получили это письмо, почтовые уведомления в SMB Budget настроены правильно.',
      ],
    }),
    text: 'SMTP настроен и работает корректно.',
  }
}

export function buildPasswordResetEmail(params: {
  resetUrl: string
}): EmailTemplate {
  const safeUrl = escapeHtml(params.resetUrl)

  return {
    subject: 'Сброс пароля — F1Lab',
    html: renderEmailLayout({
      title: 'Сброс пароля',
      tone: 'warning',
      statusText: 'Запрос на смену пароля',
      sectionsHtml: [
        'Мы получили запрос на сброс пароля для вашей учётной записи.',
        `<a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#9a6700;color:#ffffff;font-weight:700;text-decoration:none;font-size:14px;">Сбросить пароль</a>`,
        'Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс — просто проигнорируйте это письмо.',
      ],
    }),
    text: `Мы получили запрос на сброс пароля.\n\nПерейдите по ссылке для смены пароля:\n${params.resetUrl}\n\nСсылка действительна в течение 1 часа. Если вы не запрашивали сброс — просто проигнорируйте это письмо.`,
  }
}

export function buildTwoFactorOtpEmail(params: { otp: string }): EmailTemplate {
  return {
    subject: `Код подтверждения: ${params.otp}`,
    html: renderEmailLayout({
      title: 'Двухфакторная аутентификация',
      tone: 'info',
      statusText: `Код подтверждения: ${escapeHtml(params.otp)}`,
      sectionsHtml: [
        'Введите этот код для входа в систему.',
        'Код действителен в течение 5 минут. Не передавайте его третьим лицам.',
      ],
    }),
    text: `Ваш код подтверждения: ${params.otp}\n\nВведите его для входа в систему. Код действителен в течение 5 минут.`,
  }
}
