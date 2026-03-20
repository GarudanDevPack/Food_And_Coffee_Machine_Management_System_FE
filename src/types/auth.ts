export type UserType = {
  id: string
  username?: string
  email: string
  password?: string
  firstName: string | null
  lastName: string | null
  role: string | { id: number }
  token: string
  refreshToken?: string
  tokenExpires?: number
}
