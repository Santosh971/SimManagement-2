import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiCheck, FiPackage, FiCreditCard, FiX, FiTrash2, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Button,
  Spinner,
} from '../components/ui'

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Subscription Modal Component
function SubscriptionModal({ isOpen, onClose, plan, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: { monthly: '', yearly: '' },
    limits: { maxSims: 10, maxUsers: 5, maxRecharges: 100 },
    features: {
      callLogSync: false,
      whatsappStatus: false,
      telegramStatus: false,
      wifiMonitor: false,
      callAutomation: false,
      smsLogs: false,
      emailNotifications: true,
      smsNotifications: false,
      advancedReports: false,
      excelExport: true,
      apiAccess: false,
      prioritySupport: false,
    },
    planType: 'paid',
    isPopular: false,
  })

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: {
          monthly: plan.price?.monthly || '',
          yearly: plan.price?.yearly || '',
        },
        limits: {
          maxSims: plan.limits?.maxSims || 10,
          maxUsers: plan.limits?.maxUsers || 5,
          maxRecharges: plan.limits?.maxRecharges || 100,
        },
        features: {
          callLogSync: plan.features?.callLogSync || false,
          whatsappStatus: plan.features?.whatsappStatus || false,
          telegramStatus: plan.features?.telegramStatus || false,
          wifiMonitor: plan.features?.wifiMonitor || false,
          callAutomation: plan.features?.callAutomation || false,
          smsLogs: plan.features?.smsLogs || false,
          emailNotifications: plan.features?.emailNotifications ?? true,
          smsNotifications: plan.features?.smsNotifications || false,
          advancedReports: plan.features?.advancedReports || false,
          excelExport: plan.features?.excelExport ?? true,
          apiAccess: plan.features?.apiAccess || false,
          prioritySupport: plan.features?.prioritySupport || false,
        },
        planType: plan.planType || 'paid',
        isPopular: plan.isPopular || false,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        price: { monthly: '', yearly: '' },
        limits: { maxSims: 10, maxUsers: 5, maxRecharges: 100 },
        features: {
          callLogSync: false,
          whatsappStatus: false,
          telegramStatus: false,
          wifiMonitor: false,
          callAutomation: false,
          smsLogs: false,
          emailNotifications: true,
          smsNotifications: false,
          advancedReports: false,
          excelExport: true,
          apiAccess: false,
          prioritySupport: false,
        },
        planType: 'paid',
        isPopular: false,
      })
    }
  }, [plan])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name.startsWith('price.')) {
      const key = name.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        price: { ...prev.price, [key]: value },
      }))
    } else if (name.startsWith('limits.')) {
      const key = name.split('.')[1]
      const numValue = parseInt(value) || 0
      // Only allow -1 (unlimited), 0, or positive numbers
      if (numValue < -1) {
        toast.error(`${key} cannot be negative. Use -1 for unlimited, or 0/positive number.`)
        return
      }
      setFormData((prev) => ({
        ...prev,
        limits: { ...prev.limits, [key]: numValue },
      }))
    } else if (name.startsWith('features.')) {
      const key = name.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        features: { ...prev.features, [key]: checked },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.price.monthly || !formData.price.yearly) {
      toast.error('Name and pricing are required')
      return
    }

    // Validate limits - must be -1, 0, or positive
    const limits = formData.limits
    if (limits.maxSims < -1 || limits.maxUsers < -1 || limits.maxRecharges < -1) {
      toast.error('Limits must be -1 (unlimited), 0, or a positive number')
      return
    }

    setLoading(true)

    try {
      if (plan) {
        await onSave(plan._id, formData)
        toast.success('Plan updated successfully')
      } else {
        await onSave(null, formData)
        toast.success('Plan created successfully')
      }
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      overflow: 'auto'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          backgroundColor: '#ffffff'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {plan ? 'Edit Plan' : 'Add New Plan'}
          </h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Plan Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Starter, Professional"
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the plan"
              rows="2"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Monthly Price (₹) *
              </label>
              <input
                type="number"
                name="price.monthly"
                value={formData.price.monthly}
                onChange={handleChange}
                placeholder="e.g., 999"
                min="0"
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
                Yearly Price (₹) *
              </label>
              <input
                type="number"
                name="price.yearly"
                value={formData.price.yearly}
                onChange={handleChange}
                placeholder="e.g., 9990"
                min="0"
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Max SIMs
              </label>
              <input
                type="number"
                name="limits.maxSims"
                value={formData.limits.maxSims}
                onChange={handleChange}
                min="-1"
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
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 0' }}>-1 = Unlimited</p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Max Users
              </label>
              <input
                type="number"
                name="limits.maxUsers"
                value={formData.limits.maxUsers}
                onChange={handleChange}
                min="-1"
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
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 0' }}>-1 = Unlimited</p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Max Recharges
              </label>
              <input
                type="number"
                name="limits.maxRecharges"
                value={formData.limits.maxRecharges}
                onChange={handleChange}
                min="-1"
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
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 0' }}>-1 = Unlimited</p>
            </div>
          </div>

          {/* Plan Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>Plan Type</label>
            <select
              name="planType"
              value={formData.planType}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            >
              <option value="paid">Paid Plan</option>
              <option value="free_trial">Free Trial (14 days)</option>
            </select>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
              {formData.planType === 'free_trial'
                ? 'Free trial plan with 14 days duration. Price will be set to ₹0 automatically.'
                : 'Monthly = 28 days, Yearly = 336 days (12 × 28 days)'}
            </p>
          </div>

          {/* Mark as Popular */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="isPopular"
                checked={formData.isPopular}
                onChange={handleChange}
                style={{ width: '18px', height: '18px' }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Mark as Popular</span>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  This will highlight the plan with a "Most Popular" badge
                </p>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>Features</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[
                { key: 'callLogSync', label: 'Call Log Sync' },
                { key: 'whatsappStatus', label: 'WhatsApp Status' },
                { key: 'telegramStatus', label: 'Telegram Status' },
                { key: 'wifiMonitor', label: 'WiFi Monitor' },
                { key: 'callAutomation', label: 'Call Automation' },
                { key: 'smsLogs', label: 'SMS Logs' },
                { key: 'emailNotifications', label: 'Email Notifications' },
                { key: 'excelExport', label: 'Excel Export' },


              ].map((feature) => (
                <label key={feature.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name={`features.${feature.key}`}
                    checked={formData.features[feature.key]}
                    onChange={handleChange}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px' }}>{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={loading}>{loading ? 'Saving...' : (plan ? 'Update' : 'Create Plan')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Payment Checkout Modal
function CheckoutModal({ isOpen, onClose, plan, billingCycle, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const { api, user } = useAuth()

  const handlePayment = async () => {
    setLoading(true)

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway')
        setLoading(false)
        return
      }

      const orderResponse = await api.post('/payments/create-order', {
        subscriptionId: plan._id,
        billingCycle: billingCycle,
      })

      const orderData = orderResponse.data.data

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'SIM Management',
        description: `${plan.name} - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Plan`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async (response) => {
          try {
            const verifyResponse = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })

            toast.success('Payment successful! Your subscription is now active.')
            onSuccess && onSuccess(verifyResponse.data.data)
            onClose()
          } catch (error) {
            toast.error('Payment verification failed')
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`)
        setLoading(false)
      })
      rzp.open()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !plan) return null

  const amount = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '450px',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Complete Payment</h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Plan Summary */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{plan.name}</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>{plan.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Billing Cycle</span>
              <span style={{ fontWeight: '500' }}>{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
            </div>
          </div>

          {/* Price Breakdown */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Plan Amount</span>
              <span style={{ fontWeight: '500' }}>₹{amount.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>GST (18%)</span>
              <span style={{ fontWeight: '500' }}>₹{Math.round(amount * 0.18).toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb',
              fontWeight: '600',
              fontSize: '18px'
            }}>
              <span>Total</span>
              <span>₹{Math.round(amount * 1.18).toLocaleString()}</span>
            </div>
          </div>

          {/* Features */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontWeight: '500', marginBottom: '8px' }}>What's included:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FiCheck style={{ color: '#16a34a', width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px' }}>Max {plan.limits?.maxSims === -1 ? 'Unlimited' : plan.limits?.maxSims} SIMs</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FiCheck style={{ color: '#16a34a', width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px' }}>Max {plan.limits?.maxUsers === -1 ? 'Unlimited' : plan.limits?.maxUsers} Users</span>
              </li>
              {plan.features?.callLogSync && (
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FiCheck style={{ color: '#16a34a', width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '14px' }}>Call Log Sync</span>
                </li>
              )}
              {plan.features?.advancedReports && (
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FiCheck style={{ color: '#16a34a', width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '14px' }}>Advanced Reports</span>
                </li>
              )}
              {plan.features?.apiAccess && (
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FiCheck style={{ color: '#16a34a', width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '14px' }}>API Access</span>
                </li>
              )}
            </ul>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            loading={loading}
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            icon={FiCreditCard}
          >
            {loading ? 'Processing...' : `Pay ₹${Math.round(amount * 1.18).toLocaleString()}`}
          </Button>

          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center',
            marginTop: '12px'
          }}>
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  )
}

// Main Subscription Plans Page
export default function Subscriptions() {
  const { api, user } = useAuth()
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedBilling, setSelectedBilling] = useState('monthly')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [planUsage, setPlanUsage] = useState({}) // Store usage count per plan

  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      // Build query params
      const params = {}
      if (isSuperAdmin && statusFilter !== 'all') {
        params.activeOnly = statusFilter // 'active' or 'inactive'
      } else if (!isSuperAdmin) {
        params.activeOnly = true // Non-super admins only see active plans
      }
      // If statusFilter is 'all', don't pass activeOnly (show all)

      const response = await api.get('/subscriptions', { params })
      setSubscriptions(response.data.data || [])

      // Fetch usage data for super admins
      if (isSuperAdmin) {
        fetchPlanUsage()
      }
    } catch (error) {
      toast.error('Failed to fetch subscriptions')
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanUsage = async () => {
    try {
      const response = await api.get('/subscriptions/usage/all')
      const usageData = {}
        ; (response.data.data || []).forEach(plan => {
          usageData[plan._id] = plan.companiesCount || 0
        })
      setPlanUsage(usageData)
    } catch (error) {
      console.error('Failed to fetch plan usage:', error)
    }
  }

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/subscriptions/${id}/toggle`)
      toast.success('Subscription status updated')
      fetchSubscriptions()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const deletePlan = async (id, planName) => {
    // Check usage first
    const usageCount = planUsage[id] || 0
    if (usageCount > 0) {
      toast.error(`This plan is used by ${usageCount} business${usageCount > 1 ? 'es' : ''}. You cannot delete it.`)
      return
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/subscriptions/${id}`)
      toast.success('Plan deleted successfully')
      fetchSubscriptions()
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete plan'
      toast.error(errorMessage)
    }
  }

  const handleSavePlan = async (planId, data) => {
    if (planId) {
      await api.put(`/subscriptions/${planId}`, data)
    } else {
      await api.post('/subscriptions', data)
    }
    fetchSubscriptions()
  }

  const openModal = (plan = null) => {
    setEditingPlan(plan)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPlan(null)
  }

  const openCheckout = (plan, billing) => {
    setSelectedPlan(plan)
    setSelectedBilling(billing)
    setShowCheckout(true)
  }

  const closeCheckout = () => {
    setShowCheckout(false)
    setSelectedPlan(null)
  }

  const handlePaymentSuccess = () => {
    fetchSubscriptions()
  }

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Subscription Plans"
        description={isSuperAdmin ? 'Manage subscription plans and pricing' : 'Choose the right plan for your business'}
        action={
          isSuperAdmin && (
            <Button icon={FiPackage} onClick={() => openModal()}>
              Add Plan
            </Button>
          )
        }
      />

      {/* Filter Tabs - Super Admin Only */}
      {isSuperAdmin && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          backgroundColor: '#f3f4f6',
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: statusFilter === 'all' ? '#ffffff' : 'transparent',
              color: statusFilter === 'all' ? '#111827' : '#6b7280',
              fontWeight: statusFilter === 'all' ? '500' : '400',
              cursor: 'pointer',
              boxShadow: statusFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            All Plans
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: statusFilter === 'active' ? '#ffffff' : 'transparent',
              color: statusFilter === 'active' ? '#111827' : '#6b7280',
              fontWeight: statusFilter === 'active' ? '500' : '400',
              cursor: 'pointer',
              boxShadow: statusFilter === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: statusFilter === 'inactive' ? '#ffffff' : 'transparent',
              color: statusFilter === 'inactive' ? '#111827' : '#6b7280',
              fontWeight: statusFilter === 'inactive' ? '500' : '400',
              cursor: 'pointer',
              boxShadow: statusFilter === 'inactive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Inactive
          </button>
        </div>
      )}

      {/* Plans Grid */}
      {subscriptions.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 340px))',
          gap: '24px',
          alignItems: 'stretch',
          justifyContent: 'start',   /* prevents lone card from stretching */
        }}>
          {subscriptions.map((plan) => (
            <Card
              key={plan._id}
              style={{
                width: '100%',          /* fills its fixed column, never more */
                boxShadow: plan.isPopular
                  ? '0 0 0 2px #2563eb'
                  : plan.isActive
                    ? '0 1px 3px rgba(0,0,0,0.1)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                opacity: plan.isActive ? 1 : 0.7,
                border: plan.isActive ? 'none' : '2px solid #fecaca',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Popular Badge — fixed height so all cards align even without it */}
              <div style={{ height: '28px', flexShrink: 0 }}>
                {plan.planType === 'free_trial' ? (
                  <div style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    textAlign: 'center',
                    padding: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    Free Trial — 14 Days
                  </div>
                ) : plan.isPopular ? (
                  <div style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    textAlign: 'center',
                    padding: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    Most Popular
                  </div>
                ) : null}
              </div>

              {/* Card Body — flex column so button always sticks to bottom */}
              <CardBody style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px' }}>

                {/* ── Header: Name + Status badge ─────────────────────────── */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {plan.name}
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '13px',
                      marginTop: '4px',
                      marginBottom: 0,
                      minHeight: '36px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {plan.description}
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Usage count badge */}
                      {planUsage[plan._id] > 0 && (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          fontSize: '11px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                        }}>
                          {planUsage[plan._id]} {planUsage[plan._id] === 1 ? 'business' : 'businesses'}
                        </span>
                      )}
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: plan.isActive ? '#dcfce7' : '#fef2f2',
                        color: plan.isActive ? '#16a34a' : '#dc2626',
                        fontSize: '12px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                      }}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Pricing ──────────────────────────────────────────────── */}
                <div style={{ marginBottom: '20px' }}>
                  {plan.planType === 'free_trial' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>
                          Free
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>14 days</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                        No credit card required
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                          ₹{plan.price?.monthly}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>/month</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                        ₹{plan.price?.yearly}/year&nbsp;
                        <span style={{ color: '#16a34a', fontWeight: '500' }}>
                          (Save {Math.round((plan.price?.monthly * 12 - plan.price?.yearly) / (plan.price?.monthly * 12) * 100)}%)
                        </span>
                      </p>
                    </>
                  )}
                </div>

                {/* ── Limits & Features — flex:1 so this section stretches ── */}
                <div style={{ flex: 1, marginBottom: '20px' }}>

                  <div style={{ height: '1px', backgroundColor: '#f3f4f6', marginBottom: '12px' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280' }}>Max SIMs</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>
                      {plan.limits?.maxSims === -1 ? 'Unlimited' : plan.limits?.maxSims}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280' }}>Max Users</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>
                      {plan.limits?.maxUsers === -1 ? 'Unlimited' : plan.limits?.maxUsers}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Duration</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>
                      {plan.planType === 'free_trial' ? '14 days (Free Trial)' : 'Monthly: 28 days / Yearly: 336 days'}
                    </span>
                  </div>

                  <div style={{ height: '1px', backgroundColor: '#f3f4f6', marginBottom: '12px' }} />

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '14px', marginBottom: '6px',
                    color: plan.features?.callLogSync ? '#16a34a' : '#d1d5db',
                  }}>
                    <FiCheck style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                    <span>Call Log Sync</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '14px', marginBottom: '6px',
                    color: plan.features?.advancedReports ? '#16a34a' : '#d1d5db',
                  }}>
                    <FiCheck style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                    <span>Advanced Reports</span>
                  </div>
                </div>

                {/* ── Action Buttons — always at bottom ────────────────────── */}
                {isSuperAdmin ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <Button
                      variant="secondary"
                      style={{
                        flex: 1,
                        backgroundColor: plan.isActive ? '#fef2f2' : '#dcfce7',
                        color: plan.isActive ? '#dc2626' : '#16a34a',
                        borderColor: plan.isActive ? '#fecaca' : '#bbf7d0',
                      }}
                      onClick={() => toggleStatus(plan._id)}
                    >
                      {plan.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => openModal(plan)}
                      style={{ flexShrink: 0, padding: '10px 12px' }}
                      title="Edit Plan"
                    >
                      <FiPackage style={{ width: '16px', height: '16px' }} />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => deletePlan(plan._id, plan.name)}
                      style={{
                        flexShrink: 0, padding: '10px 12px',
                        backgroundColor: planUsage[plan._id] > 0 ? '#f3f4f6' : '#fef2f2',
                        color: planUsage[plan._id] > 0 ? '#9ca3af' : '#dc2626',
                        borderColor: planUsage[plan._id] > 0 ? '#e5e7eb' : '#fecaca',
                        cursor: planUsage[plan._id] > 0 ? 'not-allowed' : 'pointer',
                      }}
                      title={planUsage[plan._id] > 0 ? `Used by ${planUsage[plan._id]} business${planUsage[plan._id] > 1 ? 'es' : ''} - cannot delete` : 'Delete Plan'}
                    >
                      <FiTrash2 style={{ width: '16px', height: '16px' }} />
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                    {plan.planType === 'free_trial' ? (
                      <Button
                        disabled={!plan.isActive}
                        onClick={() => openCheckout(plan, 'monthly')}
                      >
                        Start Free Trial
                      </Button>
                    ) : (
                      <>
                        <Button
                          disabled={!plan.isActive}
                          onClick={() => openCheckout(plan, 'monthly')}
                        >
                          Subscribe Monthly
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={!plan.isActive}
                          onClick={() => openCheckout(plan, 'yearly')}
                        >
                          Subscribe Yearly&nbsp;
                          (Save {Math.round((plan.price?.monthly * 12 - plan.price?.yearly) / (plan.price?.monthly * 12) * 100)}%)
                        </Button>
                      </>
                    )}
                  </div>
                )}

              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiPackage style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                No Subscription Plans
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Create your first subscription plan</p>
              {isSuperAdmin && (
                <Button onClick={() => openModal()}>Add Plan</Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Admin Modal */}
      {isSuperAdmin && (
        <SubscriptionModal
          isOpen={showModal}
          onClose={closeModal}
          plan={editingPlan}
          onSave={handleSavePlan}
        />
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={closeCheckout}
        plan={selectedPlan}
        billingCycle={selectedBilling}
        onSuccess={handlePaymentSuccess}
      />
    </PageContainer>
  )
}