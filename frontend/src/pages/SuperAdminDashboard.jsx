import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiUsers,
  FiHome,
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiArrowUp,
  FiArrowDown,
  FiPackage,
  FiSmartphone,
  FiActivity,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
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

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4']

export default function SuperAdminDashboard() {
  const { user, api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/dashboard/admin/overview')
      setData(response.data.data)
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const getDaysUntil = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  // Platform Stats Cards
  const platformStats = [
    {
      title: 'Total Companies',
      value: data?.platform?.totalCompanies || 0,
      subtitle: `${data?.platform?.activeCompanies || 0} active`,
      icon: FiHome,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      title: 'Total Users',
      value: data?.users?.total || 0,
      subtitle: `${data?.users?.admins || 0} admins, ${data?.users?.users || 0} users`,
      icon: FiUsers,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
    },
    {
      title: 'Total SIMs',
      value: data?.sims?.total?.toLocaleString() || 0,
      subtitle: `${data?.sims?.active || 0} active`,
      icon: FiSmartphone,
      iconColor: '#8b5cf6',
      iconBg: '#f3e8ff',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(data?.revenue?.monthly),
      subtitle: `${data?.revenue?.monthlyCount || 0} transactions`,
      icon: FiDollarSign,
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
    },
  ]

  // Revenue Stats
  const revenueStats = [
    {
      title: 'Last Month',
      value: formatCurrency(data?.revenue?.lastMonth),
      icon: FiTrendingUp,
      color: '#6b7280',
    },
    {
      title: 'Yearly Revenue',
      value: formatCurrency(data?.revenue?.yearly),
      icon: FiCalendar,
      color: '#2563eb',
    },
    {
      title: 'Expired Subscriptions',
      value: data?.platform?.expiredSubscriptions || 0,
      icon: FiAlertCircle,
      color: '#dc2626',
    },
  ]

  // Expiring Companies Table Columns
  const expiringColumns = [
    {
      key: 'name',
      header: 'Company',
      render: (row) => (
        <div>
          <p style={{ fontWeight: '500', margin: 0 }}>{row.name}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{row.email}</p>
        </div>
      ),
    },
    {
      key: 'subscriptionId',
      header: 'Plan',
      render: (row) => (
        <Badge variant="default">{row.subscriptionId?.name || 'N/A'}</Badge>
      ),
    },
    {
      key: 'subscriptionEndDate',
      header: 'Expires',
      render: (row) => {
        const daysLeft = getDaysUntil(row.subscriptionEndDate)
        return (
          <div>
            <p style={{ margin: 0, fontWeight: '500' }}>{formatDate(row.subscriptionEndDate)}</p>
            <Badge variant={daysLeft <= 1 ? 'danger' : daysLeft <= 3 ? 'warning' : 'success'} size="sm">
              {daysLeft <= 0 ? 'Expired' : `${daysLeft} days`}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Link
          to={`/companies`}
          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}
        >
          View
        </Link>
      ),
    },
  ]

  // Recent Companies Columns
  const recentCompaniesColumns = [
    {
      key: 'name',
      header: 'Company',
      render: (row) => (
        <div>
          <p style={{ fontWeight: '500', margin: 0 }}>{row.name}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{row.email}</p>
        </div>
      ),
    },
    {
      key: 'subscriptionId',
      header: 'Plan',
      render: (row) => (
        <Badge variant="default">{row.subscriptionId?.name || 'N/A'}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => formatDate(row.createdAt),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Platform Dashboard"
        description={`Welcome back, ${user?.name} - Manage your SaaS platform`}
      />

      {/* Platform Stats */}
      <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
        {platformStats.map((stat, index) => (
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

      {/* Revenue & Subscription Stats */}
      <Grid cols={3} gap={16} style={{ marginBottom: '24px' }}>
        {revenueStats.map((stat, index) => (
          <Card key={index}>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: `${stat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <stat.icon style={{ width: '24px', height: '24px', color: stat.color }} />
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{stat.title}</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {/* Monthly Revenue Trend */}
      {data?.monthlyTrend && data.monthlyTrend.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              Revenue Trend (Last 12 Months)
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px' }}>
              {data.monthlyTrend.map((item, index) => {
                const maxValue = Math.max(...data.monthlyTrend.map(t => t.total || 0), 1)
                const height = Math.max(((item.total || 0) / maxValue) * 180, 4)
                const monthName = new Date(item._id + '-01').toLocaleDateString('en-IN', { month: 'short' })
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
                      {monthName}
                    </p>
                    <p style={{ fontSize: '9px', color: '#2563eb', margin: 0 }}>
                      ₹{(item.total / 1000).toFixed(0)}k
                    </p>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Subscription Distribution & Expiring Soon */}
      <Grid cols={2} gap={16} style={{ marginBottom: '24px' }}>
        {/* Subscription Plans */}
        <Card>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              Subscription Plans Distribution
            </h3>
            {data?.subscriptions?.plans && data.subscriptions.plans.length > 0 ? (
              <div>
                {data.subscriptions.plans.map((plan, index) => {
                  const total = data.subscriptions.plans.reduce((sum, p) => sum + p.companyCount, 0)
                  const percentage = total > 0 ? ((plan.companyCount / total) * 100).toFixed(1) : 0
                  return (
                    <div key={plan._id || index} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {plan.name || 'Unknown'}
                        </span>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                          {plan.companyCount} companies ({percentage}%)
                        </span>
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
                <FiPackage style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
                <p>No subscription data</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiClock style={{ color: '#f59e0b' }} />
                Expiring Subscriptions
              </h3>
              <Badge variant="warning">{data?.subscriptions?.expiringSoon?.length || 0} expiring</Badge>
            </div>
            {data?.subscriptions?.expiringSoon && data.subscriptions.expiringSoon.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {data.subscriptions.expiringSoon.slice(0, 5).map((company) => {
                  const daysLeft = getDaysUntil(company.subscriptionEndDate)
                  return (
                    <div
                      key={company._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>{company.name}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                          {company.subscriptionId?.name || 'N/A'}
                        </p>
                      </div>
                      <Badge variant={daysLeft <= 1 ? 'danger' : daysLeft <= 3 ? 'warning' : 'success'} size="sm">
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft} days`}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <FiCheck style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
                <p>No expiring subscriptions</p>
              </div>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* Recent Companies */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Recently Registered Companies
            </h3>
            <Link to="/companies" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
              View All →
            </Link>
          </div>
          {data?.recentCompanies && data.recentCompanies.length > 0 ? (
            <Table
              columns={recentCompaniesColumns}
              data={data.recentCompanies}
              emptyMessage="No recent companies"
            />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              <FiActivity style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
              <p>No recent activity</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Activity Summary */}
      <Grid cols={4} gap={16}>
        <Card>
          <CardBody style={{ textAlign: 'center' }}>
            <FiUsers style={{ width: '32px', height: '32px', color: '#2563eb', marginBottom: '8px' }} />
            <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {data?.platform?.totalCompanies || 0}
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Total Companies</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody style={{ textAlign: 'center' }}>
            <FiSmartphone style={{ width: '32px', height: '32px', color: '#16a34a', marginBottom: '8px' }} />
            <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {data?.sims?.total?.toLocaleString() || 0}
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Total SIMs</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody style={{ textAlign: 'center' }}>
            <FiDollarSign style={{ width: '32px', height: '32px', color: '#f59e0b', marginBottom: '8px' }} />
            <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {formatCurrency(data?.revenue?.yearly)}
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Yearly Revenue</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody style={{ textAlign: 'center' }}>
            <FiPackage style={{ width: '32px', height: '32px', color: '#8b5cf6', marginBottom: '8px' }} />
            <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {data?.revenue?.yearlyCount || 0}
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Yearly Transactions</p>
          </CardBody>
        </Card>
      </Grid>
    </PageContainer>
  )
}