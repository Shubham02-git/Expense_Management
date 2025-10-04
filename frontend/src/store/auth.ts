import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import toast from 'react-hot-toast'

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
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  company_name?: string
  country?: string
}

// Configure axios defaults
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      toast.error('Session expired. Please login again.')
    }
    return Promise.reject(error)
  }
)

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          const response = await api.post('/api/auth/login', {
            email,
            password,
          })

          const { user, token } = response.data.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          toast.success('Login successful!')
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.error?.message || 'Login failed'
          toast.error(message)
          throw error
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true })
          
          const response = await api.post('/api/auth/register', data)

          const { user, token } = response.data.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          toast.success('Registration successful!')
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.error?.message || 'Registration failed'
          toast.error(message)
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
        toast.success('Logged out successfully')
      },

      setUser: (user: User) => {
        set({ user })
      },
    }),
    {
      name: 'expense-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export { api }

// Export useAuth as an alias for easier importing
export const useAuth = useAuthStore