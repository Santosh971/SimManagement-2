import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiSmartphone,
  FiCreditCard,
  FiBell,
  FiClock,
  FiAlertCircle,
  FiCheck,
  FiPhone,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  StatCard,
  Badge,
  Table,
  Spinner,
  Grid,
} from '../components/ui'
import SuperAdminDashboard from './SuperAdminDashboard'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const { user, api } = useAuth()

  // Render SuperAdminDashboard for super_admin users
  if (user?.role === 'super_admin') {
    return <SuperAdminDashboard />
  }

  // Company Admin/User Dashboard
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [simStats, setSimStats] = useState(null)
  const [rechargeStats, setRechargeStats] = useState(null)
  const [callStats, setCallStats] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [overviewRes, simRes, rechargeRes, callRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/sims'),
        api.get('/dashboard/recharges'),
        api.get('/dashboard/calls'),
      ])

      setOverview(overviewRes.data.data)
      setSimStats(simRes.data.data)
      setRechargeStats(rechargeRes.data.data)
      setCallStats(callRes.data.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
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

  const getDaysUntil = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  const statsCards = [
    {
      title: 'Total SIMs',
      value: overview?.sims?.total || 0,
      subtitle: `${overview?.sims?.active || 0} active`,
      icon: FiSmartphone,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      title: 'Monthly Recharges',
      value: `₹${(overview?.recharges?.monthlyTotal || 0).toLocaleString()}`,
      subtitle: `${overview?.recharges?.monthlyCount || 0} transactions`,
      icon: FiCreditCard,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
    },
    {
      title: 'Upcoming Recharges',
      value: overview?.recharges?.upcoming?.length || 0,
      subtitle: 'Next 7 days',
      icon: FiClock,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      title: 'Unread Notifications',
      value: overview?.notifications?.unread || 0,
      subtitle: 'New alerts',
      icon: FiBell,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
    },
  ]

  const simColumns = [
    { key: 'mobileNumber', header: 'Mobile Number', render: (row) => <span style={{ fontWeight: '500' }}>{row.mobileNumber}</span> },
    { key: 'operator', header: 'Operator', render: (row) => <Badge variant="default">{row.operator}</Badge> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'active' ? 'success' : row.status === 'inactive' ? 'danger' : 'warning'}>{row.status}</Badge> },
    { key: 'createdAt', header: 'Added On', render: (row) => formatDate(row.createdAt) },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name}`}
      />

      {/* Stats Grid */}
      <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
        {statsCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
          />
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid cols={2} gap={16} style={{ marginBottom: '24px' }}>
        {/* SIM Distribution */}
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              SIM Distribution by Operator
            </h3>
            {simStats?.byOperator && simStats.byOperator.length > 0 ? (
              <div>
                {simStats.byOperator.map((item, index) => {
                  const total = simStats.byOperator.reduce((sum, i) => sum + i.count, 0)
                  const percentage = ((item.count / total) * 100).toFixed(1)
                  return (
                    <div key={item._id} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', color: '#111827' }}>{item._id}</span>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>{item.count} ({percentage}%)</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <FiSmartphone style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
                <p>No SIM data available</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Call Stats */}
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              Call Statistics
            </h3>
            {callStats ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                    <FiPhoneIncoming style={{ width: '20px', height: '20px', color: '#16a34a', marginBottom: '4px' }} />
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {callStats.byType?.find(t => t._id === 'incoming')?.count || 0}
                    </p>
                    <p style={{ fontSize: '12px', color: '#16a34a', margin: 0 }}>Incoming</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                    <FiPhoneOutgoing style={{ width: '20px', height: '20px', color: '#2563eb', marginBottom: '4px' }} />
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {callStats.byType?.find(t => t._id === 'outgoing')?.count || 0}
                    </p>
                    <p style={{ fontSize: '12px', color: '#2563eb', margin: 0 }}>Outgoing</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                    <FiPhoneMissed style={{ width: '20px', height: '20px', color: '#dc2626', marginBottom: '4px' }} />
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {callStats.byType?.find(t => t._id === 'missed')?.count || 0}
                    </p>
                    <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>Missed</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Total Calls</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{callStats.totalCalls?.toLocaleString() || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Unique Numbers</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{callStats.uniqueNumbers || 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <FiPhone style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
                <p>No call data available</p>
              </div>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* Recharge Timeline */}
      {rechargeStats?.timeline && rechargeStats.timeline.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              Recharge Trends (Last 14 Days)
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px' }}>
              {rechargeStats.timeline.slice(-14).map((item, index) => {
                const maxTotal = Math.max(...rechargeStats.timeline.map(t => t.total || 0), 1)
                const height = Math.max(((item.total || 0) / maxTotal) * 180, 4)
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      borderRadius: '4px 4px 0 0',
                      height: `${height}px`,
                      minHeight: '4px',
                      transition: 'height 0.3s ease',
                    }} />
                    <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
                      {item._id?.split('-')[2] || ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Upcoming and Overdue Recharges */}
      <Grid cols={2} gap={16} style={{ marginBottom: '24px' }}>
        {/* Upcoming Recharges */}
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock style={{ color: '#d97706' }} />
              Upcoming Recharges
            </h3>
            {overview?.recharges?.upcoming && overview.recharges.upcoming.length > 0 ? (
              <div>
                {overview.recharges.upcoming.slice(0, 5).map((recharge) => {
                  const daysLeft = getDaysUntil(recharge.nextRechargeDate)
                  return (
                    <div key={recharge._id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}>
                      <div>
                        <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>{recharge.simId?.mobileNumber || 'N/A'}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{recharge.simId?.operator}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>₹{recharge.amount}</p>
                        <Badge variant={daysLeft <= 1 ? 'danger' : daysLeft <= 3 ? 'warning' : 'success'} size="sm">
                          {daysLeft <= 0 ? 'Overdue' : `${daysLeft} days`}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <FiCheck style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
                <p>No upcoming recharges</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Overdue Recharges */}
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiAlertCircle style={{ color: '#dc2626' }} />
              Overdue Recharges
            </h3>
            {overview?.recharges?.overdue > 0 ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', fontWeight: '600', color: '#dc2626', margin: 0 }}>{overview.recharges.overdue}</p>
                <p style={{ color: '#6b7280' }}>SIMs require recharge</p>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <FiCheck style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
                <p>All recharges up to date</p>
              </div>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* Recent SIMs */}
      {simStats?.recent && simStats.recent.length > 0 && (
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              Recently Added SIMs
            </h3>
            <Table
              columns={simColumns}
              data={simStats.recent}
              emptyMessage="No recent SIMs"
            />
          </CardBody>
        </Card>
      )}
    </PageContainer>
  )
}