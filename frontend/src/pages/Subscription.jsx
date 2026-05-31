

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPackage,
  FiSmartphone,
  FiUsers,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiCalendar,
  FiCreditCard,
  FiX as FiClose,
  FiDollarSign,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Badge,
  Spinner,
  Grid,
} from '../components/ui'
import { formatDate } from '../utils/dateFormat'

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ─── Responsive styles injected once ───────────────────────────────────────
const responsiveStyles = `
  .sub-plan-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }
  .sub-plan-header-right {
    text-align: right;
  }
  .sub-usage-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
  .sub-features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }
  .sub-pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 24px;
  }
  .sub-plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }
  .sub-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .sub-modal-footer-actions {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }
  .sub-banner-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  /* Payment history table */
  .payment-table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .payment-table {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
  }
  /* Mobile overrides */
  @media (max-width: 600px) {
    .sub-usage-grid {
      grid-template-columns: 1fr;
    }
    .sub-plan-header {
      flex-direction: column;
    }
    .sub-plan-header-right {
      text-align: left;
    }
    .sub-modal-footer {
      flex-direction: column;
      align-items: stretch;
    }
    .sub-modal-footer-actions {
      flex-direction: column;
    }
    .sub-modal-footer-actions button {
      width: 100%;
      justify-content: center;
    }
    .sub-banner-inner button {
      width: 100%;
      justify-content: center;
    }
  }
  @media (max-width: 480px) {
    .sub-plans-grid {
      grid-template-columns: 1fr;
    }
    .sub-features-grid {
      grid-template-columns: 1fr;
    }
    .sub-pricing-grid {
      grid-template-columns: 1fr;
    }
  }
`

export default function Subscription() {
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [showRenewModal, setShowRenewModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    // Inject responsive styles once
    if (!document.getElementById('sub-responsive-styles')) {
      const tag = document.createElement('style')
      tag.id = 'sub-responsive-styles'
      tag.textContent = responsiveStyles
      document.head.appendChild(tag)
    }
    fetchSubscription()
    fetchPaymentHistory()
  }, [])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response = await api.get('/companies/my-subscription')
      setData(response.data.data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      toast.error('Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await api.get('/payments/history')
      setPaymentHistory(response.data.data || [])
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true)
      const response = await api.get('/subscriptions/compare')
      setPlans(response.data.data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Failed to load plans')
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleRenewClick = () => {
    setSelectedPlan(null)
    setBillingCycle('monthly')
    fetchPlans()
    setShowRenewModal(true)
  }

  const handlePayment = async () => {
    if (!selectedPlan) { toast.error('Please select a plan'); return }
    setPaymentLoading(true)
    try {
      const orderResponse = await api.post('/payments/create-order', {
        subscriptionId: selectedPlan._id,
        billingCycle,
      })
      if (!orderResponse.data.success) throw new Error(orderResponse.data.message || 'Failed to create order')
      const { orderId, amount, keyId } = orderResponse.data.data
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load payment gateway')
      const options = {
        key: keyId || RAZORPAY_KEY,
        amount,
        currency: 'INR',
        name: 'SIM Manager',
        description: `${selectedPlan.name} - ${billingCycle} subscription renewal`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            if (verifyResponse.data.success) {
              toast.success('Subscription renewed successfully!')
              setPaymentLoading(false)
              setShowRenewModal(false)
              fetchSubscription()
              fetchPaymentHistory() // Refresh payment history immediately
            } else {
              throw new Error(verifyResponse.data.message || 'Payment verification failed')
            }
          } catch (error) {
            toast.error(error.message || 'Payment verification failed')
            setPaymentLoading(false)
          }
        },
        prefill: { name: data?.company?.name || '', email: data?.company?.email || '' },
        theme: { color: '#2563eb' },
        modal: { ondismiss: () => setPaymentLoading(false) },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setPaymentLoading(false)
      })
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
      setPaymentLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = { active: 'success', expired: 'danger', inactive: 'default', expiring: 'warning' }
    return (
      <Badge variant={variants[status] || 'default'} size="md">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getUsagePercentage = (current, max) => {
    if (max === -1) return 0
    if (max === 0) return 100
    return Math.min(100, Math.round((current / max) * 100))
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 100) return '#dc2626'
    if (percentage >= 80) return '#d97706'
    return '#16a34a'
  }

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  if (!data?.plan) {
    return (
      <PageContainer>
        <PageHeader title="Subscription" description="Your current plan and usage details" />
        <Card>
          <CardBody>
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <FiPackage style={{ width: '64px', height: '64px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                No Subscription Plan Assigned
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Please contact your Super Admin to assign a subscription plan to your company.
              </p>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    )
  }

  const { plan, status, subscriptionEndDate, daysUntilExpiry, usage } = data
  const simUsagePercent = getUsagePercentage(usage.currentSims, usage.maxSims)
  const userUsagePercent = getUsagePercentage(usage.currentUsers, usage.maxUsers)
  const isExpired = status === 'expired'
  const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0

  // Shared button style builder
  const renewBtn = (bg) => ({
    padding: '10px 20px',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  })

  return (
    <PageContainer>
      <PageHeader title="Subscription" description="Your current plan and usage details" />

      {/* Expired Banner */}
      {isExpired && (
        <Card style={{ marginBottom: '24px', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <CardBody>
            <div className="sub-banner-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiAlertCircle style={{ width: '24px', height: '24px', color: '#dc2626', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, color: '#dc2626', fontWeight: '600' }}>Your subscription has expired</h4>
                  <p style={{ margin: '4px 0 0 0', color: '#7f1d1d', fontSize: '14px' }}>
                    Renew now to continue using all features.
                  </p>
                </div>
              </div>
              <button onClick={handleRenewClick} style={renewBtn('#dc2626')}>
                <FiCreditCard style={{ width: '16px', height: '16px' }} />
                Renew Now
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Expiring Soon Warning */}
      {isExpiring && !isExpired && (
        <Card style={{ marginBottom: '24px', backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <CardBody>
            <div className="sub-banner-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiAlertCircle style={{ width: '24px', height: '24px', color: '#d97706', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, color: '#d97706', fontWeight: '600' }}>Subscription expiring soon</h4>
                  <p style={{ margin: '4px 0 0 0', color: '#92400e', fontSize: '14px' }}>
                    Your subscription expires in {daysUntilExpiry} days.
                  </p>
                </div>
              </div>
              <button onClick={handleRenewClick} style={renewBtn('#d97706')}>
                <FiCreditCard style={{ width: '16px', height: '16px' }} />
                Renew Now
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Current Plan Card */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div className="sub-plan-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {plan.name}
                </h2>
                {getStatusBadge(status)}
              </div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                {plan.description || 'No description available'}
              </p>
            </div>
            <div className="sub-plan-header-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiCalendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Valid until</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {formatDate(subscriptionEndDate)}
              </p>
            </div>
          </div>

          {status === 'active' && !isExpiring && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={handleRenewClick} style={renewBtn('#2563eb')}>
                <FiCreditCard style={{ width: '16px', height: '16px' }} />
                Renew or Upgrade Plan
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Usage Stats */}
      <div className="sub-usage-grid">
        {/* SIM Usage */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                flexShrink: 0,
                backgroundColor: simUsagePercent >= 100 ? '#fef2f2' : simUsagePercent >= 80 ? '#fffbeb' : '#eff6ff',
              }}>
                <FiSmartphone style={{
                  width: '20px', height: '20px',
                  color: simUsagePercent >= 100 ? '#dc2626' : simUsagePercent >= 80 ? '#d97706' : '#2563eb',
                }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>SIM Usage</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0, wordBreak: 'break-word' }}>
                  {usage.maxSims === -1 ? `${usage.currentSims} (Unlimited)` : `${usage.currentSims} / ${usage.maxSims}`}
                </p>
              </div>
            </div>
            {usage.maxSims !== -1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Usage</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: getUsageColor(simUsagePercent) }}>{simUsagePercent}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${simUsagePercent}%`,
                    backgroundColor: getUsageColor(simUsagePercent),
                    borderRadius: '4px', transition: 'width 0.3s ease',
                  }} />
                </div>
                {simUsagePercent >= 100 && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: '8px 0 0 0' }}>
                    SIM limit reached. Upgrade your plan.
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* User Usage */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                flexShrink: 0,
                backgroundColor: userUsagePercent >= 100 ? '#fef2f2' : userUsagePercent >= 80 ? '#fffbeb' : '#dcfce7',
              }}>
                <FiUsers style={{
                  width: '20px', height: '20px',
                  color: userUsagePercent >= 100 ? '#dc2626' : userUsagePercent >= 80 ? '#d97706' : '#16a34a',
                }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>User Usage</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0, wordBreak: 'break-word' }}>
                  {usage.maxUsers === -1 ? `${usage.currentUsers} (Unlimited)` : `${usage.currentUsers} / ${usage.maxUsers}`}
                </p>
              </div>
            </div>
            {usage.maxUsers !== -1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Usage</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: getUsageColor(userUsagePercent) }}>{userUsagePercent}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${userUsagePercent}%`,
                    backgroundColor: getUsageColor(userUsagePercent),
                    borderRadius: '4px', transition: 'width 0.3s ease',
                  }} />
                </div>
                {userUsagePercent >= 100 && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: '8px 0 0 0' }}>
                    User limit reached. Upgrade your plan.
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Plan Features */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
            Plan Features
          </h3>
          <div className="sub-features-grid">
            <FeatureItem label="Max SIMs" value={usage.maxSims === -1 ? 'Unlimited' : usage.maxSims} />
            <FeatureItem label="Max Users" value={usage.maxUsers === -1 ? 'Unlimited' : usage.maxUsers} />
            <FeatureItem label="Call Log Sync" value={plan.features?.callLogSync} />
            <FeatureItem label="Advanced Reports" value={plan.features?.advancedReports} />
            <FeatureItem label="Email Notifications" value={plan.features?.emailNotifications} />
            <FeatureItem label="SMS Notifications" value={plan.features?.smsNotifications} />
            <FeatureItem label="Excel Export" value={plan.features?.excelExport} />
            <FeatureItem label="API Access" value={plan.features?.apiAccess} />
            <FeatureItem label="Priority Support" value={plan.features?.prioritySupport} />
          </div>
        </CardBody>
      </Card>

      {/* Pricing */}
      <Card>
        <CardBody>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>Pricing</h3>
          <div className="sub-pricing-grid">
            <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Monthly</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {plan.price?.monthly ? `₹${plan.price.monthly.toLocaleString()}` : 'N/A'}
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>/month</span>
              </p>
            </div>
            <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Yearly</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {plan.price?.yearly ? `₹${plan.price.yearly.toLocaleString()}` : 'N/A'}
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>/year</span>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payment History */}
      <Card style={{ marginTop: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#eff6ff', flexShrink: 0 }}>
              <FiDollarSign style={{ width: '20px', height: '20px', color: '#2563eb' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Payment History</h3>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><Spinner size="md" /></div>
          ) : paymentHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <FiDollarSign style={{ width: '40px', height: '40px', marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No payment history yet</p>
            </div>
          ) : (
            <div className="payment-table-wrap">
              <table className="payment-table">
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    {['S.No.', 'Date', 'Plan', 'Billing', 'Amount', 'Valid Until', 'Status'].map((h) => (
                      <th key={h} style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                          textAlign: h === 'S.No.' ? 'center' : 'left',
                          width: h === 'S.No.' ? '50px' : undefined,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, index) => {
                    const validUntil = payment.paidAt
                      ? formatDate(new Date(new Date(payment.paidAt).getTime() + payment.planDuration * 86400000))
                      : '-'
                    const paidDate = (payment.paidAt || payment.createdAt)
                      ? formatDate(payment.paidAt || payment.createdAt)
                      : '-'

                    return (
                      <tr key={payment._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>{index + 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>{paidDate}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>{payment.planName}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {payment.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
                          ₹{payment.amount?.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{validUntil}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge
                            variant={payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {payment.status === 'completed' ? 'Completed' : payment.status === 'failed' ? 'Failed' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Renewal Modal */}
      {showRenewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px',
          overflowY: 'auto',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            margin: 'auto',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 1,
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Renew or Upgrade Plan
              </h2>
              <button
                onClick={() => setShowRenewModal(false)}
                style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <FiClose style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Billing Cycle Toggle */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ display: 'inline-flex', backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '4px' }}>
                  {['monthly', 'yearly'].map((cycle) => (
                    <button
                      key={cycle}
                      onClick={() => setBillingCycle(cycle)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: billingCycle === cycle ? 'white' : 'transparent',
                        color: billingCycle === cycle ? '#111827' : '#6b7280',
                        fontWeight: billingCycle === cycle ? '600' : '400',
                        cursor: 'pointer',
                        boxShadow: billingCycle === cycle ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                      }}
                    >
                      {cycle === 'monthly' ? 'Monthly' : (
                        <>
                          Yearly
                          {(() => {
                            const monthlyPlan = plans.find(p => p.price?.monthly && p.price?.yearly)
                            if (monthlyPlan) {
                              const pct = Math.round((monthlyPlan.price.monthly * 12 - monthlyPlan.price.yearly) / (monthlyPlan.price.monthly * 12) * 100)
                              return pct > 0 ? (
                                <span style={{
                                  backgroundColor: '#dcfce7', color: '#16a34a',
                                  padding: '2px 6px', borderRadius: '12px', fontSize: '11px',
                                }}>
                                  Save {pct}%
                                </span>
                              ) : null
                            }
                            return null
                          })()}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Plans Grid */}
            <div style={{ padding: '20px' }}>
              {loadingPlans ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spinner size="lg" /></div>
              ) : (
                <div className="sub-plans-grid">
                  {plans.map((planOption) => {
                    const price = billingCycle === 'monthly' ? planOption.price?.monthly : planOption.price?.yearly
                    const isSelected = selectedPlan?._id === planOption._id
                    const isCurrentPlan = plan._id === planOption._id && data?.billingCycle === billingCycle

                    return (
                      <div
                        key={planOption._id}
                        onClick={() => setSelectedPlan(planOption)}
                        style={{
                          padding: '20px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #2563eb' : '2px solid #e5e7eb',
                          backgroundColor: isSelected ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          marginTop: '12px',
                        }}
                      >
                        {planOption.isPopular && (
                          <span style={{
                            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                            backgroundColor: '#2563eb', color: 'white',
                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}>
                            Popular
                          </span>
                        )}
                        {isCurrentPlan && (
                          <span style={{
                            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                            backgroundColor: '#16a34a', color: 'white',
                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}>
                            Current
                          </span>
                        )}
                        <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#111827', marginBottom: '6px', marginTop: '4px' }}>
                          {planOption.name}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                          {planOption.description}
                        </p>
                        <div style={{ marginBottom: '12px' }}>
                          <span style={{ fontSize: '26px', fontWeight: '700', color: '#111827' }}>
                            ₹{price?.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#374151' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <FiCheck style={{ width: '14px', height: '14px', color: '#16a34a', flexShrink: 0 }} />
                            <span>{planOption.limits?.maxSims === -1 ? 'Unlimited' : planOption.limits?.maxSims} SIM{planOption.limits?.maxSims !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiCheck style={{ width: '14px', height: '14px', color: '#16a34a', flexShrink: 0 }} />
                            <span>{planOption.limits?.maxUsers === -1 ? 'Unlimited' : planOption.limits?.maxUsers} User{planOption.limits?.maxUsers !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'white',
            }}>
              <div className="sub-modal-footer">
                <div style={{ minWidth: 0 }}>
                  {selectedPlan && (
                    <div style={{ wordBreak: 'break-word' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Selected: </span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                        {selectedPlan.name} — ₹{(billingCycle === 'monthly' ? selectedPlan.price?.monthly : selectedPlan.price?.yearly)?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="sub-modal-footer-actions">
                  <button
                    onClick={() => setShowRenewModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={!selectedPlan || paymentLoading}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: selectedPlan ? '#2563eb' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: selectedPlan ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: selectedPlan ? 1 : 0.6,
                    }}
                  >
                    <FiCreditCard style={{ width: '16px', height: '16px' }} />
                    {paymentLoading ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function FeatureItem({ label, value }) {
  const isBoolean = typeof value === 'boolean'
  const displayValue = isBoolean ? (value ? 'Included' : 'Not included') : value

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {isBoolean ? (
        value
          ? <FiCheck style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
          : <FiX style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
      ) : null}
      <span style={{ fontSize: '14px', color: '#374151' }}>
        <span style={{ fontWeight: '500' }}>{label}:</span>{' '}
        <span style={{ color: isBoolean ? (value ? '#16a34a' : '#6b7280') : '#111827' }}>
          {displayValue}
        </span>
      </span>
    </div>
  )
}