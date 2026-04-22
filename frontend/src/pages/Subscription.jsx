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
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  StatCard,
  Badge,
  Spinner,
  Grid,
} from '../components/ui'

export default function Subscription() {
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchSubscription()
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      expired: 'danger',
      inactive: 'default',
      expiring: 'warning',
    }
    return (
      <Badge variant={variants[status] || 'default'} size="md">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getUsagePercentage = (current, max) => {
    if (max === -1) return 0 // Unlimited
    if (max === 0) return 100
    return Math.min(100, Math.round((current / max) * 100))
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 100) return '#dc2626' // Red - at limit
    if (percentage >= 80) return '#d97706' // Orange - near limit
    return '#16a34a' // Green - under limit
  }

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  // No subscription assigned
  if (!data?.plan) {
    return (
      <PageContainer>
        <PageHeader
          title="My Subscription"
          description="Your current plan and usage details"
        />
        <Card>
          <CardBody>
            <div style={{ padding: '48px', textAlign: 'center' }}>
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

  return (
    <PageContainer>
      <PageHeader
        title="My Subscription"
        description="Your current plan and usage details"
      />

      {/* Expired Banner */}
      {isExpired && (
        <Card style={{ marginBottom: '24px', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiAlertCircle style={{ width: '24px', height: '24px', color: '#dc2626' }} />
              <div>
                <h4 style={{ margin: 0, color: '#dc2626', fontWeight: '600' }}>
                  Your subscription has expired
                </h4>
                <p style={{ margin: '4px 0 0 0', color: '#7f1d1d', fontSize: '14px' }}>
                  Please contact your Super Admin to renew your subscription.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Expiring Soon Warning */}
      {isExpiring && !isExpired && (
        <Card style={{ marginBottom: '24px', backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiAlertCircle style={{ width: '24px', height: '24px', color: '#d97706' }} />
              <div>
                <h4 style={{ margin: 0, color: '#d97706', fontWeight: '600' }}>
                  Subscription expiring soon
                </h4>
                <p style={{ margin: '4px 0 0 0', color: '#92400e', fontSize: '14px' }}>
                  Your subscription expires in {daysUntilExpiry} days. Contact your administrator to renew.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Current Plan Card */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {plan.name}
                </h2>
                {getStatusBadge(status)}
              </div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                {plan.description || 'No description available'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiCalendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Valid until</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {formatDate(subscriptionEndDate)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Usage Stats */}
      <Grid cols={2} gap={16} style={{ marginBottom: '24px' }}>
        {/* SIM Usage */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: simUsagePercent >= 100 ? '#fef2f2' : simUsagePercent >= 80 ? '#fffbeb' : '#eff6ff',
                }}>
                  <FiSmartphone style={{
                    width: '20px',
                    height: '20px',
                    color: simUsagePercent >= 100 ? '#dc2626' : simUsagePercent >= 80 ? '#d97706' : '#2563eb',
                  }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>SIM Usage</p>
                  <p style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {usage.maxSims === -1
                      ? `${usage.currentSims} (Unlimited)`
                      : `${usage.currentSims} / ${usage.maxSims}`}
                  </p>
                </div>
              </div>
            </div>
            {usage.maxSims !== -1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Usage</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: getUsageColor(simUsagePercent) }}>
                    {simUsagePercent}%
                  </span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${simUsagePercent}%`,
                    backgroundColor: getUsageColor(simUsagePercent),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                {simUsagePercent >= 100 && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px', margin: '8px 0 0 0' }}>
                    SIM limit reached. Contact Super Admin to upgrade.
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* User Usage */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: userUsagePercent >= 100 ? '#fef2f2' : userUsagePercent >= 80 ? '#fffbeb' : '#dcfce7',
                }}>
                  <FiUsers style={{
                    width: '20px',
                    height: '20px',
                    color: userUsagePercent >= 100 ? '#dc2626' : userUsagePercent >= 80 ? '#d97706' : '#16a34a',
                  }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>User Usage</p>
                  <p style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {usage.maxUsers === -1
                      ? `${usage.currentUsers} (Unlimited)`
                      : `${usage.currentUsers} / ${usage.maxUsers}`}
                  </p>
                </div>
              </div>
            </div>
            {usage.maxUsers !== -1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Usage</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: getUsageColor(userUsagePercent) }}>
                    {userUsagePercent}%
                  </span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${userUsagePercent}%`,
                    backgroundColor: getUsageColor(userUsagePercent),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                {userUsagePercent >= 100 && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px', margin: '8px 0 0 0' }}>
                    User limit reached. Contact Super Admin to upgrade.
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* Plan Features */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
            Plan Features
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <FeatureItem
              label="Max SIMs"
              value={usage.maxSims === -1 ? 'Unlimited' : usage.maxSims}
            />
            <FeatureItem
              label="Max Users"
              value={usage.maxUsers === -1 ? 'Unlimited' : usage.maxUsers}
            />
            <FeatureItem
              label="Call Log Sync"
              value={plan.features?.callLogSync}
            />
            <FeatureItem
              label="Advanced Reports"
              value={plan.features?.advancedReports}
            />
            <FeatureItem
              label="Email Notifications"
              value={plan.features?.emailNotifications}
            />
            <FeatureItem
              label="SMS Notifications"
              value={plan.features?.smsNotifications}
            />
            <FeatureItem
              label="Excel Export"
              value={plan.features?.excelExport}
            />
            <FeatureItem
              label="API Access"
              value={plan.features?.apiAccess}
            />
            <FeatureItem
              label="Priority Support"
              value={plan.features?.prioritySupport}
            />
          </div>
        </CardBody>
      </Card>

      {/* Pricing Card */}
      <Card>
        <CardBody>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
            Pricing
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Monthly</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {plan.price?.monthly ? `₹${plan.price.monthly.toLocaleString()}` : 'N/A'}
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>/month</span>
              </p>
            </div>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Yearly</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {plan.price?.yearly ? `₹${plan.price.yearly.toLocaleString()}` : 'N/A'}
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>/year</span>
              </p>
            </div>
          </div>
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, textAlign: 'center' }}>
              To upgrade or change your plan, please contact your Super Admin.
            </p>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  )
}

// Feature Item Component
function FeatureItem({ label, value }) {
  const isBoolean = typeof value === 'boolean'
  const displayValue = isBoolean ? (value ? 'Included' : 'Not included') : value

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {isBoolean ? (
        value ? (
          <FiCheck style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
        ) : (
          <FiX style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
        )
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