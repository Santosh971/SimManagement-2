import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiSend, FiRefreshCw, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import SendMessageModal from '../components/telegram/SendMessageModal'
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

export default function TelegramMessages() {
  const { user, api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [stats, setStats] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    simId: '',
  })
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 })

  // Fetch data when page changes
  useEffect(() => {
    fetchData()
  }, [pagination.page])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchData()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [filters.status, filters.simId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.simId && { simId: filters.simId }),
      })

      const [messagesRes, statsRes] = await Promise.all([
        api.get(`/telegram/messages?${params}`),
        api.get('/telegram/stats'),
      ])

      setMessages(messagesRes.data.data || [])
      setPagination((prev) => ({
        ...prev,
        total: messagesRes.data.pagination?.total || 0,
        page: messagesRes.data.pagination?.page || 1,
      }))
      setStats(statsRes.data.data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchData()
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns = [
    {
      key: 'simId',
      header: 'SIM',
      render: (row) => (
        <div style={{ fontSize: '13px' }}>
          {row.simId && typeof row.simId === 'object' ? (
            <>
              <div style={{ fontWeight: '500' }}>{row.simId.mobileNumber}</div>
              <div style={{ color: '#6b7280' }}>{row.simId.operator}</div>
            </>
          ) : (
            <span style={{ color: '#6b7280' }}>-</span>
          )}
        </div>
      ),
    },
    {
      key: 'chatId',
      header: 'Chat ID',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {row.chatId || '-'}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

  if (loading && messages.length === 0) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Telegram Messages"
        description="Send and track Telegram messages to SIMs via SimTrack bot"
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
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#0088cc' }}>
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
            <Button onClick={handleRefresh} disabled={loading} icon={FiRefreshCw}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={messages}
            emptyMessage="No Telegram messages found"
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