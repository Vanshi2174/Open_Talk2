import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getMe, loginUser, logoutUser, registerUser } from '../../services/api'
import type { User } from '../../types/auth'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe()
      if (res.authenticated && res.user) {
        setUser(res.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    getMe()
      .then((res) => {
        if (!ignore) {
          if (res.authenticated && res.user) {
            setUser(res.user)
          } else {
            setUser(null)
          }
        }
      })
      .catch(() => {
        if (!ignore) setUser(null)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const res = await loginUser(credentials)
      setUser(res.user)
      return res.user
    },
    []
  )

  const register = useCallback(
    async (payload: {
      name: string
      email: string
      password: string
      confirmPassword: string
    }) => {
      const res = await registerUser(payload)
      setUser(res.user)
      return res.user
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
