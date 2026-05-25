import '@tanstack/react-start/server-only'

import { createAuthMiddleware } from 'better-auth/api'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { admin as adminPlugin, emailOTP, twoFactor } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'

import { db } from '#/db/index.server'
import { session as sessionTable, user as userTable } from '#/db/schema'
import {
  buildPasswordResetEmail,
  buildTwoFactorOtpEmail,
} from '#/lib/email-templates'
import { sendEmail } from '#/lib/email.server'
import { ac, admin, user } from 'utils/permissions'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    customRules: {
      '/get-session': {
        window: 60,
        max: 300,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user: u, url }) {
      const template = buildPasswordResetEmail({ resetUrl: url })
      await sendEmail({
        to: u.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
    },
  },
  session: {
    additionalFields: {
      secondFactorVerified: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (s) => {
          const [u] = await db
            .select({ twoFactorEnabled: userTable.twoFactorEnabled })
            .from(userTable)
            .where(eq(userTable.id, s.userId))
            .limit(1)
          return {
            data: {
              ...s,
              secondFactorVerified: u.twoFactorEnabled,
            },
          }
        },
      },
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
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        const template = buildTwoFactorOtpEmail({ otp })
        await sendEmail({
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
      },
    }),
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/email-otp/verify-email') return
      const currentSession = ctx.context.session?.session
      if (!currentSession) return
      await db
        .update(sessionTable)
        .set({ secondFactorVerified: true })
        .where(eq(sessionTable.id, currentSession.id))
    }),
  },
})
