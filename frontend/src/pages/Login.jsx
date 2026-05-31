import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle } from 'react-icons/fi'
import Logo from '../components/Logo'

const REMEMBERED_CREDENTIALS_KEY = 'rememberedCredentials'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sessionMessage, setSessionMessage] = useState('')

  // Read session expiry / deactivation message from URL params
  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason) {
      setSessionMessage(reason)
      // Clean the URL so the message doesn't persist on refresh
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  // Pre-fill email and password from localStorage if previously remembered
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_CREDENTIALS_KEY)
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved)
        if (savedEmail) setEmail(savedEmail)
        if (savedPassword) setPassword(savedPassword)
        setRememberMe(true)
      }
    } catch {
      localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY)
    }
  }, [])

  // Comprehensive email validation with specific error messages
  const validateEmail = (value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'Email ID is required'

    // Check for spaces
    if (/\s/.test(trimmed)) return 'Email ID cannot contain spaces'

    // Must have exactly one @
    const atCount = (trimmed.match(/@/g) || []).length
    if (atCount === 0) return 'Email ID must contain "@" symbol'
    if (atCount > 1) return 'Email ID can only contain one "@" symbol'

    const [localPart, domain] = trimmed.split('@')

    // Local part validation (before @)
    if (!localPart) return 'Please enter a username before "@"'
    if (localPart.startsWith('.')) return 'Email ID cannot start with a dot'
    if (localPart.endsWith('.')) return 'Username cannot end with a dot'
    if (localPart.includes('..')) return 'Username cannot contain consecutive dots'
    if (!/^[a-zA-Z0-9._%+-]+$/.test(localPart)) return 'Username contains invalid characters'

    // Domain part validation (after @)
    if (!domain) return 'Please enter a domain after "@"'
    if (domain.startsWith('.')) return 'Domain cannot start with a dot'
    if (domain.startsWith('-')) return 'Domain cannot start with a hyphen'
    if (domain.endsWith('.')) return 'Domain cannot end with a dot'
    if (domain.includes('..')) return 'Domain cannot contain consecutive dots'

    // Must have at least one dot in domain and valid TLD
    const domainParts = domain.split('.')
    if (domainParts.length < 2) return 'Please enter a complete domain (e.g. name@example.com)'
    const tld = domainParts[domainParts.length - 1]
    if (tld.length < 2) return 'Domain extension must be at least 2 characters (e.g. .com, .in)'

    return ''
  }

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        return validateEmail(value)
      case 'password':
        if (!value) return 'Password is required'
        if (value.length < 6) return 'Password must be at least 6 characters'
        return ''
      default:
        return ''
    }
  }

  const handleBlur = (name, value) => {
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const clearError = (name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all fields before submit
    const newErrors = {}
    const emailError = validateField('email', email)
    if (emailError) newErrors.email = emailError
    const passwordError = validateField('password', password)
    if (passwordError) newErrors.password = passwordError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      await login(email, password)

      // Save or clear remembered credentials based on checkbox
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_CREDENTIALS_KEY, JSON.stringify({
          email: email.trim(),
          password
        }))
      } else {
        localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY)
      }

      navigate('/app/dashboard')
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo
              linkTo=""
              size="xlarge"
              variant="dark"
              showText={false}
            />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">Welcome Back</h1>
          <p className="text-secondary-500 mt-2">Sign In to your account</p>
        </div>

        {/* Session message (deactivation, expiry, etc.) */}
        {sessionMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
          }}>
            <FiAlertCircle style={{ width: '18px', height: '18px', color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: '#991b1b', lineHeight: '1.5' }}>{sessionMessage}</p>
          </div>
        )}

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body" noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="label">Email ID<span style={{ color: '#dc2626' }}>*</span></label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                  onBlur={() => handleBlur('email', email)}
                  className={`input pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="admin@gmail.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Password<span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'flex', gap: '0' }}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                    onBlur={() => handleBlur('password', password)}
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '0',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      borderRadius: errors.password ? '8px 0 0 8px' : '8px 0 0 8px',
                      border: errors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
                      outline: 'none',
                      fontSize: '14px',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    className={errors.password ? 'focus:ring-red-500 focus:border-red-500' : ''}
                    placeholder="Admin@123"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '10px 14px',
                    border: errors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    background: '#d1d5db',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                  }}
                >
                  {showPassword ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mt-4 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setRememberMe(checked)
                    if (!checked) {
                      localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY)
                    }
                  }}
                  className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-sm text-secondary-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-secondary-600 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up
              </Link>
            </p>

            {/* Back to Website */}
            <div className="text-center mt-4">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 text-secondary-600 hover:text-primary-600 font-medium transition-colors"
              >
                {/* <FiArrowLeft className="w-4 h-4" /> */}
                Back to Website
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}