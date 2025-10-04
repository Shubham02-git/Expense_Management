import React, { createContext, useContext, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { api } from '../store/auth'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'employee'
  company: {
    id: string
    name: string
    currency: string
    currency_symbol: string
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthStore()

  useEffect(() => {
    // Check if user is authenticated on app start
    if (auth.token && !auth.user) {
      // Verify token with backend
      api.get('/api/auth/me')
        .then((response: any) => {
          auth.setUser(response.data.data.user)
        })
        .catch(() => {
          auth.logout()
        })
    }
  }, [auth])

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}