import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        // OTP path: pass pre-verified token directly
        token: { label: 'Token', type: 'text' },
        phone: { label: 'Phone', type: 'text' },
      },
      async authorize(credentials) {
        // ── OTP path: frontend already verified OTP and got token ──────────
        if (credentials?.token) {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${credentials.token}`,
            },
          })
          if (!res.ok) throw new Error('Invalid session token')
          const user = await res.json()
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: credentials.token,
            refreshToken: '',
            tokenExpires: Date.now() + 24 * 60 * 60 * 1000,
          }
        }

        // ── Email/password path ─────────────────────────────────────────────
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const res = await fetch(`${API_URL}/auth/email/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          credentials: 'include',
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message || 'Invalid email or password')
        }

        const data = await res.json()
        const user = data.user

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          token: data.token,
          refreshToken: data.refreshToken,
          tokenExpires: data.tokenExpires,
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'qfox-admin-secret-change-in-production',
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, persist the BE tokens
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
        token.accessToken = (user as any).token
        token.refreshToken = (user as any).refreshToken
        token.tokenExpires = (user as any).tokenExpires
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        role: token.role as string | { id: number },
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        token: token.accessToken as string,
        refreshToken: token.refreshToken as string,
      } as any
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  },
}
