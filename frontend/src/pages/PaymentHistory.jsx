import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiSearch,
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
import { formatDate, formatDateTime } from '../utils/dateFormat'

export default function PaymentHistory() {
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [companies, setCompanies] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  })
  const today = new Date().toISOString().split('T')[0];
  const fetchIdRef = useRef(0)
  const searchTimeoutRef = useRef(null)

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    companyId: '',
    startDate: '',
    endDate: '',
  })

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    fetchCompanies()
  }, [])

  // Single unified fetch effect — fires on page, limit, OR filter changes
  useEffect(() => {
    fetchPaymentHistory()
  }, [pagination.page, pagination.limit, filters.search, filters.status, filters.companyId, filters.startDate, filters.endDate])

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/list')
      setCompanies(response.data.data || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const fetchPaymentHistory = async () => {
    const id = ++fetchIdRef.current
    try {
      setLoading(true)
      const f = filtersRef.current
      const params = new URLSearchParams()
      params.append('page', pagination.page)
      params.append('limit', pagination.limit)
      if (f.search) params.append('search', f.search)
      if (f.status) params.append('status', f.status)
      if (f.companyId) params.append('companyId', f.companyId)
      if (f.startDate) params.append('startDate', f.startDate)
      if (f.endDate) params.append('endDate', f.endDate)

      const response = await api.get(`/payments/history/all?${params.toString()}`)
      if (fetchIdRef.current !== id) return
      setPayments(response.data.data.payments || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination?.total || 0,
      }))
    } catch (error) {
      if (fetchIdRef.current !== id) return
      console.error('Error fetching payment history:', error)
      toast.error('Failed to load payment history')
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Debounced search — waits 400ms after user stops typing before triggering API
  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, search: value }))
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 400)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      companyId: '',
      startDate: '',
      endDate: '',
    }
    setFilters(clearedFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = filters.search || filters.status || filters.companyId || filters.startDate || filters.endDate

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit))

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

  const isDeletedEntity = (entity) => entity && entity._id === null && (entity.name === 'Deleted Company' || entity.name === 'Deleted User')
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
  cursor: 'pointer',
}

  return (
    <PageContainer>
      <PageHeader
        title="Payment History"
        description="View all subscription payments across companies"
      />

      <Card style={{ marginBottom: '24px' }}>
  <CardBody>

    {/* Search */}
    <div style={{ marginBottom: '14px' }}>
      <label style={filterLabelStyle}>Search</label>
      <div style={{ position: 'relative' }}>
        <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af', pointerEvents: 'none' }} />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by company, user, plan..."
          style={{ ...filterInputStyle, paddingLeft: '32px', cursor: 'text' }}
        />
      </div>
    </div>

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
    max={filters.endDate || today}
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
          min={filters.startDate || undefined}
          max={today}
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
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#dc2626'
            e.currentTarget.style.borderColor = '#fca5a5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6b7280'
            e.currentTarget.style.borderColor = '#d1d5db'
          }}
        >
          <FiX style={{ width: '14px', height: '14px' }} />
          Clear
        </button>
      )}
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
              <p style={{ margin: 0, fontSize: '16px' }}>No payments found</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '50px' }}>S.No.</th>
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
                    {payments.map((payment, index) => (
                      <tr key={payment._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', minWidth: '140px' }}>
                          {formatDateTime(payment.paidAt || payment.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '180px' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isDeletedEntity(payment.companyId) && (
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fef2f2', border: '1px solid #fecaca', flexShrink: 0 }} title="Company has been deleted"></span>
                            )}
                            <span style={{ color: isDeletedEntity(payment.companyId) ? '#9ca3af' : '#111827', fontStyle: isDeletedEntity(payment.companyId) ? 'italic' : 'normal' }}>
                              {payment.companyId?.name || '-'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {payment.companyId?.email || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '160px' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isDeletedEntity(payment.userId) && (
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fef2f2', border: '1px solid #fecaca', flexShrink: 0 }} title="User has been deleted"></span>
                            )}
                            <span style={{ color: isDeletedEntity(payment.userId) ? '#9ca3af' : '#374151', fontStyle: isDeletedEntity(payment.userId) ? 'italic' : 'normal' }}>
                              {payment.userId?.name || '-'}
                            </span>
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
              {pagination.total > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>Rows per page:</span>
                      <select
                        value={pagination.limit}
                        onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          outline: 'none',
                          minWidth: '60px',
                        }}
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </span>
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
                      Page {pagination.page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= totalPages}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: pagination.page >= totalPages ? 'not-allowed' : 'pointer',
                        opacity: pagination.page >= totalPages ? 0.5 : 1,
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