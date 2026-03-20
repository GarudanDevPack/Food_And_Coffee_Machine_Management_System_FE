'use client'
import { useSession } from 'next-auth/react'

/**
 * Returns the JWT access token from the current NextAuth session.
 * Use this in client components to authenticate API calls.
 */
export function useApiToken(): string | undefined {
  const { data: session } = useSession()
  return (session?.user as any)?.token
}

/**
 * Returns the current user's role id.
 * Backend roles: 1=super_admin, 2=admin, 3=client, 4=agent, 5=customer
 */
export function useUserRole(): number | undefined {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  if (!role) return undefined
  return typeof role === 'object' ? role.id : role
}

/**
 * Returns the full session user object.
 */
export function useCurrentUser() {
  const { data: session } = useSession()
  return session?.user as any
}
