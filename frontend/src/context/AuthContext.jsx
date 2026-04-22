import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on login/register routes - let them handle their own errors
    const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                        error.config?.url?.includes('/auth/register') ||
                        error.config?.url?.includes('/auth/forgot-password') ||
                        error.config?.url?.includes('/auth/reset-password')

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const response = await api.get('/auth/profile')
        setUser(response.data.data)
      }
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { data } = response.data

      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      toast.success('Login successful!')
      return data
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { data } = response.data

      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      toast.success('Registration successful!')
      return data
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      toast.success('Logged out successfully')
      window.location.href = '/'
    }
  }

  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData)
      const { data } = response.data
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))
      toast.success('Profile updated successfully')
      return data
    } catch (error) {
      const message = error.response?.data?.message || 'Update failed'
      toast.error(message)
      throw error
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('Password changed successfully')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password'
      toast.error(message)
      throw error
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    api,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { api }