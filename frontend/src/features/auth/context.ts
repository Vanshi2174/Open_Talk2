import { createContext } from 'react'
import type { User } from '../../types/auth'

export type AuthContextType = {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (credentials: { email: string; password: string }) => Promise<User>
  register: (payload: {
    name: string
    email: string
    password: string
    confirmPassword: string
  }) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
