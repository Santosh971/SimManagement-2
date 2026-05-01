import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiUser, FiLock, FiMail, FiEye, FiEyeOff, FiX, FiBriefcase, FiMapPin, FiPhone, FiGlobe, FiSave, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
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
  const [showPassword, setShowPassword] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFormData({ newEmail: '', password: '', otp: '' })
      setPendingNewEmail('')
      setShowPassword(false)
      setLoading(false)
    }
  }, [isOpen])

  const handleClose = () => {
    // Cancel pending email change when modal is closed
    if (step > 1) {
      api.post('/auth/email-change/cancel').catch(() => {})
    }
    setStep(1)
    setFormData({ newEmail: '', password: '', otp: '' })
    setPendingNewEmail('')
    onClose()
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!formData.newEmail || !formData.password) {
      toast.error('Please fill all fields')
      return
    }
    if (formData.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error('New email cannot be the same as current email')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/email-change/request', {
        newEmail: formData.newEmail,
        password: formData.password,
      })
      setPendingNewEmail(formData.newEmail)
      setStep(2)
      toast.success('Verification code sent to your current email')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request email change')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOld = async (e) => {
    e.preventDefault()
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/email-change/verify-old', { otp: formData.otp })
      setFormData({ ...formData, otp: '' })
      setStep(3)
      toast.success('Verification code sent to your new email')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyNew = async (e) => {
    e.preventDefault()
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/auth/email-change/verify-new', { otp: formData.otp })
      toast.success('Email updated successfully!')
      onSuccess(response.data.data.newEmail)
      handleClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
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
            {step === 1 && 'Change Email Address'}
            {step === 2 && 'Verify Current Email'}
            {step === 3 && 'Verify New Email'}
          </h2>
          <button
            onClick={handleClose}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
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
                  New Email Address
                </label>
                <input
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                  placeholder="Enter new email address"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Password is required for security verification
                </p>
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
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Code expires in 10 minutes
                </p>
              </div>
              <Button type="submit" loading={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
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
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Code expires in 10 minutes
                </p>
              </div>
              <Button type="submit" loading={loading}>
                {loading ? 'Completing...' : 'Complete Email Change'}
              </Button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
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
  const [showPassword, setShowPassword] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFormData({ newEmail: '', password: '', otp: '' })
      setPendingNewEmail('')
      setShowPassword(false)
      setLoading(false)
    }
  }, [isOpen])

  const handleClose = () => {
    // Cancel pending email change when modal is closed
    if (step > 1) {
      api.post('/companies/my/email-change/cancel').catch(() => {})
    }
    setStep(1)
    setFormData({ newEmail: '', password: '', otp: '' })
    setPendingNewEmail('')
    onClose()
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!formData.newEmail || !formData.password) {
      toast.error('Please fill all fields')
      return
    }
    if (formData.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error('New email cannot be the same as current company email')
      return
    }
    setLoading(true)
    try {
      await api.post('/companies/my/email-change/request', {
        newEmail: formData.newEmail,
        password: formData.password,
      })
      setPendingNewEmail(formData.newEmail)
      setStep(2)
      toast.success('Verification code sent to current company email')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request email change')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOld = async (e) => {
    e.preventDefault()
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    setLoading(true)
    try {
      await api.post('/companies/my/email-change/verify-old', { otp: formData.otp })
      setFormData({ ...formData, otp: '' })
      setStep(3)
      toast.success('Verification code sent to the new email')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyNew = async (e) => {
    e.preventDefault()
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    setLoading(true)
    try {
      const response = await api.post('/companies/my/email-change/verify-new', { otp: formData.otp })
      toast.success('Company email updated successfully!')
      onSuccess(response.data.data.email)
      handleClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
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
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
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
                  New Company Email Address
                </label>
                <input
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                  placeholder="Enter new email address"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Confirm Your Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Your password is required for security verification
                </p>
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
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Code expires in 10 minutes
                </p>
              </div>
              <Button type="submit" loading={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
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
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Code expires in 10 minutes
                </p>
              </div>
              <Button type="submit" loading={loading}>
                {loading ? 'Completing...' : 'Complete Email Change'}
              </Button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
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
  }

  const handleCompanyPhoneChange = (phone) => {
    setCompanyFormData((prev) => ({
      ...prev,
      phone,
    }))
    setHasCompanyChanges(true)
  }

  const handleCompanySubmit = async (e) => {
    e.preventDefault()

    if (!companyFormData.name.trim()) {
      toast.error('Company name is required')
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
      toast.success('Company profile updated successfully')
      setHasCompanyChanges(false)

      // Refresh company data
      await fetchCompany()
    } catch (err) {
      console.error('Failed to update company:', err)
      toast.error(err.response?.data?.message || 'Failed to update company profile')
    } finally {
      setCompanySaving(false)
    }
  }

  const handleCompanyReset = () => {
    if (originalCompanyData) {
      setCompanyFormData(originalCompanyData)
      setHasCompanyChanges(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile(profileData)
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      // Error handled in AuthContext
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
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={companyFormData.name}
                        onChange={handleCompanyChange}
                        placeholder="Enter company name"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                        Company Email *
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
                      label="Phone Number"
                      placeholder="+91 9876543210"
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
                        placeholder="123 Main Street"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
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
                          placeholder="City"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                          State / Province
                        </label>
                        <input
                          type="text"
                          name="address.state"
                          value={companyFormData['address.state']}
                          onChange={handleCompanyChange}
                          placeholder="State"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                          Country
                        </label>
                        <input
                          type="text"
                          name="address.country"
                          value={companyFormData['address.country']}
                          onChange={handleCompanyChange}
                          placeholder="Country"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
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
                          {company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toLocaleDateString() : 'N/A'}
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
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Email Address
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
                    Click "Change" to update your email address with verification
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
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
                    Current Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                      }}
                    >
                      {showPassword.current ? <FiEyeOff style={{ width: '18px', height: '18px' }} /> : <FiEye style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                      }}
                    >
                      {showPassword.new ? <FiEyeOff style={{ width: '18px', height: '18px' }} /> : <FiEye style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                      }}
                    >
                      {showPassword.confirm ? <FiEyeOff style={{ width: '18px', height: '18px' }} /> : <FiEye style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>
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
    </PageContainer>
  )
}