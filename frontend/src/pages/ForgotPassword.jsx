import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiSmartphone, FiCheck, FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ForgotPassword() {
  const navigate = useNavigate()

  // Step state
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: Reset Password

  // Form states
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Loading states
  const [loading, setLoading] = useState(false)

  // Timer for resend OTP
  const [countdown, setCountdown] = useState(0)

  // OTP input refs
  const otpRefs = useRef([])

  // Password validation
  const hasMinLength = newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Handle email submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password-otp`, { email })
      toast.success('Verification code sent to your email')
      setCountdown(60) // Start 60 second countdown
      setStep(2)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send verification code'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take last character

    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  // Handle OTP key down (backspace)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)
    // Focus the last filled input or next empty one
    const nextIndex = Math.min(pastedData.length, 5)
    otpRefs.current[nextIndex]?.focus()
  }

  // Handle OTP verify
  const handleOtpVerify = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${API_URL}/auth/verify-forgot-password-otp`, { email, otp: otpString })
      toast.success('Verification successful')
      setStep(3)
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid verification code'
      toast.error(message)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return

    setLoading(true)
    try {
      await axios.post(`${API_URL}/auth/forgot-password-otp`, { email })
      toast.success('New verification code sent')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend code'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault()

    if (!hasMinLength) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (!hasUppercase) {
      toast.error('Password must contain at least one uppercase letter')
      return
    }
    if (!hasNumber) {
      toast.error('Password must contain at least one number')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const otpString = otp.join('')
    setLoading(true)
    try {
      await axios.post(`${API_URL}/auth/reset-password-otp`, {
        email,
        otp: otpString,
        newPassword
      })
      toast.success('Password reset successfully!')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <FiSmartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Reset Password'}
          </h1>
          <p className="text-secondary-500 mt-2">
            {step === 1 && 'Enter your admin email to receive a verification code'}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && 'Enter your new password'}
          </p>
        </div>

        {/* Form */}
        <div className="card">
          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="card-body">
              <div className="form-group">
                <label className="label">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Send OTP'
                )}
              </button>

              <p className="text-center text-secondary-600 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Back to Login
                </Link>
              </p>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpVerify} className="card-body">
              <div className="form-group">
                <label className="label">Verification Code</label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-12 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      style={{ borderColor: digit ? '#2563eb' : '#d1d5db' }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="text-center mt-4">
                {countdown > 0 ? (
                  <span className="text-secondary-400 text-sm">
                    Resend code in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <p className="text-center text-secondary-600 mt-6">
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                  <FiArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </p>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handlePasswordReset} className="card-body">
              {/* New Password */}
              <div className="form-group">
                <label className="label">New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="mb-4 space-y-1">
                <p className="text-sm text-secondary-600 font-medium">Password Requirements:</p>
                <div className="flex items-center gap-2 text-sm">
                  <FiCheck className={`w-4 h-4 ${hasMinLength ? 'text-green-500' : 'text-secondary-300'}`} />
                  <span className={hasMinLength ? 'text-green-600' : 'text-secondary-400'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiCheck className={`w-4 h-4 ${hasUppercase ? 'text-green-500' : 'text-secondary-300'}`} />
                  <span className={hasUppercase ? 'text-green-600' : 'text-secondary-400'}>
                    At least one uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiCheck className={`w-4 h-4 ${hasNumber ? 'text-green-500' : 'text-secondary-300'}`} />
                  <span className={hasNumber ? 'text-green-600' : 'text-secondary-400'}>
                    At least one number
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !hasMinLength || !hasUppercase || !hasNumber}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Reset Password'
                )}
              </button>

              <p className="text-center text-secondary-600 mt-6">
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                  <FiArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}