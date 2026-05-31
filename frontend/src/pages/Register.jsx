import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone, FiBriefcase, FiArrowRight, FiArrowLeft, FiLoader, FiAlertCircle, FiCheckCircle, FiCheck, FiX } from 'react-icons/fi'
import Logo from '../components/Logo'
import { CountryCodeSelect } from '../components/ui'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

const featureLabels = {
  callLogSync: 'Call Log Sync',
  whatsappStatus: 'WhatsApp Tracking',
  telegramStatus: 'Telegram Tracking',
  wifiMonitor: 'WiFi Monitor',
  callAutomation: 'Call Automation',
  smsLogs: 'SMS Logs',
  emailNotifications: 'Email Notifications',
  smsNotifications: 'SMS Notifications',
  advancedReports: 'Advanced Reports',
  excelExport: 'Excel Export',
  apiAccess: 'API Access',
  prioritySupport: 'Priority Support',
}

export default function Register() {
  const [searchParams] = useSearchParams()
  const planIdFromUrl = searchParams.get('plan')
  const billingCycleFromUrl = searchParams.get('cycle') || 'monthly'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    countryCode: '+91',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [billingCycle, setBillingCycle] = useState(billingCycleFromUrl)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [planError, setPlanError] = useState('')
  const [companyNameStatus, setCompanyNameStatus] = useState({ checking: false, available: null, message: '' })
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  // Fetch plan details — always fetch plans; auto-select if planId is in URL
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/subscriptions/compare`)
        const data = await response.json()
        if (data.success && data.data) {
          setPlans(data.data)
          if (planIdFromUrl) {
            const foundPlan = data.data.find(p => p._id === planIdFromUrl)
            if (foundPlan) {
              setPlan(foundPlan)
            } else {
              toast.error('Plan not found')
            }
          }
        }
      } catch (error) {
        toast.error('Failed to load plan details')
      } finally {
        setLoadingPlan(false)
      }
    }
    fetchPlans()
  }, [planIdFromUrl])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1]
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      })
    } else if (name === 'phone') {
      // Only allow digits for phone number (same as SIMs Contact Number)
      const digitsOnly = value.replace(/\D/g, '')
      setFormData({
        ...formData,
        phone: digitsOnly,
      })
    } else if (name === 'countryCode') {
      // When country code changes, clear phone for fresh entry (same as SIMs)
      setFormData({
        ...formData,
        countryCode: value,
        phone: '',
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
    // Real-time inline validation on change
    const error = validateField(name, name.startsWith('address.') ? (formData.address[name.split('.')[1]] || '') : (name === 'phone' ? value.replace(/\D/g, '') : value))
    // For address fields, re-evaluate with the new value since state hasn't updated yet
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1]
      const addressError = validateField(name, value)
      setErrors((prev) => {
        const updated = { ...prev }
        if (addressError) {
          updated[name] = addressError
        } else {
          delete updated[name]
        }
        return updated
      })
    } else if (name === 'phone') {
      const phoneError = validateField('phone', value.replace(/\D/g, ''))
      setErrors((prev) => {
        const updated = { ...prev }
        if (phoneError) {
          updated.phone = phoneError
        } else {
          delete updated.phone
        }
        return updated
      })
    } else {
      setErrors((prev) => {
        const updated = { ...prev }
        if (error) {
          updated[name] = error
        } else {
          delete updated[name]
        }
        return updated
      })
    }
    // Also re-validate confirmPassword when password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword)
      setErrors((prev) => {
        const updated = { ...prev }
        if (confirmError) {
          updated.confirmPassword = confirmError
        } else {
          delete updated.confirmPassword
        }
        return updated
      })
    }
  }

  // Validate a single field, returns error message or empty string
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value || !value.trim()) return 'Full name is required'
        if (value.trim().length < 2) return 'Name must be at least 2 characters'
        if (value.trim().length > 50) return 'Name cannot exceed 50 characters'
        return ''
      case 'email':
        if (!value || !value.trim()) return 'Email is required'
        if (value.trim().length > 254) return 'Email cannot exceed 254 characters'
        if (!/^\S+@\S+\.\S+$/.test(value.trim())) return 'Please enter a valid email address'
        return ''
      case 'companyName':
        if (!value || !value.trim()) return 'Company name is required'
        if (value.trim().length < 2) return 'Company name must be at least 2 characters'
        if (value.trim().length > 100) return 'Company name cannot exceed 100 characters'
        return ''
      case 'phone':
        if (value && value.trim()) {
          if (!/^\d+$/.test(value.trim())) return 'Only digits are allowed'
          if (formData.countryCode === '+91' && !/^\d{10}$/.test(value.trim())) return 'Must be 10 digits for Indian numbers'
          if (formData.countryCode !== '+91') {
            const totalDigits = (formData.countryCode.length - 1) + value.trim().length
            if (totalDigits < 10 || totalDigits > 15) return 'Combined number must be 10-15 digits'
          }
        }
        return ''
      case 'address.street':
        if (value && value.trim() && value.trim().length < 3) return 'Street must be at least 3 characters'
        if (value && value.length > 200) return 'Street cannot exceed 200 characters'
        return ''
      case 'address.city':
        if (value && value.trim() && value.trim().length < 2) return 'City must be at least 2 characters'
        if (value && value.length > 50) return 'City cannot exceed 50 characters'
        return ''
      case 'address.state':
        if (value && value.trim() && value.trim().length < 2) return 'State must be at least 2 characters'
        if (value && value.length > 50) return 'State cannot exceed 50 characters'
        return ''
      case 'address.country':
        if (value && value.trim() && value.trim().length < 2) return 'Country must be at least 2 characters'
        if (value && value.length > 50) return 'Country cannot exceed 50 characters'
        return ''
      case 'address.zipCode':
        if (value && value.trim() && value.trim().length < 3) return 'Zip code must be at least 3 characters'
        if (value && value.trim() && !/^[a-zA-Z0-9\s-]{3,20}$/.test(value.trim())) return 'Invalid zip/postal code format (3-20 characters)'
        return ''
      case 'password':
        if (!value) return 'Password is required'
        if (value.length < 8) return 'Password must be at least 8 characters'
        if (value.length > 15) return 'Password cannot exceed 15 characters'
        if (!/[A-Z]/.test(value)) return 'Must include at least one uppercase letter'
        if (!/[a-z]/.test(value)) return 'Must include at least one lowercase letter'
        if (!/[0-9]/.test(value)) return 'Must include at least one number'
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return 'Must include at least one special character (!@#$%...)'
        return ''
      case 'confirmPassword':
        if (!value) return 'Please confirm your password'
        if (value !== formData.password) return 'Passwords do not match'
        return ''
      default:
        return ''
    }
  }

  // Handle blur — validate the field
  const handleBlur = (e) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  // Debounced company name availability check
  const checkCompanyNameAvailability = useCallback(
    (() => {
      let timeoutId = null
      return (name) => {
        if (timeoutId) clearTimeout(timeoutId)
        if (!name || name.trim().length < 2) {
          setCompanyNameStatus({ checking: false, available: null, message: '' })
          return
        }
        setCompanyNameStatus({ checking: true, available: null, message: '' })
        timeoutId = setTimeout(async () => {
          try {
            const response = await fetch(`${API_URL}/companies/check-name?name=${encodeURIComponent(name.trim())}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            const data = await response.json()
            if (data.success) {
              setCompanyNameStatus({
                checking: false,
                available: data.data.available,
                message: data.data.message,
              })
            }
          } catch (error) {
            // Silently fail - validation will still happen server-side on submit
            setCompanyNameStatus({ checking: false, available: null, message: '' })
          }
        }, 500)
      }
    })(),
    []
  )

  // Trigger company name check when companyName changes
  useEffect(() => {
    checkCompanyNameAvailability(formData.companyName)
  }, [formData.companyName, checkCompanyNameAvailability])

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Collect all validation errors
    const newErrors = {}
    const fieldsToValidate = ['name', 'email', 'companyName', 'phone', 'password', 'confirmPassword', 'address.street', 'address.city', 'address.state', 'address.country', 'address.zipCode']
    fieldsToValidate.forEach((field) => {
      const value = field.startsWith('address.') ? formData.address[field.split('.')[1]] : formData[field]
      const error = validateField(field, value)
      if (error) newErrors[field] = error
    })

    // Check if company name is taken
    if (companyNameStatus.available === false) {
      newErrors.companyName = 'A company with this name already exists. Please choose a different name.'
    }

    // If no plan selected
    if (!plan) {
      setPlanError('Please select a plan to continue')
      setErrors(newErrors)
      return
    }
    setPlanError('')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      // Check if plan is free trial - no payment required
      if (plan.planType === 'free_trial') {
        // Register directly without payment
        const response = await fetch(`${API_URL}/payments/public/free-trial-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            companyName: formData.companyName,
            phone: formData.phone ? formData.countryCode + formData.phone : '',
            address: formData.address,
            subscriptionId: plan._id,
            billingCycle: 'monthly', // Free trial is always monthly (14 days)
          }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Registration failed')
        }

        // Store tokens
        localStorage.setItem('token', data.data.accessToken)
        localStorage.setItem('user', JSON.stringify(data.data.user))

        toast.success('Registration successful! Your 14-day free trial has started.')
        navigate('/app/dashboard')
        return
      }

      // For paid plans - proceed with payment
      // Create order
      const orderResponse = await fetch(`${API_URL}/payments/public/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: plan._id,
          billingCycle: billingCycle,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          phone: formData.phone ? formData.countryCode + formData.phone : '',
          address: formData.address,
        }),
      })

      const orderData = await orderResponse.json()

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order')
      }

      const { orderId, amount, keyId } = orderData.data

      // Load Razorpay
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        throw new Error('Failed to load payment gateway')
      }

      const price = billingCycle === 'monthly' ? plan.price?.monthly : plan.price?.yearly

      // Open Razorpay checkout
      const options = {
        key: keyId || RAZORPAY_KEY,
        amount: amount,
        currency: 'INR',
        name: 'SIM Manager',
        description: `${plan.name} - ${billingCycle} subscription`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment and complete registration
            const verifyResponse = await fetch(`${API_URL}/payments/public/verify-and-register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyData.success) {
              // Store tokens
              localStorage.setItem('token', verifyData.data.accessToken)
              localStorage.setItem('user', JSON.stringify(verifyData.data.user))

              toast.success('Registration successful! Welcome to SIM Manager.')
              navigate('/app/dashboard')
            } else {
              throw new Error(verifyData.message || 'Payment verification failed')
            }
          } catch (error) {
            toast.error(error.message || 'Payment verification failed')
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone ? formData.countryCode + formData.phone : '',
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setLoading(false)
      })

    } catch (error) {
      toast.error(error.message || 'Something went wrong')
      setLoading(false)
    }
  }

  if (loadingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const price = plan ? (billingCycle === 'monthly' ? plan.price?.monthly : plan.price?.yearly) : 0

  // Determine whether to show plan selector (no plan in URL)
  const showPlanSelector = !planIdFromUrl

  const handleSelectPlan = (selectedPlan) => {
    setPlan(selectedPlan)
    setPlanError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 p-4">
      <div className={`w-full ${showPlanSelector ? 'max-w-3xl' : 'max-w-lg'}`}>
        {/* Back to Website */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-secondary-600 hover:text-primary-600 font-medium mb-6 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Website
        </Link>

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
          <h1 className="text-2xl font-bold text-secondary-900">Create Account</h1>
          <p className="text-secondary-500 mt-2">
            {plan ? `Register with ${plan.name} plan` : 'Get started with SIM Manager'}
          </p>
        </div>

        {/* Plan Selector — only when no planId in URL */}
        {showPlanSelector && (
          <div className="mb-6">
            {/* Billing Cycle Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-secondary-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-secondary-900 shadow-sm'
                      : 'text-secondary-600 hover:text-secondary-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-secondary-900 shadow-sm'
                      : 'text-secondary-600 hover:text-secondary-900'
                  }`}
                >
                  Yearly
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    Best Value
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            {plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const pPrice = billingCycle === 'monthly' ? p.price?.monthly : p.price?.yearly
                  const displayPrice = pPrice?.toLocaleString() || pPrice || 0
                  const yearlySavings = p.price?.monthly && p.price?.yearly
                    ? Math.round(((p.price.monthly * 12 - p.price.yearly) / (p.price.monthly * 12)) * 100)
                    : 0
                  const enabledFeatures = p.features
                    ? Object.entries(p.features)
                        .filter(([, value]) => value === true)
                        .map(([key]) => featureLabels[key] || key)
                    : []
                  const isSelected = plan?._id === p._id

                  return (
                    <div
                      key={p._id}
                      onClick={() => handleSelectPlan(p)}
                      className={`relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {p.isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-primary-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-3">
                        <h3 className="text-base font-semibold text-secondary-900">{p.name}</h3>
                        {p.description && (
                          <p className="text-secondary-500 text-xs mt-1">{p.description}</p>
                        )}
                        <div className="flex items-baseline justify-center gap-1 mt-2">
                          {p.planType === 'free_trial' ? (
                            <>
                              <span className="text-2xl font-bold text-green-600">Free</span>
                              <span className="text-secondary-500 text-sm">/14 days</span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl font-bold text-secondary-900">₹{displayPrice}</span>
                              <span className="text-secondary-500 text-sm">
                                /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                              </span>
                            </>
                          )}
                        </div>
                        {billingCycle === 'yearly' && yearlySavings > 0 && p.planType !== 'free_trial' && (
                          <p className="text-green-600 text-xs mt-1 font-medium">
                            Save {yearlySavings}% yearly
                          </p>
                        )}
                      </div>

                      <ul className="space-y-1.5 text-xs text-secondary-600 mb-3">
                        {p.limits && (
                          <>
                            {p.limits.maxSims !== 0 && (
                              <li className="flex items-center gap-1.5">
                                <FiCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                <span>{p.limits.maxSims === -1 ? 'Unlimited' : p.limits.maxSims} SIMs</span>
                              </li>
                            )}
                            {p.limits.maxUsers !== 0 && (
                              <li className="flex items-center gap-1.5">
                                <FiCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                <span>{p.limits.maxUsers === -1 ? 'Unlimited' : p.limits.maxUsers} Users</span>
                              </li>
                            )}
                          </>
                        )}
                        {enabledFeatures.slice(0, 4).map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-center gap-1.5">
                            <FiCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {enabledFeatures.length > 4 && (
                          <li className="text-primary-600 font-medium">
                            +{enabledFeatures.length - 4} more features
                          </li>
                        )}
                        {p.customFeatures?.slice(0, 2).map((feature, fIndex) => (
                          <li key={`custom-${fIndex}`} className="flex items-center gap-1.5">
                            <FiCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Selection indicator */}
                      <div className={`w-full py-2 rounded-lg text-center text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-secondary-100 text-secondary-700'
                      }`}>
                        {isSelected ? 'Selected' : 'Select Plan'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-secondary-500 py-8">
                <FiLoader className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading plans...</p>
              </div>
            )}

            {/* Plan selection error */}
            {planError && (
              <p className="text-red-500 text-sm mt-3 text-center">{planError}</p>
            )}
          </div>
        )}

        {/* Plan Summary */}
        {plan && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-900">
                  {plan.name}
                  {plan.planType === 'free_trial' && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      Free Trial
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {plan.planType === 'free_trial' ? '14 days free' : `${billingCycle} subscription`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  {plan.planType === 'free_trial' ? (
                    <>
                      <p className="text-lg font-bold text-green-600">Free</p>
                      <p className="text-xs text-slate-400">No credit card required</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-primary-600">₹{price?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</p>
                    </>
                  )}
                </div>
                {showPlanSelector && (
                  <button
                    type="button"
                    onClick={() => setPlan(null)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium whitespace-nowrap"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} noValidate className="card-body">
            {/* Name */}
            <div className="form-group">
              <label className="label">Full Name<span style={{ color: '#dc2626' }}>*</span></label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={50}
                  className={`input pl-10 ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.name && !errors.name ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                  placeholder="Enter Your Full Name"
                />
                {!errors.name && formData.name && formData.name.trim().length >= 2 && (
                  <FiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {errors.name ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors.name}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">2 – 50 characters</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="label">Email ID<span style={{ color: '#dc2626' }}>*</span></label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={254}
                  className={`input pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.email && !errors.email ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                  placeholder="Enter Your Email"
                />
                {!errors.email && formData.email && /^\S+@\S+\.\S+$/.test(formData.email.trim()) && (
                  <FiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {errors.email ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors.email}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Max 254 characters</p>
              )}
            </div>

            {/* Company Name*/}
            <div className="form-group">
              <label className="label">Company Name<span style={{ color: '#dc2626' }}>*</span></label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={100}
                  className={`input pl-10 ${errors.companyName || companyNameStatus.available === false ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : companyNameStatus.available === true ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                  placeholder="Enter Company Name"
                />
                {companyNameStatus.checking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <FiLoader className="w-4 h-4 text-secondary-400 animate-spin" />
                  </div>
                )}
                {!companyNameStatus.checking && companyNameStatus.available === true && formData.companyName.trim().length >= 2 && !errors.companyName && (
                  <FiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {!companyNameStatus.checking && companyNameStatus.available === false && formData.companyName.trim().length >= 2 && (
                  <FiAlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              {errors.companyName && companyNameStatus.available !== false ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors.companyName}
                </p>
              ) : companyNameStatus.available === false && formData.companyName.trim().length >= 2 ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3 flex-shrink-0" />A company with this name already exists
                </p>
              ) : companyNameStatus.available === true && formData.companyName.trim().length >= 2 && !errors.companyName ? (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3 flex-shrink-0" />Company name is available
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">2 – 100 characters</p>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="label">Contact Number (Optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={handleChange}
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={formData.countryCode === '+91' ? 10 : 15 - (formData.countryCode.length - 1)}
                  className={`input ${errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.phone && !errors.phone ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                  style={{ flex: 1 }}
                  placeholder={formData.countryCode === '+91' ? '10 Digit Number' : 'Phone Number'}
                />
              </div>
              {errors.phone ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors.phone}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  {formData.countryCode === '+91' ? '10 digits (Indian number)' : '10–15 digits including country code'}
                </p>
              )}
            </div>

            {/* Address Section */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '0 0 12px 0' }}>
                Company Address (Optional)
              </h4>

              {/* Street + City */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Street</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={200}
                    className={`input ${errors['address.street'] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.address.street && !errors['address.street'] ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                    placeholder="Street Address"
                  />
                  {errors['address.street'] ? (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors['address.street']}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">3 – 200 characters</p>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={50}
                    className={`input ${errors['address.city'] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.address.city && !errors['address.city'] ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                    placeholder="City"
                  />
                  {errors['address.city'] ? (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors['address.city']}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">2 – 50 characters</p>
                  )}
                </div>
              </div>

              {/* State + Country */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">State/Province</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={50}
                    className={`input ${errors['address.state'] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.address.state && !errors['address.state'] ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                    placeholder="State"
                  />
                  {errors['address.state'] ? (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors['address.state']}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">2 – 50 characters</p>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={50}
                    className={`input ${errors['address.country'] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.address.country && !errors['address.country'] ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                    placeholder="Country"
                  />
                  {errors['address.country'] ? (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors['address.country']}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">2 – 50 characters</p>
                  )}
                </div>
              </div>

              {/* Zip Code */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Zip/Postal Code</label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={20}
                  className={`input ${errors['address.zipCode'] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : formData.address.zipCode && !errors['address.zipCode'] ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                  placeholder="Zip Code"
                  style={{ maxWidth: '50%' }}
                />
                {errors['address.zipCode'] ? (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors['address.zipCode']}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">3 – 20 characters</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label"> New Password<span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'flex', gap: '0' }}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={15}
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '0',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      borderRadius: errors.password ? '8px 0 0 8px' : '8px 0 0 8px',
                      border: errors.password ? '1px solid #dc2626' : formData.password && !errors.password ? '1px solid #22c55e' : '1px solid #d1d5db',
                      outline: 'none',
                      fontSize: '14px',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    className={errors.password ? 'focus:ring-red-500 focus:border-red-500' : formData.password && !errors.password ? 'focus:ring-green-500 focus:border-green-500' : ''}
                    placeholder="e.g. Admin@123"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '10px 14px',
                    border: errors.password ? '1px solid #dc2626' : formData.password && !errors.password ? '1px solid #22c55e' : '1px solid #d1d5db',
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
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {[
                      { label: '8-15 characters', met: formData.password.length >= 8 && formData.password.length <= 15 },
                      { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
                      { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
                      { label: 'One number', met: /[0-9]/.test(formData.password) },
                      { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) },
                    ].map((req) => (
                      <div key={req.label} className="flex items-center gap-1.5">
                        {req.met ? (
                          <FiCheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <FiX className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${req.met ? 'text-green-600' : 'text-slate-400'}`}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!formData.password && (
                <p className="text-xs text-slate-400 mt-1">8 – 15 characters with uppercase, lowercase, number & special character</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="label">Confirm Password<span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'flex', gap: '0' }}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={15}
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '0',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      borderRadius: errors.confirmPassword ? '8px 0 0 8px' : '8px 0 0 8px',
                      border: errors.confirmPassword ? '1px solid #dc2626' : formData.confirmPassword && !errors.confirmPassword ? '1px solid #22c55e' : '1px solid #d1d5db',
                      outline: 'none',
                      fontSize: '14px',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    className={errors.confirmPassword ? 'focus:ring-red-500 focus:border-red-500' : formData.confirmPassword && !errors.confirmPassword ? 'focus:ring-green-500 focus:border-green-500' : ''}
                    placeholder="Re-enter your password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    padding: '10px 14px',
                    border: errors.confirmPassword ? '1px solid #dc2626' : formData.confirmPassword && !errors.confirmPassword ? '1px solid #22c55e' : '1px solid #d1d5db',
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
                  {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{errors.confirmPassword}
                </p>
              ) : formData.confirmPassword && !errors.confirmPassword ? (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3 flex-shrink-0" />Passwords match
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Must match the password above</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {plan ? `Pay ₹${price?.toLocaleString()} & Register` : 'Create Account'}
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-secondary-600 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign In
              </Link>
            </p>
                {/* Back to Website */}


            <p className='text-center text-secondary-600 mt-6'>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-secondary-600 hover:text-primary-600 font-medium mb-6 transition-colors"
              >
                {/* <FiArrowLeft className="w-4 h-4" /> */}
                Back to Website
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}