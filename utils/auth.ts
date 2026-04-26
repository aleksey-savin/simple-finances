import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { admin as adminPlugin, twoFactor } from 'better-auth/plugins'
import { ac, admin, user } from 'utils/permissions'
import {
  buildPasswordResetEmail,
  buildTwoFactorOtpEmail,
} from '@/lib/email-templates'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user: u, url }) {
      const { sendEmail } = await import('@/lib/email')
      const template = buildPasswordResetEmail({ resetUrl: url })
      await sendEmail({
        to: u.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    tanstackStartCookies(),
    adminPlugin({
      ac,
      roles: {
        admin,
        user,
      },
    }),
    twoFactor({
      issuer: 'F1Lab',
      otpOptions: {
        async sendOTP({ user: u, otp }) {
          const { sendEmail } = await import('@/lib/email')
          const template = buildTwoFactorOtpEmail({ otp })
          await sendEmail({
            to: u.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          })
        },
      },
    }),
  ],
})
