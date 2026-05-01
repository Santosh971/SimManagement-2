import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Badge,
  Spinner,
} from '../components/ui'

export default function PaymentHistory() {
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [companies, setCompanies] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    companyId: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    fetchCompanies()
    fetchPaymentHistory()
  }, [pagination.page, pagination.limit])

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/list')
      setCompanies(response.data.data || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', pagination.page)
      params.append('limit', pagination.limit)
      if (filters.status) params.append('status', filters.status)
      if (filters.companyId) params.append('companyId', filters.companyId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await api.get(`/payments/history/all?${params.toString()}`)
      setPayments(response.data.data.payments || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination?.total || 0,
        totalPages: response.data.data.pagination?.totalPages || 0,
      }))
    } catch (error) {
      console.error('Error fetching payment history:', error)
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchPaymentHistory()
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      companyId: '',
      startDate: '',
      endDate: '',
    })
    setPagination(prev => ({ ...prev, page: 1 }))
    setTimeout(() => fetchPaymentHistory(), 100)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      failed: 'danger',
      created: 'warning',
      pending: 'warning',
    }
    return (
      <Badge variant={variants[status] || 'default'} size="sm">
        {status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : status === 'created' ? 'Pending' : status}
      </Badge>
    )
  }

  const getValidUntil = (payment) => {
    if (!payment.paidAt || !payment.planDuration) return '-'
    const paidDate = new Date(payment.paidAt)
    const endDate = new Date(paidDate.getTime() + payment.planDuration * 24 * 60 * 60 * 1000)
    return formatDate(endDate)
  }
  const filterLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '4px',
}

const filterInputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#111827',
}

  return (
    <PageContainer>
      <PageHeader
        title="Payment History"
        description="View all subscription payments across companies"
      />

      {/* Filters */}
      {/* <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Company</label>
              <select
                value={filters.companyId}
                onChange={(e) => handleFilterChange('companyId', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="created">Pending</option>
              </select>
            </div>
            <div>
  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Start Date</label>
  <input
    type="date"
    value={filters.startDate}
    onChange={(e) => handleFilterChange('startDate', e.target.value)}
    onKeyDown={(e) => e.preventDefault()}
    style={{
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
    }}
  />
</div>
            <div>
  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>End Date</label>
  <input
    type="date"
    value={filters.endDate}
    onChange={(e) => handleFilterChange('endDate', e.target.value)}
    onKeyDown={(e) => e.preventDefault()}
    style={{
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
    }}
  />
</div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={applyFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </CardBody>
      </Card> */}

      <Card style={{ marginBottom: '24px' }}>
  <CardBody>

    {/* Filters Grid */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '12px',
      marginBottom: '14px',
    }}>

      {/* Company */}
      <div>
        <label style={filterLabelStyle}>Company</label>
        <select
          value={filters.companyId}
          onChange={(e) => handleFilterChange('companyId', e.target.value)}
          style={filterInputStyle}
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company._id} value={company._id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label style={filterLabelStyle}>Status</label>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={filterInputStyle}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="created">Pending</option>
        </select>
      </div>

      {/* Start Date */}
      <div>
        <label style={filterLabelStyle}>Start Date</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          onKeyDown={(e) => e.preventDefault()}
          style={{ ...filterInputStyle, cursor: 'pointer' }}
        />
      </div>

      {/* End Date */}
      <div>
        <label style={filterLabelStyle}>End Date</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          onKeyDown={(e) => e.preventDefault()}
          style={{ ...filterInputStyle, cursor: 'pointer' }}
        />
      </div>

    </div>

    {/* Action Buttons */}
    <div style={{
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    }}>
      <button
        onClick={applyFilters}
        style={{
          flex: '1 1 120px',
          maxWidth: '180px',
          padding: '8px 16px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Apply Filters
      </button>
      <button
        onClick={clearFilters}
        style={{
          flex: '1 1 80px',
          maxWidth: '120px',
          padding: '8px 16px',
          backgroundColor: 'white',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Clear
      </button>
    </div>

  </CardBody>
</Card>

      {/* Payment Table */}
      <Card>
        <CardBody>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spinner size="lg" />
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <FiDollarSign style={{ width: '48px', height: '48px', marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '16px' }}>No payments found</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '140px', whiteSpace: 'nowrap' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '180px' }}>Company</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '160px' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '100px' }}>Plan</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '80px' }}>Billing</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '100px' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '110px', whiteSpace: 'nowrap' }}>Valid Until</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', minWidth: '90px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', minWidth: '140px' }}>
                          {formatDateTime(payment.paidAt || payment.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '180px' }}>
                          <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                            {payment.companyId?.name || '-'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {payment.companyId?.email || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '160px' }}>
                          <div style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                            {payment.userId?.name || '-'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {payment.userId?.email || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#111827', minWidth: '100px' }}>
                          {payment.planName}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', minWidth: '80px' }}>
                          {payment.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#111827', textAlign: 'right', minWidth: '100px' }}>
                          ₹{payment.amount?.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap', minWidth: '110px' }}>
                          {getValidUntil(payment)}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '90px' }}>
                          {getStatusBadge(payment.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                        opacity: pagination.page === 1 ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <FiChevronLeft style={{ width: '16px', height: '16px' }} />
                    </button>
                    <span style={{ padding: '8px 12px', fontSize: '14px', color: '#374151' }}>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                        opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <FiChevronRight style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  )
}