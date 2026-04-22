import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPlus,
  FiCreditCard,
  FiX,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  StatCard,
  Grid,
  Badge,
  Button,
  Spinner,
  Pagination,
  Table,
} from '../components/ui'

// Recharge Modal Component
function RechargeModal({ isOpen, onClose, onSave, sims }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    simId: '',
    amount: '',
    plan: {
      name: '',
      validity: '',
      data: '',
      calls: '',
      sms: '',
    },
    validity: '28',
    paymentMethod: 'cash',
    notes: '',
  })

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'netbanking', label: 'Net Banking' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    if (sims && sims.length > 0 && !formData.simId) {
      setFormData((prev) => ({ ...prev, simId: sims[0]._id }))
    }
  }, [sims])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('plan.')) {
      const planField = name.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        plan: { ...prev.plan, [planField]: value },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.simId) {
      toast.error('Please select a SIM')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      const payload = {
        simId: formData.simId,
        amount: parseFloat(formData.amount),
        validity: parseInt(formData.validity) || 28,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
      }

      if (formData.plan.name) {
        payload.plan = {
          name: formData.plan.name,
          validity: parseInt(formData.plan.validity) || parseInt(formData.validity) || 28,
          data: formData.plan.data || '',
          calls: formData.plan.calls || '',
          sms: formData.plan.sms || '',
        }
      }

      await onSave(payload)
      toast.success('Recharge added successfully')
      onClose()
      setFormData({
        simId: sims && sims.length > 0 ? sims[0]._id : '',
        amount: '',
        plan: { name: '', validity: '', data: '', calls: '', sms: '' },
        validity: '28',
        paymentMethod: 'cash',
        notes: '',
      })
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
      zIndex: 50
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Add Recharge</h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              SIM Card *
            </label>
            <select
              name="simId"
              value={formData.simId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            >
              <option value="">Select SIM</option>
              {(sims || []).map((sim) => (
                <option key={sim._id} value={sim._id}>
                  {sim.mobileNumber} ({sim.operator}) {sim.status !== 'active' ? `- ${sim.status}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Amount (₹) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                min="1"
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
                Validity (days)
              </label>
              <input
                type="number"
                name="validity"
                value={formData.validity}
                onChange={handleChange}
                placeholder="e.g., 28"
                min="1"
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Plan Name
            </label>
            <input
              type="text"
              name="plan.name"
              value={formData.plan.name}
              onChange={handleChange}
              placeholder="e.g., ₹299 Unlimited Plan"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Data
              </label>
              <input
                type="text"
                name="plan.data"
                value={formData.plan.data}
                onChange={handleChange}
                placeholder="e.g., 1.5GB/day"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Calls
              </label>
              <input
                type="text"
                name="plan.calls"
                value={formData.plan.calls}
                onChange={handleChange}
                placeholder="e.g., Unlimited"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                SMS
              </label>
              <input
                type="text"
                name="plan.sms"
                value={formData.plan.sms}
                onChange={handleChange}
                placeholder="e.g., 100/day"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes..."
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>
              {loading ? 'Adding...' : 'Add Recharge'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Recharges() {
  const { user, api } = useAuth()
  const [recharges, setRecharges] = useState([])
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState(null)
  const [upcomingRecharges, setUpcomingRecharges] = useState([])
  const [overdueRecharges, setOverdueRecharges] = useState([])

  useEffect(() => {
    fetchRecharges()
    fetchStats()
    fetchSims()
    fetchUpcoming()
    fetchOverdue()
  }, [pagination.page])

  // Reset to page 1 when status or dateRange filter changes
  useEffect(() => {
    if (pagination.page === 1) {
      fetchRecharges()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [status, dateRange.start, dateRange.end])

  const fetchSims = async () => {
    try {
      const response = await api.get('/sims?limit=100')
      setSims(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch SIMs')
    }
  }

  const fetchRecharges = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(status && { status }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      })

      const response = await api.get(`/recharges?${params}`)
      setRecharges(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      toast.error('Failed to fetch recharges')
      setRecharges([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/recharges/stats')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const fetchUpcoming = async () => {
    try {
      const response = await api.get('/recharges/upcoming?days=7')
      setUpcomingRecharges(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch upcoming')
    }
  }

  const fetchOverdue = async () => {
    try {
      const response = await api.get('/recharges/overdue')
      setOverdueRecharges(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch overdue')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    fetchRecharges()
  }

  const handleAddRecharge = async (formData) => {
    await api.post('/recharges', formData)
    fetchRecharges()
    fetchStats()
  }

  const getRechargeStatusBadge = (status) => {
    const badges = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      refunded: 'default',
    }
    return badges[status] || 'default'
  }

  const getNextRechargeStatus = (nextRechargeDate) => {
    if (!nextRechargeDate) return { status: 'unknown', label: 'N/A', color: '#94a3b8' }

    const now = new Date()
    const nextDate = new Date(nextRechargeDate)
    const diffDays = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', label: `${Math.abs(diffDays)} days overdue`, color: '#dc2626' }
    } else if (diffDays === 0) {
      return { status: 'due_today', label: 'Due today', color: '#d97706' }
    } else if (diffDays <= 3) {
      return { status: 'due_soon', label: `${diffDays} days left`, color: '#f59e0b' }
    } else {
      return { status: 'active', label: `${diffDays} days left`, color: '#16a34a' }
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

  const columns = [
    {
      key: 'simId',
      header: 'SIM',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '500' }}>{row.simId?.mobileNumber || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.simId?.operator || ''}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span style={{ fontWeight: '600' }}>₹{row.amount?.toLocaleString()}</span>
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => (
        <div>
          <div style={{ fontSize: '14px' }}>{row.plan?.name || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {row.plan?.data && `${row.plan.data} • `}
            {row.validity ? `${row.validity} days` : ''}
          </div>
        </div>
      )
    },
    {
      key: 'rechargeDate',
      header: 'Date',
      render: (row) => <span style={{ fontSize: '14px' }}>{formatDate(row.rechargeDate)}</span>
    },
    {
      key: 'nextRecharge',
      header: 'Next Recharge',
      render: (row) => {
        const nextRecharge = getNextRechargeStatus(row.nextRechargeDate)
        return (
          <div>
            <div style={{ fontSize: '14px' }}>{formatDate(row.nextRechargeDate)}</div>
            <div style={{ fontSize: '12px', color: nextRecharge.color, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {nextRecharge.status === 'overdue' && <FiAlertCircle style={{ width: '12px', height: '12px' }} />}
              {nextRecharge.status === 'due_soon' && <FiClock style={{ width: '12px', height: '12px' }} />}
              {nextRecharge.status === 'active' && <FiCheckCircle style={{ width: '12px', height: '12px' }} />}
              {nextRecharge.label}
            </div>
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={getRechargeStatusBadge(row.status)}>{row.status}</Badge>
    },
  ]

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
        title="Recharges"
        description="Track and manage SIM recharges"
        action={
          <Button icon={FiPlus} onClick={() => setShowModal(true)}>
            Add Recharge
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Spent"
            value={`₹${(stats.overall?.totalAmount || 0).toLocaleString()}`}
            subtitle={`${stats.overall?.count || 0} transactions`}
            icon={FiCreditCard}
            iconColor="#16a34a"
            iconBg="#dcfce7"
          />
          <StatCard
            title="Total Recharges"
            value={stats.overall?.count || 0}
            icon={FiCreditCard}
            iconColor="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            title="Average Amount"
            value={`₹${Math.round(stats.overall?.avgAmount || 0)}`}
            icon={FiCreditCard}
            iconColor="#d97706"
            iconBg="#fffbeb"
          />
          <StatCard
            title="This Month"
            value={`₹${(stats.monthly?.[0]?.total || 0).toLocaleString()}`}
            icon={FiCreditCard}
            iconColor="#dc2626"
            iconBg="#fef2f2"
          />
        </Grid>
      )}

      {/* Alert Sections */}
      {(overdueRecharges.length > 0 || upcomingRecharges.length > 0) && (
        <Grid cols={2} gap={16} style={{ marginBottom: '24px' }}>
          {overdueRecharges.length > 0 && (
            <Card style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FiAlertCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', margin: 0 }}>
                    Overdue Recharges ({overdueRecharges.length})
                  </h3>
                </div>
                <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                  {overdueRecharges.slice(0, 5).map((r) => (
                    <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fee2e2' }}>
                      <span style={{ fontSize: '14px' }}>{r.simId?.mobileNumber}</span>
                      <span style={{ fontSize: '12px', color: '#dc2626' }}>{formatDate(r.nextRechargeDate)}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
          {upcomingRecharges.length > 0 && (
            <Card style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FiClock style={{ width: '20px', height: '20px', color: '#d97706' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#d97706', margin: 0 }}>
                    Due This Week ({upcomingRecharges.length})
                  </h3>
                </div>
                <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                  {upcomingRecharges.slice(0, 5).map((r) => (
                    <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fde68a' }}>
                      <span style={{ fontSize: '14px' }}>{r.simId?.mobileNumber}</span>
                      <span style={{ fontSize: '12px', color: '#d97706' }}>{formatDate(r.nextRechargeDate)}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </Grid>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <Button type="submit">Filter</Button>
          </form>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={recharges}
            emptyMessage="No Recharges Found"
            emptyAction={
              <Button onClick={() => setShowModal(true)}>Add Recharge</Button>
            }
          />
        </CardBody>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit)}
          total={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        />
      )}

      {/* Modal */}
      <RechargeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAddRecharge}
        sims={sims}
      />
    </PageContainer>
  )
}