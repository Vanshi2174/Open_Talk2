export type User = {
  id: number
  name: string
  email: string
  created_at: string | null
}

export type AuthResponse = {
  user: User
  message?: string
  csrf_token?: string
}

export type CurrentUserResponse = {
  authenticated: boolean
  user: User | null
  csrf_token?: string
}

export type ApiErrorResponse = {
  error: string
  message: string
  field_errors?: Record<string, string>
}
