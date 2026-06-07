import { useState, useEffect } from 'react'
import { useAuth, extractErrorMessage } from '../context/AuthContext'
import { FiUser, FiLock, FiMail, FiEye, FiEyeOff, FiX, FiBriefcase, FiMapPin, FiPhone, FiGlobe, FiSave, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/dateFormat'
import { countryCodes } from '../data/countries'

// Get unique sorted list of country names for dropdown
const countryList = [...new Set(countryCodes.map(c => c.country))].sort((a, b) => a.localeCompare(b))

/**
 * Validate a phone number in PhoneInput combined format (e.g., "+919876543210").
 * Uses the same 3-tier validation as the SIMs Add form:
 *   1. Only digits allowed (after stripping + prefix)
 *   2. Indian numbers (+91) must be exactly 10 digits
 *   3. International numbers: combined total must be 10-15 digits
 * Returns error message string, or empty string if valid.
 */
function validatePhone(phone) {
  if (!phone || !phone.trim()) return '' // phone is optional
  const trimmed = phone.trim()
  // Must start with + (PhoneInput always prepends country code)
  if (!trimmed.startsWith('+')) return 'Contact number must start with country code (e.g., +91)'
  const digits = trimmed.substring(1) // strip the +
  if (!/^\d+$/.test(digits)) return 'Only digits are allowed after country code'
  // Find the matching country code
  const dialCode = getDialCodeFromPhone(trimmed)
  const numberPart = dialCode ? digits.substring(dialCode.length) : digits
  const ccPrefix = dialCode ? '+' + dialCode : ''
  if (!numberPart) return 'Enter a phone number after the country code'
  if (!/^\d+$/.test(numberPart)) return 'Only digits are allowed in phone number'
  if (ccPrefix === '+91' && !/^\d{10}$/.test(numberPart)) return 'Must be 10 digits for Indian numbers'
  const totalDigits = digits.length
  if (totalDigits < 10 || totalDigits > 15) return 'Combined number must be 10-15 digits'
  return ''
}

/**
 * Extract the country dial code from a combined phone string (e.g., "+919876543210" → "91").
 * Matches the longest dial code prefix from the country codes list.
 */
function getDialCodeFromPhone(phone) {
  if (!phone || !phone.startsWith('+')) return ''
  const digits = phone.substring(1) // strip +
  // Try longest match first (e.g., +971 before +97)
  const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    const dc = c.code.replace('+', '')
    if (digits.startsWith(dc)) return dc
  }
  return ''
}
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Button,
  Spinner,
  PhoneInput,
} from '../components/ui'

// Email Change Modal Component
function EmailChangeModal({ isOpen, onClose, currentEmail, onSuccess }) {
  const { api } = useAuth()
  const [step, setStep] = useState(1) // 1: Request, 2: Verify Old, 3: Verify New
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    newEmail: '',
    password: '',
    otp: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFormData({ newEmail: '', password: '', otp: '' })
      setFieldErrors({})
      setPendingNewEmail('')
      setShowPassword(false)
      setLoading(false)
      setResendCooldown(0)
    }
  }, [isOpen])

  const handleClose = () => {
    // Cancel pending email change when modal is closed
    if (step > 1) {
      api.post('/auth/email-change/cancel').catch(() => {})
    }
    setStep(1)
    setFormData({ newEmail: '', password: '', otp: '' })
    setFieldErrors({})
    setPendingNewEmail('')
    onClose()
  }

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!formData.newEmail.trim()) {
      errors.newEmail = 'Email ID is required'
    } else if (!emailRegex.test(formData.newEmail.trim())) {
      errors.newEmail = 'Please enter a valid Email ID (e.g. name@example.com)'
    } else if (formData.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      errors.newEmail = 'New email cannot be the same as your current email'
    }
    if (!formData.password) {
      errors.password = 'Password is required to verify your identity'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/email-change/request', {
        newEmail: formData.newEmail,
        password: formData.password,
      })
      setFieldErrors({})
      setPendingNewEmail(formData.newEmail)
      setStep(2)
      toast.success('Verification code sent to your current email')
    } catch (error) {
      const data = error.response?.data
      // Map backend validation errors array to inline field errors
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const mapped = {}
        data.errors.forEach((e) => {
          if (e.field === 'newEmail') mapped.newEmail = e.message
          else if (e.field === 'password') mapped.password = e.message
        })
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped)
          return
        }
      }
      // Map backend service-level errors to inline field errors
      const msg = data?.message || extractErrorMessage(error, 'Failed to request email change')
      const fieldMap = {}
      if (/incorrect password/i.test(msg)) {
        fieldMap.password = 'Incorrect password. Please check and try again.'
      } else if (/already registered/i.test(msg) || /already used/i.test(msg)) {
        fieldMap.newEmail = 'This email is already registered. Please use a different Email ID.'
      } else if (/invalid email/i.test(msg)) {
        fieldMap.newEmail = 'Please enter a valid Email ID (e.g. name@example.com)'
      } else if (/same as.*current/i.test(msg)) {
        fieldMap.newEmail = 'New email cannot be the same as your current email'
      }
      if (Object.keys(fieldMap).length > 0) {
        setFieldErrors(fieldMap)
        return
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOld = async (e) => {
    e.preventDefault()
    if (!formData.otp || !formData.otp.trim()) {
      setFieldErrors({ otp: 'Please enter the verification code' })
      return
    }
    if (formData.otp.length !== 6) {
      setFieldErrors({ otp: 'Verification code must be 6 digits' })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/email-change/verify-old', { otp: formData.otp })
      setFieldErrors({})
      setFormData({ ...formData, otp: '' })
      setStep(3)
      toast.success('Verification code sent to your new email')
    } catch (error) {
      const msg = extractErrorMessage(error, 'Invalid verification code')
      setFieldErrors({ otp: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyNew = async (e) => {
    e.preventDefault()
    if (!formData.otp || !formData.otp.trim()) {
      setFieldErrors({ otp: 'Please enter the verification code' })
      return
    }
    if (formData.otp.length !== 6) {
      setFieldErrors({ otp: 'Verification code must be 6 digits' })
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/auth/email-change/verify-new', { otp: formData.otp })
      toast.success('Email updated successfully!')
      onSuccess(response.data.data.newEmail)
      handleClose()
    } catch (error) {
      const msg = extractErrorMessage(error, 'Invalid verification code')
      setFieldErrors({ otp: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return
    try {
      await api.post('/auth/email-change/resend')
      toast.success('Verification code resent successfully')
      setResendCooldown(30)
      setFieldErrors({})
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to resend verification code')
      toast.error(msg)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '450px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {step === 1 && 'Change Email ID'}
            {step === 2 && 'Verify Current Email'}
            {step === 3 && 'Verify New Email'}
          </h2>
          <button
            onClick={handleClose}
            className="modal-close-btn"
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background-color 0.2s' }}
          >
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {[
              { num: 1, label: 'Request' },
              { num: 2, label: 'Verify Old' },
              { num: 3, label: 'Verify New' },
            ].map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: step >= s.num ? '#2563eb' : '#e5e7eb',
                    color: step >= s.num ? '#ffffff' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ marginLeft: '8px', fontSize: '12px', color: step >= s.num ? '#2563eb' : '#6b7280' }}>
                  {s.label}
                </span>
                {i < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: step > s.num ? '#2563eb' : '#e5e7eb',
                      margin: '0 12px',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Step 1: Request Email Change */}
          {step === 1 && (
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                  <strong>Current Email:</strong> {currentEmail}
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  New Email ID<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => { setFormData({ ...formData, newEmail: e.target.value }); clearFieldError('newEmail') }}
                  onBlur={() => {
                    if (!formData.newEmail.trim()) setFieldErrors((prev) => ({ ...prev, newEmail: 'Email ID is required' }))
                    else if (!emailRegex.test(formData.newEmail.trim())) setFieldErrors((prev) => ({ ...prev, newEmail: 'Please enter a valid Email ID (e.g. name@example.com)' }))
                  }}
                  placeholder="admin@gmail.com"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: fieldErrors.newEmail ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.newEmail && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.newEmail}</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Enter Password<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); clearFieldError('password') }}
                    onBlur={() => {
                      if (!formData.password) setFieldErrors((prev) => ({ ...prev, password: 'Password is required to verify your identity' }))
                    }}
                    placeholder="Admin@123"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{
                      flex: '1',
                      padding: '10px 14px',
                      border: fieldErrors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      padding: '10px 14px',
                      border: fieldErrors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
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
                {fieldErrors.password ? (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.password}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Enter the current admin password is required for security verification
                  </p>
                )}
              </div>
              <Button type="submit" loading={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </form>
          )}

          {/* Step 2: Verify Old Email OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOld} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                  A 6-digit verification code has been sent to:<br />
                  <strong>{currentEmail}</strong>
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Enter Verification Code<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => { setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') }); clearFieldError('otp') }}
                  onBlur={() => {
                    if (!formData.otp || !formData.otp.trim()) setFieldErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }))
                    else if (formData.otp.length !== 6) setFieldErrors((prev) => ({ ...prev, otp: 'Verification code must be 6 digits' }))
                  }}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: fieldErrors.otp ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.otp ? (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.otp}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Code expires in 10 minutes
                  </p>
                )}
              </div>
              <Button type="submit" loading={loading} disabled={!formData.otp || formData.otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="modal-resend-btn"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: resendCooldown > 0 ? '#9ca3af' : '#2563eb',
                  opacity: resendCooldown > 0 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.2s',
                }}
              >
                <FiRefreshCw style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="modal-cancel-btn"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Step 3: Verify New Email OTP */}
          {step === 3 && (
            <form onSubmit={handleVerifyNew} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#065f46' }}>
                  A 6-digit verification code has been sent to your new email:<br />
                  <strong>{pendingNewEmail}</strong>
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Enter Verification Code<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => { setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') }); clearFieldError('otp') }}
                  onBlur={() => {
                    if (!formData.otp || !formData.otp.trim()) setFieldErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }))
                    else if (formData.otp.length !== 6) setFieldErrors((prev) => ({ ...prev, otp: 'Verification code must be 6 digits' }))
                  }}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: fieldErrors.otp ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.otp ? (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.otp}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Code expires in 10 minutes
                  </p>
                )}
              </div>
              <Button type="submit" loading={loading} disabled={!formData.otp || formData.otp.length !== 6}>
                {loading ? 'Updating Email...' : 'Update Email '}
              </Button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="modal-resend-btn"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: resendCooldown > 0 ? '#9ca3af' : '#2563eb',
                  opacity: resendCooldown > 0 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.2s',
                }}
              >
                <FiRefreshCw style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="modal-cancel-btn"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// Company Email Change Modal Component
function CompanyEmailChangeModal({ isOpen, onClose, currentEmail, companyName, onSuccess }) {
  const { api } = useAuth()
  const [step, setStep] = useState(1) // 1: Request, 2: Verify Old, 3: Verify New
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    newEmail: '',
    password: '',
    otp: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFormData({ newEmail: '', password: '', otp: '' })
      setFieldErrors({})
      setPendingNewEmail('')
      setShowPassword(false)
      setLoading(false)
      setResendCooldown(0)
    }
  }, [isOpen])

  const handleClose = () => {
    // Cancel pending email change when modal is closed
    if (step > 1) {
      api.post('/companies/my/email-change/cancel').catch(() => {})
    }
    setStep(1)
    setFormData({ newEmail: '', password: '', otp: '' })
    setFieldErrors({})
    setPendingNewEmail('')
    setResendCooldown(0)
    onClose()
  }

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!formData.newEmail.trim()) {
      errors.newEmail = 'Company Email ID is required'
    } else if (!emailRegex.test(formData.newEmail.trim())) {
      errors.newEmail = 'Please enter a valid Email ID (e.g. name@example.com)'
    } else if (formData.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      errors.newEmail = 'New email cannot be the same as the current company email'
    }
    if (!formData.password) {
      errors.password = 'Your password is required to verify this change'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      await api.post('/companies/my/email-change/request', {
        newEmail: formData.newEmail,
        password: formData.password,
      })
      setFieldErrors({})
      setPendingNewEmail(formData.newEmail)
      setStep(2)
      toast.success('Verification code sent to current company email')
    } catch (error) {
      const data = error.response?.data
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const mapped = {}
        data.errors.forEach((e) => {
          if (e.field === 'newEmail') mapped.newEmail = e.message
          else if (e.field === 'password') mapped.password = e.message
        })
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped)
          return
        }
      }
      // Map backend service-level errors to inline field errors
      const msg = data?.message || extractErrorMessage(error, 'Failed to request email change')
      const fieldMap = {}
      if (/incorrect password/i.test(msg)) {
        fieldMap.password = 'Incorrect password. Please check and try again.'
      } else if (/already registered/i.test(msg) || /already used/i.test(msg)) {
        fieldMap.newEmail = 'This email is already in use. Please use a different Email ID.'
      } else if (/invalid email/i.test(msg)) {
        fieldMap.newEmail = 'Please enter a valid Email ID (e.g. name@example.com)'
      } else if (/same as.*current/i.test(msg)) {
        fieldMap.newEmail = 'New email cannot be the same as the current company email'
      }
      if (Object.keys(fieldMap).length > 0) {
        setFieldErrors(fieldMap)
        return
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOld = async (e) => {
    e.preventDefault()
    if (!formData.otp || !formData.otp.trim()) {
      setFieldErrors({ otp: 'Please enter the verification code' })
      return
    }
    if (formData.otp.length !== 6) {
      setFieldErrors({ otp: 'Verification code must be 6 digits' })
      return
    }
    setLoading(true)
    try {
      await api.post('/companies/my/email-change/verify-old', { otp: formData.otp })
      setFieldErrors({})
      setFormData({ ...formData, otp: '' })
      setStep(3)
      toast.success('Verification code sent to the new email')
    } catch (error) {
      const msg = extractErrorMessage(error, 'Invalid verification code')
      setFieldErrors({ otp: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyNew = async (e) => {
    e.preventDefault()
    if (!formData.otp || !formData.otp.trim()) {
      setFieldErrors({ otp: 'Please enter the verification code' })
      return
    }
    if (formData.otp.length !== 6) {
      setFieldErrors({ otp: 'Verification code must be 6 digits' })
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/companies/my/email-change/verify-new', { otp: formData.otp })
      toast.success('Company email updated successfully.')
      onSuccess(response.data.data.email)
      handleClose()
    } catch (error) {
      const msg = extractErrorMessage(error, 'Invalid verification code')
      setFieldErrors({ otp: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return
    try {
      await api.post('/companies/my/email-change/resend')
      toast.success('Verification code resent successfully')
      setResendCooldown(30)
      setFieldErrors({})
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to resend verification code')
      toast.error(msg)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '450px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {step === 1 && 'Change Company Email'}
            {step === 2 && 'Verify Current Email'}
            {step === 3 && 'Verify New Email'}
          </h2>
          <button
            onClick={handleClose}
            className="modal-close-btn"
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background-color 0.2s' }}
          >
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {[
              { num: 1, label: 'Request' },
              { num: 2, label: 'Verify Old' },
              { num: 3, label: 'Verify New' },
            ].map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: step >= s.num ? '#2563eb' : '#e5e7eb',
                    color: step >= s.num ? '#ffffff' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ marginLeft: '8px', fontSize: '12px', color: step >= s.num ? '#2563eb' : '#6b7280' }}>
                  {s.label}
                </span>
                {i < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: step > s.num ? '#2563eb' : '#e5e7eb',
                      margin: '0 12px',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Step 1: Request Email Change */}
          {step === 1 && (
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                  <strong>Company:</strong> {companyName}<br />
                  <strong>Current Email:</strong> {currentEmail}
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  New Company Email ID<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => { setFormData({ ...formData, newEmail: e.target.value }); clearFieldError('newEmail') }}
                  onBlur={() => {
                    if (!formData.newEmail.trim()) setFieldErrors((prev) => ({ ...prev, newEmail: 'Company Email ID is required' }))
                    else if (!emailRegex.test(formData.newEmail.trim())) setFieldErrors((prev) => ({ ...prev, newEmail: 'Please enter a valid Email ID (e.g. name@example.com)' }))
                  }}
                  placeholder="admin@gmail.com"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: fieldErrors.newEmail ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.newEmail && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.newEmail}</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Confirm Your Password<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); clearFieldError('password') }}
                    onBlur={() => {
                      if (!formData.password) setFieldErrors((prev) => ({ ...prev, password: 'Your password is required to verify this change' }))
                    }}
                    placeholder="Admin@123"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{
                      flex: '1',
                      padding: '10px 14px',
                      border: fieldErrors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      padding: '10px 14px',
                      border: fieldErrors.password ? '1px solid #dc2626' : '1px solid #d1d5db',
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
                {fieldErrors.password ? (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.password}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Current admin password is required for security verification
                  </p>
                )}
              </div>
              <Button type="submit" loading={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </form>
          )}

          {/* Step 2: Verify Old Email OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOld} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                  A 6-digit verification code has been sent to the current company email:<br />
                  <strong>{currentEmail}</strong>
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Enter Verification Code<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => { setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') }); clearFieldError('otp') }}
                  onBlur={() => {
                    if (!formData.otp || !formData.otp.trim()) setFieldErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }))
                    else if (formData.otp.length !== 6) setFieldErrors((prev) => ({ ...prev, otp: 'Verification code must be 6 digits' }))
                  }}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: fieldErrors.otp ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.otp ? (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.otp}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Code expires in 10 minutes
                  </p>
                )}
              </div>
              <Button type="submit" loading={loading} disabled={!formData.otp || formData.otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="modal-resend-btn"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: resendCooldown > 0 ? '#9ca3af' : '#2563eb',
                  opacity: resendCooldown > 0 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.2s',
                }}
              >
                <FiRefreshCw style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="modal-cancel-btn"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Step 3: Verify New Email OTP */}
          {step === 3 && (
            <form onSubmit={handleVerifyNew} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#065f46' }}>
                  A 6-digit verification code has been sent to the new company email:<br />
                  <strong>{pendingNewEmail}</strong>
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Enter Verification Code<span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => { setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') }); clearFieldError('otp') }}
                  onBlur={() => {
                    if (!formData.otp || !formData.otp.trim()) setFieldErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }))
                    else if (formData.otp.length !== 6) setFieldErrors((prev) => ({ ...prev, otp: 'Verification code must be 6 digits' }))
                  }}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: fieldErrors.otp ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.otp ? (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{fieldErrors.otp}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Code expires in 10 minutes
                  </p>
                )}
              </div>
              <Button type="submit" loading={loading} disabled={!formData.otp || formData.otp.length !== 6}>
                {loading ? 'Updating Email...' : 'Update Email'}
              </Button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="modal-resend-btn"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: resendCooldown > 0 ? '#9ca3af' : '#2563eb',
                  opacity: resendCooldown > 0 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.2s',
                }}
              >
                <FiRefreshCw style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="modal-cancel-btn"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, updateProfile, changePassword, api } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [profileFieldErrors, setProfileFieldErrors] = useState({})
  const clearProfileFieldError = (field) => {
    setProfileFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const clearPasswordFieldError = (field) => {
    setPasswordFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }
  const [preferences, setPreferences] = useState({
    emailNotifications: user?.preferences?.notifications?.email ?? true,
    inAppNotifications: user?.preferences?.notifications?.inApp ?? true,
    timezone: user?.preferences?.timezone || 'Asia/Kolkata',
    language: user?.preferences?.language || 'en',
  })
  const [loading, setLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [currentEmail, setCurrentEmail] = useState(user?.email || '')

  // Company Profile state
  const [companyLoading, setCompanyLoading] = useState(false)
  const [companySaving, setCompanySaving] = useState(false)
  const [company, setCompany] = useState(null)
  const [companyError, setCompanyError] = useState(null)
  const [showCompanyEmailModal, setShowCompanyEmailModal] = useState(false)
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    email: '',
    phone: '',
    'address.street': '',
    'address.city': '',
    'address.state': '',
    'address.country': '',
  })
  const [hasCompanyChanges, setHasCompanyChanges] = useState(false)
  const [originalCompanyData, setOriginalCompanyData] = useState(null)
  const [companyFieldErrors, setCompanyFieldErrors] = useState({})

  // Fetch company profile on mount (for admin role)
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCompany()
    }
  }, [user?.role])

  const fetchCompany = async () => {
    try {
      setCompanyLoading(true)
      setCompanyError(null)
      const response = await api.get('/companies/my')
      const companyData = response.data.data
      setCompany(companyData)

      const data = {
        name: companyData.name || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        'address.street': companyData.address?.street || '',
        'address.city': companyData.address?.city || '',
        'address.state': companyData.address?.state || '',
        'address.country': companyData.address?.country || '',
      }

      setCompanyFormData(data)
      setOriginalCompanyData(data)
    } catch (err) {
      console.error('Failed to fetch company:', err)
      setCompanyError(err.response?.data?.message || 'Failed to load company profile')
    } finally {
      setCompanyLoading(false)
    }
  }

  const handleCompanyChange = (e) => {
    const { name, value } = e.target
    setCompanyFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setHasCompanyChanges(true)
    setCompanyFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleCompanyPhoneChange = (phone) => {
    setCompanyFormData((prev) => ({
      ...prev,
      phone,
    }))
    setHasCompanyChanges(true)
    setCompanyFieldErrors((prev) => {
      if (!prev.phone) return prev
      const next = { ...prev }
      delete next.phone
      return next
    })
  }

  const handleProfilePhoneChange = (phone) => {
    setProfileData((prev) => ({
      ...prev,
      phone,
    }))
    clearProfileFieldError('phone')
  }

  const handleCompanySubmit = async (e) => {
    e.preventDefault()

    const errors = {}
    if (!companyFormData.name.trim()) {
      errors.name = 'Company name is required'
    } else if (companyFormData.name.trim().length > 100) {
      errors.name = 'Company name cannot exceed 100 characters'
    }
    const companyPhoneError = validatePhone(companyFormData.phone)
    if (companyPhoneError) errors.phone = companyPhoneError
    // Address validation
    const streetRegex = /^[a-zA-Z0-9\s,.\-/'()#&]*$/
    const cityStateCountryRegex = /^[\p{L}\s\-'.]*$/u
    if (companyFormData['address.street'] && companyFormData['address.street'].length > 200) {
      errors['address.street'] = 'Street address cannot exceed 200 characters'
    } else if (companyFormData['address.street'] && !streetRegex.test(companyFormData['address.street'])) {
      errors['address.street'] = 'Street can only contain letters, numbers, spaces, comma, period, hyphen, slash, apostrophe, parentheses, hash, and ampersand'
    }
    if (companyFormData['address.city'] && !cityStateCountryRegex.test(companyFormData['address.city'])) {
      errors['address.city'] = 'City can only contain letters, spaces, hyphens, apostrophes, and periods'
    } else if (companyFormData['address.city'] && companyFormData['address.city'].length > 50) {
      errors['address.city'] = 'City cannot exceed 50 characters'
    }
    if (companyFormData['address.state'] && !cityStateCountryRegex.test(companyFormData['address.state'])) {
      errors['address.state'] = 'State can only contain letters, spaces, hyphens, apostrophes, and periods'
    } else if (companyFormData['address.state'] && companyFormData['address.state'].length > 50) {
      errors['address.state'] = 'State cannot exceed 50 characters'
    }
    if (companyFormData['address.country'] && !cityStateCountryRegex.test(companyFormData['address.country'])) {
      errors['address.country'] = 'Country can only contain letters, spaces, hyphens, apostrophes, and periods'
    } else if (companyFormData['address.country'] && companyFormData['address.country'].length > 50) {
      errors['address.country'] = 'Country cannot exceed 50 characters'
    }
    if (Object.keys(errors).length > 0) {
      setCompanyFieldErrors(errors)
      return
    }

    setCompanySaving(true)
    try {
      const data = {
        name: companyFormData.name,
        phone: companyFormData.phone,
        address: {
          street: companyFormData['address.street'],
          city: companyFormData['address.city'],
          state: companyFormData['address.state'],
          country: companyFormData['address.country'],
        },
      }

      await api.put('/companies/my', data)
      setCompanyFieldErrors({})
      toast.success('Company profile updated successfully.')
      setHasCompanyChanges(false)

      // Refresh company data
      await fetchCompany()
    } catch (err) {
      const respData = err.response?.data
      if (Array.isArray(respData?.errors) && respData.errors.length > 0) {
        const mapped = {}
        respData.errors.forEach((e) => {
          const key = e.field === 'phone' ? 'phone' :
                      e.field === 'name' ? 'name' : e.field
          if (key) mapped[key] = e.message
        })
        if (Object.keys(mapped).length > 0) {
          setCompanyFieldErrors(mapped)
          return
        }
      }
      toast.error(extractErrorMessage(err, 'Failed to update company profile'))
    } finally {
      setCompanySaving(false)
    }
  }

  const handleCompanyReset = () => {
    if (originalCompanyData) {
      setCompanyFormData(originalCompanyData)
      setHasCompanyChanges(false)
      setCompanyFieldErrors({})
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!profileData.name.trim()) {
      errors.name = 'Full name is required'
    } else if (profileData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    } else if (profileData.name.trim().length > 50) {
      errors.name = 'Name cannot exceed 50 characters'
    } else if (/[0-9]/.test(profileData.name.trim())) {
      errors.name = 'Name cannot contain numbers'
    }
    const phoneError = validatePhone(profileData.phone)
    if (phoneError) errors.phone = phoneError
    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors)
      return
    }
    setProfileFieldErrors({})
    setLoading(true)
    try {
      await updateProfile(profileData)
    } catch (error) {
      const data = error.response?.data
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const mapped = {}
        data.errors.forEach((e) => {
          if (e.field === 'name') mapped.name = e.message
          else if (e.field === 'phone' || e.field === 'mobileNumber') mapped.phone = e.message
        })
        if (Object.keys(mapped).length > 0) {
          setProfileFieldErrors(mapped)
          return
        }
      }
      const msg = data?.message || extractErrorMessage(error, 'Failed to update profile')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!passwordData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required.'
    } else if (passwordData.currentPassword.length < 1) {
      errors.currentPassword = 'Current password is required.'
    }
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required.'
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.'
    } else if (passwordData.newPassword.length > 15) {
      errors.newPassword = 'New password cannot exceed 15 characters.'
    } else if (!/[A-Z]/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter (A-Z).'
    } else if (!/[a-z]/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one lowercase letter (a-z).'
    } else if (!/[0-9]/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one number (0-9).'
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one special character (!@#$%^&*...).'
    }
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordFieldErrors({})
    } catch (error) {
      const data = error.response?.data
      if (data && Array.isArray(data.errors) && data.errors.length > 0) {
        const fieldMap = {}
        data.errors.forEach((err) => {
          const field = err.field || err.param
          if (field === 'currentPassword') fieldMap.currentPassword = err.message
          else if (field === 'newPassword') fieldMap.newPassword = err.message
          else fieldMap.currentPassword = fieldMap.currentPassword || err.message
        })
        if (Object.keys(fieldMap).length > 0) setPasswordFieldErrors(fieldMap)
      } else {
        const msg = data?.message || ''
        if (/incorrect password/i.test(msg)) {
          setPasswordFieldErrors({ currentPassword: 'Incorrect password. Please check and try again.' })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile({ preferences })
      toast.success('Preferences updated')
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChangeSuccess = (newEmail) => {
    setCurrentEmail(newEmail)
    // Refresh user data from server
    window.location.reload()
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'security', label: 'Security', icon: FiLock },
    ...(user?.role === 'admin' ? [{ id: 'company', label: 'Company Profile', icon: FiBriefcase }] : []),
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        // Company Profile tab (admin only)
        if (companyLoading) {
          return (
            <Card>
              <CardBody style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                <Spinner size="lg" />
              </CardBody>
            </Card>
          )
        }

        if (companyError) {
          return (
            <Card>
              <CardBody>
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#dc2626' }}>Error Loading Company</h3>
                  <p style={{ color: '#6b7280', marginBottom: '16px' }}>{companyError}</p>
                  <Button onClick={fetchCompany}>Try Again</Button>
                </div>
              </CardBody>
            </Card>
          )
        }

        return (
          <Card>
            <CardBody>
              <style>{`
                @media (max-width: 640px) {
                  .company-form-grid { grid-template-columns: 1fr !important; }
                  .company-address-grid { grid-template-columns: 1fr !important; }
                  .company-buttons { flex-direction: column; }
                  .company-buttons button { width: 100%; }
                }
                @media (min-width: 641px) and (max-width: 900px) {
                  .company-address-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
              `}</style>
              <form onSubmit={handleCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Company Info Section */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiBriefcase style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                    Company Information
                  </h3>
                  <div className="company-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                        Company Name<span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={companyFormData.name}
                        onChange={handleCompanyChange}
                        onBlur={() => {
                          if (!companyFormData.name.trim()) setCompanyFieldErrors((prev) => ({ ...prev, name: 'Company name is required' }))
                          else if (companyFormData.name.trim().length > 100) setCompanyFieldErrors((prev) => ({ ...prev, name: 'Company name cannot exceed 100 characters' }))
                        }}
                        placeholder="Enter company name"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: companyFieldErrors.name ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {companyFieldErrors.name && (
                        <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{companyFieldErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                        Company Email<span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div className="company-email-field-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'row' }}>
                        <style>{`
                          @media (max-width: 480px) {
                            .company-email-field-wrapper {
                              flex-direction: column !important;
                            }
                            .company-email-field-wrapper .email-input-container {
                              width: 100% !important;
                            }
                            .company-email-field-wrapper button {
                              width: 100% !important;
                            }
                          }
                        `}</style>
                        <div className="email-input-container" style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                          <FiMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                          <input
                            type="email"
                            value={companyFormData.email}
                            disabled
                            placeholder="company@example.com"
                            style={{
                              width: '100%',
                              padding: '10px 12px 10px 38px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              backgroundColor: '#f9fafb',
                              color: '#6b7280',
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowCompanyEmailModal(true)}
                          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          <FiMail style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                          Change
                        </Button>
                      </div>
                      <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        Changing company email requires verification via OTP sent to both old and new emails
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiPhone style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                    Contact Information
                  </h3>
                  <div style={{ width: '100%', maxWidth: '100%' }}>
                    <PhoneInput
                      value={companyFormData.phone}
                      onChange={handleCompanyPhoneChange}
                      onBlur={() => {
                        const err = validatePhone(companyFormData.phone)
                        if (err) setCompanyFieldErrors((prev) => ({ ...prev, phone: err }))
                      }}
                      label="Contact Number"
                      required
                      placeholder="+91 9876543210"
                      error={companyFieldErrors.phone || ''}
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiMapPin style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                    Address
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={companyFormData['address.street']}
                        onChange={handleCompanyChange}
                        placeholder="e.g., 456 Business Park Drive, Floor 3"
                        maxLength={200}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: companyFieldErrors['address.street'] ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {companyFieldErrors['address.street'] && (
                        <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{companyFieldErrors['address.street']}</p>
                      )}
                    </div>
                    <div className="company-address-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                          City
                        </label>
                        <input
                          type="text"
                          name="address.city"
                          value={companyFormData['address.city']}
                          onChange={handleCompanyChange}
                          placeholder="Chicago"
                          maxLength={50}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: companyFieldErrors['address.city'] ? '1px solid #dc2626' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        {companyFieldErrors['address.city'] && (
                          <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{companyFieldErrors['address.city']}</p>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                          State/Province
                        </label>
                        <input
                          type="text"
                          name="address.state"
                          value={companyFormData['address.state']}
                          onChange={handleCompanyChange}
                          placeholder="Illinois"
                          maxLength={50}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: companyFieldErrors['address.state'] ? '1px solid #dc2626' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        {companyFieldErrors['address.state'] && (
                          <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{companyFieldErrors['address.state']}</p>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                          Country
                        </label>
                        <select
                          name="address.country"
                          value={companyFormData['address.country']}
                          onChange={handleCompanyChange}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: companyFieldErrors['address.country'] ? '1px solid #dc2626' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Select Country</option>
                          {countryList.map((country) => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                        {companyFieldErrors['address.country'] && (
                          <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{companyFieldErrors['address.country']}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Info (Read-only) */}
                {company && (
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                      Subscription Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Current Plan</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                          {company.planDetails?.name || company.plan || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Subscription Status</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: company.subscriptionStatus === 'expired' ? '#dc2626' : '#16a34a' }}>
                          {company.subscriptionStatus === 'expired' ? 'Expired' : 'Active'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Valid Until</p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                          {company.subscriptionEndDate ? formatDate(company.subscriptionEndDate) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', marginBottom: 0 }}>
                      Contact support to upgrade your subscription or make changes to your plan.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="company-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  {hasCompanyChanges && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCompanyReset}
                      disabled={companySaving}
                      icon={FiRefreshCw}
                    >
                      Reset
                    </Button>
                  )}
                  <Button
                    type="submit"
                    loading={companySaving}
                    disabled={!hasCompanyChanges}
                    icon={FiSave}
                  >
                    {companySaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )

      case 'profile':
        return (
          <Card>
            <CardBody>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Profile Information</h3>
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Full Name<span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    placeholder='Mohit Patil'
                    onChange={(e) => {
                      setProfileData({ ...profileData, name: e.target.value })
                      clearProfileFieldError('name')
                    }}
                    onBlur={() => {
                      if (!profileData.name.trim()) setProfileFieldErrors((prev) => ({ ...prev, name: 'Full name is required' }))
                      else if (profileData.name.trim().length > 50) setProfileFieldErrors((prev) => ({ ...prev, name: 'Name cannot exceed 50 characters' }))
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: profileFieldErrors.name ? '1px solid #dc2626' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {profileFieldErrors.name && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{profileFieldErrors.name}</p>
                  )}
                </div> */}
                <div>
  <label
    style={{
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
      fontSize: '13px',
      color: '#374151',
    }}
  >
    Full Name<span style={{ color: '#dc2626' }}>*</span>
  </label>

  <input
    type="text"
    value={profileData.name}
    maxLength={50}
    placeholder="Mohit Patil"
    onChange={(e) => {
      const filtered = e.target.value.replace(/[0-9]/g, '')
      setProfileData({
        ...profileData,
        name: filtered,
      });

      clearProfileFieldError('name');
    }}
    onBlur={() => {
      if (!profileData.name.trim()) {
        setProfileFieldErrors((prev) => ({
          ...prev,
          name: 'Full name is required',
        }));
      } else if (profileData.name.trim().length < 2) {
        setProfileFieldErrors((prev) => ({
          ...prev,
          name: 'Name must be at least 2 characters',
        }));
      } else if (profileData.name.trim().length > 50) {
        setProfileFieldErrors((prev) => ({
          ...prev,
          name: 'Name cannot exceed 50 characters',
        }));
      } else if (/[0-9]/.test(profileData.name.trim())) {
        setProfileFieldErrors((prev) => ({
          ...prev,
          name: 'Name cannot contain numbers',
        }));
      }
    }}
    style={{
      width: '100%',
      padding: '10px 14px',
      border: profileFieldErrors.name
        ? '1px solid #dc2626'
        : '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    }}
  />

  {profileFieldErrors.name && (
    <p
      style={{
        fontSize: '12px',
        color: '#dc2626',
        marginTop: '4px',
        marginBottom: '0',
      }}
    >
      {profileFieldErrors.name}
    </p>
  )}

  <p
    style={{
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'right',
      marginTop: '4px',
      marginBottom: '0',
    }}
  >
    {profileData.name.length}/50
  </p>
</div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Email ID
                  </label>
                  <div className="email-field-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'row' }}>
                    <style>{`
                      @media (max-width: 480px) {
                        .email-field-wrapper {
                          flex-direction: column !important;
                        }
                        .email-field-wrapper input {
                          width: 100% !important;
                        }
                        .email-field-wrapper button {
                          width: 100% !important;
                        }
                      }
                    `}</style>
                    <input
                      type="email"
                      value={currentEmail}
                      disabled
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowEmailModal(true)}
                      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      <FiMail style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                      Change
                    </Button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Click "Change" to update your Email ID with verification.
                  </p>
                </div>
                <div>
                  <PhoneInput
                    value={profileData.phone}
                    onChange={handleProfilePhoneChange}
                    onBlur={() => {
                      const err = validatePhone(profileData.phone)
                      if (err) setProfileFieldErrors((prev) => ({ ...prev, phone: err }))
                    }}
                    label="Contact Number"
                    required
                    placeholder="9356080318"
                    error={profileFieldErrors.phone || ''}
                  />
                </div>
                <Button type="submit" loading={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )
      case 'security':
        return (
          <Card>
            <CardBody>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Change Password</h3>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Current Password<span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0' }}>
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      placeholder='Admin@1234'
                      maxLength={15}
                      autoComplete="off"
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        clearPasswordFieldError('currentPassword')
                      }}
                      onBlur={() => {
                        if (!passwordData.currentPassword.trim()) setPasswordFieldErrors((prev) => ({ ...prev, currentPassword: 'Current password is required.' }))
                      }}
                      style={{
                        flex: '1',
                        padding: '10px 14px',
                        border: passwordFieldErrors.currentPassword ? '1px solid #dc2626' : '1px solid #d1d5db',
                        borderRight: 'none',
                        borderRadius: '8px 0 0 8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                      style={{
                        padding: '10px 14px',
                        border: passwordFieldErrors.currentPassword ? '1px solid #dc2626' : '1px solid #d1d5db',
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
                      {showPassword.current ? <FiEye style={{ width: '18px', height: '18px' }} /> : <FiEyeOff style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>
                  {passwordFieldErrors.currentPassword && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{passwordFieldErrors.currentPassword}</p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    New Password<span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0' }}>
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      placeholder='John@1234'
                      maxLength={15}
                      autoComplete="new-password"
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                        clearPasswordFieldError('newPassword')
                      }}
                      onBlur={() => {
                        if (!passwordData.newPassword) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'New password is required.' }))
                        else if (passwordData.newPassword.length < 8) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'New password must be at least 8 characters.' }))
                        else if (passwordData.newPassword.length > 15) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'New password cannot exceed 15 characters.' }))
                        else if (!/[A-Z]/.test(passwordData.newPassword)) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'Password must contain at least one uppercase letter (A-Z).' }))
                        else if (!/[a-z]/.test(passwordData.newPassword)) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'Password must contain at least one lowercase letter (a-z).' }))
                        else if (!/[0-9]/.test(passwordData.newPassword)) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'Password must contain at least one number (0-9).' }))
                        else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword)) setPasswordFieldErrors((prev) => ({ ...prev, newPassword: 'Password must contain at least one special character (!@#$%^&*...).' }))
                      }}
                      style={{
                        flex: '1',
                        padding: '10px 14px',
                        border: passwordFieldErrors.newPassword ? '1px solid #dc2626' : '1px solid #d1d5db',
                        borderRight: 'none',
                        borderRadius: '8px 0 0 8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                      style={{
                        padding: '10px 14px',
                        border: passwordFieldErrors.newPassword ? '1px solid #dc2626' : '1px solid #d1d5db',
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
                      {showPassword.new ? <FiEye style={{ width: '18px', height: '18px' }} /> : <FiEyeOff style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>
                  {passwordFieldErrors.newPassword ? (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{passwordFieldErrors.newPassword}</p>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {passwordData.newPassword.length > 0
                        ? `${passwordData.newPassword.length}/15 characters`
                        : '8-15 characters with uppercase, lowercase, number & special character'}
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Confirm New Password<span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0' }}>
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      placeholder='John@1234'
                      maxLength={15}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        clearPasswordFieldError('confirmPassword')
                      }}
                      onBlur={() => {
                        if (!passwordData.confirmPassword) setPasswordFieldErrors((prev) => ({ ...prev, confirmPassword: 'Please confirm your new password.' }))
                        else if (passwordData.newPassword !== passwordData.confirmPassword) setPasswordFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }))
                      }}
                      style={{
                        flex: '1',
                        padding: '10px 14px',
                        border: passwordFieldErrors.confirmPassword ? '1px solid #dc2626' : '1px solid #d1d5db',
                        borderRight: 'none',
                        borderRadius: '8px 0 0 8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                      style={{
                        padding: '10px 14px',
                        border: passwordFieldErrors.confirmPassword ? '1px solid #dc2626' : '1px solid #d1d5db',
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
                      {showPassword.confirm ? <FiEye style={{ width: '18px', height: '18px' }} /> : <FiEyeOff style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>
                  {passwordFieldErrors.confirmPassword && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{passwordFieldErrors.confirmPassword}</p>
                  )}
                </div>
                <Button type="submit" loading={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card style={{ width: '100%' }}>
            <CardBody style={{ padding: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: activeTab === tab.id ? '#2563eb' : '#475569',
                      backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                    }}
                  >
                    <tab.icon style={{ width: '18px', height: '18px' }} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <div style={{ flex: 1 }}>
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Email Change Modal */}
      <EmailChangeModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        currentEmail={currentEmail}
        onSuccess={handleEmailChangeSuccess}
      />

      {/* Company Email Change Modal */}
      <CompanyEmailChangeModal
        isOpen={showCompanyEmailModal}
        onClose={() => setShowCompanyEmailModal(false)}
        currentEmail={companyFormData.email}
        companyName={companyFormData.name}
        onSuccess={(newEmail) => {
          setCompanyFormData((prev) => ({ ...prev, email: newEmail }))
          setHasCompanyChanges(false)
          fetchCompany()
        }}
      />

      <style>{`
        .modal-close-btn:hover {
          background-color: #f1f5f9 !important;
        }
        .modal-cancel-btn:hover {
          background-color: #f9fafb !important;
          border-color: #9ca3af !important;
        }
        .modal-resend-btn:hover:not(:disabled) {
          background-color: #eff6ff !important;
        }
      `}</style>
    </PageContainer>
  )
}