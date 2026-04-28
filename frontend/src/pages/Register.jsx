import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone, FiBriefcase, FiArrowRight, FiLoader } from 'react-icons/fi'
import Logo from '../components/Logo'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

export default function Register() {
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan')
  const billingCycle = searchParams.get('cycle') || 'monthly'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(!!planId)
  const navigate = useNavigate()

  // Fetch plan details if planId is provided
  useEffect(() => {
    if (planId) {
      const fetchPlan = async () => {
        try {
          const response = await fetch(`${API_URL}/subscriptions/compare`)
          const data = await response.json()
          if (data.success && data.data) {
            const foundPlan = data.data.find(p => p._id === planId)
            if (foundPlan) {
              setPlan(foundPlan)
            } else {
              toast.error('Plan not found')
            }
          }
        } catch (error) {
          toast.error('Failed to load plan details')
        } finally {
          setLoadingPlan(false)
        }
      }
      fetchPlan()
    }
  }, [planId])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

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

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill all required fields')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // If no plan selected, just show message
    if (!plan) {
      toast.error('Please select a plan from the pricing page')
      return
    }

    if (!formData.companyName) {
      toast.error('Company name is required')
      return
    }

    setLoading(true)

    try {
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
          phone: formData.phone,
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
          contact: formData.phone,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo
              linkTo="/"
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

        {/* Plan Summary */}
        {plan && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-900">{plan.name}</p>
                <p className="text-sm text-slate-500">{billingCycle} subscription</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-600">₹{price?.toLocaleString()}</p>
                <p className="text-xs text-slate-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body">
            {/* Name */}
            <div className="form-group">
              <label className="label">Full Name *</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="label">Email Address *</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="form-group">
              <label className="label">Company Name *</label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Enter company name"
                  required={!!plan}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="label">Phone Number (Optional)</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Enter your phone"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10 pr-10"
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="label">Confirm Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Confirm your password"
                  required
                />
              </div>
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
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}