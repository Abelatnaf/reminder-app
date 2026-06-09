import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin  // works for both :5173 (dev) and :3001 (prod)
    : 'http://localhost:3001',
})

export const { signIn, signUp, signOut, useSession } = authClient
