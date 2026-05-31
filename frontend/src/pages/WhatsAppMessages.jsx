import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiMessageCircle, FiSend, FiCheck, FiX, FiClock, FiAlertCircle, FiPause, FiPlay, FiSearch } from 'react-icons/fi'
import toast from 'react-hot-toast'
import SendMessageModal from '../components/whatsapp/SendMessageModal'
import { formatDateTime } from '../utils/dateFormat'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Badge,
  Button,
  Table,
  Spinner,
  Grid,
  Pagination,
} from '../components/ui'

export default function WhatsAppMessages() {
  const { user, api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [stats, setStats] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
  })
  const [phoneSearch, setPhoneSearch] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 })
  const [autoRefresh, setAutoRefresh] = useState(true) // Auto-refresh toggle
  const [initialLoad, setInitialLoad] = useState(true)
  const fetchIdRef = useRef(0)
  const today = new Date().toISOString().split('T')[0]

  // FIXED: Fetch data when page or filters change
  useEffect(() => {
    fetchData()
  }, [pagination.page, pagination.limit])

  // FIXED: Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchData()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [filters.status, dateRange.start, dateRange.end])

  // Auto-refresh polling (every 20 seconds)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Silent refresh - don't show loading spinner
      fetchData(true)
    }, 20000) // 20 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, pagination.page, pagination.limit, filters.status, dateRange.start, dateRange.end])

  const fetchData = async (silent = false) => {
    const id = ++fetchIdRef.current
    try {
      if (!silent) {
        setLoading(true)
      }
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      })

      const [messagesRes, statsRes] = await Promise.all([
        api.get(`/whatsapp/messages?${params}`),
        api.get('/whatsapp/stats'),
      ])

      if (fetchIdRef.current !== id) return
      setMessages(messagesRes.data.data || [])
      setPagination((prev) => ({
        ...prev,
        total: messagesRes.data.pagination?.total || 0,
        page: messagesRes.data.pagination?.page || 1,
      }))
      setStats(statsRes.data.data)
      setInitialLoad(false)
    } catch (error) {
      if (fetchIdRef.current !== id) return
      console.error('Failed to fetch messages:', error)
      // Only show toast error for manual refresh, not polling
      if (!silent) {
        toast.error('Failed to load messages')
      }
    } finally {
      if (!silent && fetchIdRef.current === id) {
        setLoading(false)
      }
    }
  }

  const handleClearFilters = () => {
    setFilters({ status: '' })
    setPhoneSearch('')
    setDateRange({ start: '', end: '' })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { bg: '#dbeafe', color: '#2563eb', icon: FiSend },
      delivered: { bg: '#fef3c7', color: '#d97706', icon: FiCheck },
      replied: { bg: '#dcfce7', color: '#16a34a', icon: FiCheck },
      failed: { bg: '#fef2f2', color: '#dc2626', icon: FiX },
      inactive: { bg: '#f3f4f6', color: '#4b5563', icon: FiAlertCircle },
    }
    return statusConfig[status] || statusConfig.sent
  }

  const filteredMessages = phoneSearch.trim()
    ? messages.filter((m) => {
        const q = phoneSearch.toLowerCase().trim()
        return (
          (m.phoneNumber || '').toLowerCase().includes(q) ||
          (m.message || '').toLowerCase().includes(q) ||
          (m.recipientName || '').toLowerCase().includes(q)
        )
      })
    : messages

  const formatDate = formatDateTime

  const columns = [
    {
      key: 'phoneNumber',
      header: 'Contact Number',
      render: (row) => (
        <span style={{ fontWeight: '500' }}>{row.phoneNumber}</span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (row) => (
        <div style={{ fontSize: '13px' }}>
          {row.simId && typeof row.simId === 'object' && (
            <div>
              <div style={{ fontWeight: '500' }}>{row.simId.mobileNumber}</div>
              <div style={{ color: '#6b7280' }}>SIM • {row.simId.operator}</div>
            </div>
          )}
          {row.userId && typeof row.userId === 'object' && (
            <div>
              <div style={{ fontWeight: '500' }}>{row.userId.name}</div>
              <div style={{ color: '#6b7280' }}>User • {row.userId.email}</div>
            </div>
          )}
          {!row.simId && !row.userId && <span style={{ color: '#6b7280' }}>-</span>}
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <div title={row.message} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>
          {row.message}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const config = getStatusBadge(row.status)
        const Icon = config.icon
        return (
          <Badge variant="default" style={{ backgroundColor: config.bg, color: config.color }}>
            <Icon style={{ width: '14px', height: '14px', marginRight: '4px' }} />
            {row.status}
          </Badge>
        )
      },
    },
    {
      key: 'sentAt',
      header: 'Sent At',
      render: (row) => formatDate(row.sentAt),
    },
    {
      key: 'repliedAt',
      header: 'Reply At',
      render: (row) => (row.repliedAt ? formatDate(row.repliedAt) : <span style={{ color: '#9ca3af' }}>-</span>),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (row) => {
        if (row.isActive === true) {
          return <Badge variant="success">Yes</Badge>
        } else if (row.isActive === false) {
          return <Badge variant="danger">No</Badge>
        }
        return <Badge variant="warning">Pending</Badge>
      },
    },
  ]

  if (loading && initialLoad) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="WhatsApp Messages"
        description="Send and track WhatsApp messages to SIMs and users"
        action={
          <Button icon={FiSend} onClick={() => setShowModal(true)}>
            Send Message
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Grid cols={5} gap={16} style={{ marginBottom: '24px' }}>
          <Card>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#2563eb' }}>
                {stats.total || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Total</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a' }}>
                {stats.replied || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Replied</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>
                {stats.sent || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Sent</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#6b7280' }}>
                {stats.inactive || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Inactive</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
                {stats.failed || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Failed</div>
            </CardBody>
          </Card>
        </Grid>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    minWidth: '140px',
                    outline: 'none',
                  }}
                >
                  <option value="">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="replied">Replied</option>
                  <option value="inactive">Inactive</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Search
                </label>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search by number, message, name..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    style={{
                      padding: '10px 14px 10px 32px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      minWidth: '200px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  From
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  max={dateRange.end || today}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  onKeyDown={(e) => e.preventDefault()}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  To
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start || undefined}
                  max={today}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  onKeyDown={(e) => e.preventDefault()}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <Button variant="secondary" onClick={handleClearFilters}>Clear</Button>
            </div>
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: `1px solid ${autoRefresh ? '#16a34a' : '#d1d5db'}`,
                borderRadius: '8px',
                background: autoRefresh ? '#dcfce7' : '#fff',
                color: autoRefresh ? '#16a34a' : '#6b7280',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {autoRefresh ? (
                <>
                  <FiPlay style={{ width: '14px', height: '14px' }} />
                  Auto-refresh ON
                </>
              ) : (
                <>
                  <FiPause style={{ width: '14px', height: '14px' }} />
                  Auto-refresh OFF
                </>
              )}
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={filteredMessages}
            emptyMessage="No messages found"
            showSerial
            serialOffset={(pagination.page - 1) * pagination.limit}
          />
        </CardBody>
      </Card>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>Rows per page:</span>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
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
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="w-full sm:w-auto overflow-x-auto">
              <div className="flex justify-center sm:justify-end min-w-max">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={Math.ceil(pagination.total / pagination.limit)}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchData()
        }}
      />
    </PageContainer>
  )
}