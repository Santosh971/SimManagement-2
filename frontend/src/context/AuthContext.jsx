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
    // When sending FormData, let the browser set Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on routes where 401 means "wrong credentials", not "session expired"
    const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                        error.config?.url?.includes('/auth/register') ||
                        error.config?.url?.includes('/auth/forgot-password') ||
                        error.config?.url?.includes('/auth/reset-password') ||
                        error.config?.url?.includes('/auth/email-change') ||
                        error.config?.url?.includes('/auth/change-password') ||
                        error.config?.url?.includes('/companies/my/email-change')

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !isAuthRoute) {
      const message = error.response?.data?.message || 'Session expired. Please log in again.'
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = `/login?reason=${encodeURIComponent(message)}`
    }

    // Handle 403 Feature Not Available - show upgrade prompt (only once)
    if (error.response?.status === 403 && error.response?.data?.code === 'FEATURE_NOT_AVAILABLE') {
      // Mark error as handled so components don't show duplicate toast
      error._featureToastShown = true

      const featureName = error.response?.data?.feature || 'This feature'
      const featureNames = {
        excelExport: 'Excel Export',
        advancedReports: 'Advanced Reports',
        emailNotifications: 'Email Notifications',
        smsNotifications: 'SMS Notifications',
        apiAccess: 'API Access',
        prioritySupport: 'Priority Support',
        callLogSync: 'Call Log Sync',
        whatsappStatus: 'WhatsApp Status',
        telegramStatus: 'Telegram Status',
        wifiMonitor: 'WiFi Monitor',
        callAutomation: 'Call Automation',
        smsLogs: 'SMS Logs',
      }
      const displayName = featureNames[featureName] || featureName

      // Show upgrade toast with action (using id to prevent duplicates)
      toast.error(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span><strong>{displayName}</strong> is not available in your current plan.</span>
            <button
              onClick={() => {
                toast.dismiss(t.id)
                window.location.href = '/subscription'
              }}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Upgrade Plan
            </button>
          </div>
        ),
        { duration: 8000, id: `feature-not-available-${featureName}` }
      )
    }

    return Promise.reject(error)
  }
)

/**
 * Extract a user-friendly error message from an API error response.
 * Handles validation errors with field-specific messages (errors array),
 * regular error messages, and fallback messages.
 * @param {Error} error - The error object from a catch block
 * @param {string} fallbackMessage - Fallback message if error has no message
 * @returns {string} A readable error message
 */
const extractErrorMessage = (error, fallbackMessage = 'Operation failed') => {
  const data = error.response?.data
  if (!data) return fallbackMessage

  // If backend returned specific field-level validation errors, join them
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.message).join('. ')
  }

  return data.message || fallbackMessage
}

/**
 * Helper function to show error toast (skips FEATURE_NOT_AVAILABLE errors)
 * Use this in catch blocks instead of: toast.error(error.response?.data?.message || 'Error')
 * @param {Error} error - The error object
 * @param {string} fallbackMessage - Fallback message if error has no message
 */
const showErrorToast = (error, fallbackMessage = 'Operation failed') => {
  // Skip if feature toast was already shown by interceptor
  if (error._featureToastShown) return
  // Skip if it's a FEATURE_NOT_AVAILABLE error
  if (error.response?.data?.code === 'FEATURE_NOT_AVAILABLE') return

  toast.error(extractErrorMessage(error, fallbackMessage))
}

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
      toast.success('Profile updated successfully.')
      return data
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Update failed'))
      throw error
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('Password changed successfully. Please log in again.', { duration: 4000 })
      // Log out the user after password change so they re-authenticate with the new password
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setTimeout(() => { window.location.href = '/login' }, 1500)
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to change password'))
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
    showErrorToast,
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

export { api, showErrorToast, extractErrorMessage }