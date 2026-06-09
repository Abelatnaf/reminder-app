import './env.js' // MUST be first — loads DATABASE_URL before the Pool is built
import { betterAuth } from 'better-auth'
import pg from 'pg'
import { sendEmail, resetPasswordEmail } from './email.js'
import { AUTH_SECRET } from './secret.js' // throws in prod if the secret is unset/default

const { Pool } = pg

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3001}`,
  secret: AUTH_SECRET,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`
      await sendEmail({
        to: user.email,
        subject: 'Reset your Reminder password',
        html: resetPasswordEmail(user.name, resetUrl),
      })
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3001',
    process.env.APP_URL,
    process.env.FRONTEND_URL,
    process.env.BETTER_AUTH_URL,
    // Accept any Railway subdomain automatically
    ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] : []),
  ].filter(Boolean),
})
