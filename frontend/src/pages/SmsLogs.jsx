import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiMessageSquare,
  FiInbox,
  FiSend,
  FiDownload,
  FiSearch,
  FiSmartphone,
  FiUser,
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
  Table,
  Spinner,
  Pagination,
} from '../components/ui'

export default function SmsLogs() {
  const { api, user } = useAuth()
  const [smsLogs, setSmsLogs] = useState([])
  const [sims, setSims] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [simId, setSimId] = useState('')
  const [userId, setUserId] = useState('')
  const [sender, setSender] = useState('')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [stats, setStats] = useState(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchSmsLogs()
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchSmsLogs()
    fetchStats()
    fetchSims()
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      fetchUsers()
    }
  }, [pagination.page])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchSmsLogs()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [type, simId, userId, sender, dateRange.start, dateRange.end])

  const fetchSims = async () => {
    try {
      const response = await api.get('/sims?limit=100')
      setSims(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch SIMs')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/company')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch users')
    }
  }

  const fetchSmsLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(type && { type }),
        ...(simId && { simId }),
        ...(userId && { userId }),
        ...(sender && { sender }),
        ...(search && { search }),
        ...(dateRange.start && { fromDate: dateRange.start }),
        ...(dateRange.end && { toDate: dateRange.end }),
      })

      const response = await api.get(`/sms?${params}`)
      setSmsLogs(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      toast.error('Failed to fetch SMS logs')
      setSmsLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/sms/stats')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(type && { type }),
        ...(simId && { simId }),
        ...(userId && { userId }),
        ...(sender && { sender }),
        ...(search && { search }),
        ...(dateRange.start && { fromDate: dateRange.start }),
        ...(dateRange.end && { toDate: dateRange.end }),
      })
      const response = await api.get(`/sms/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'sms-logs-export.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export completed')
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const resetFilters = () => {
    setType('')
    setSimId('')
    setUserId('')
    setSender('')
    setSearch('')
    setDateRange({ start: '', end: '' })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getTypeIcon = (smsType) => {
    return smsType === 'sent' ? FiSend : FiInbox
  }

  const getTypeStyle = (smsType) => {
    return smsType === 'sent' ? 'primary' : 'success'
  }

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const truncateMessage = (message, maxLength = 80) => {
    if (!message) return ''
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const Icon = getTypeIcon(row.type)
        const variant = getTypeStyle(row.type)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon style={{ width: '16px', height: '16px' }} />
            <Badge variant={variant}>{row.type === 'sent' ? 'Sent' : 'Inbox'}</Badge>
          </div>
        )
      }
    },
    {
      key: 'sender',
      header: 'Sender',
      render: (row) => (
        <div style={{ fontWeight: '500' }}>{row.sender}</div>
      )
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <div style={{ maxWidth: '300px' }} title={row.message}>
          {truncateMessage(row.message)}
        </div>
      )
    },
    {
      key: 'simId',
      header: 'SIM',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '500' }}>{row.simId?.mobileNumber || row.simNumber || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.simId?.operator || ''}</div>
        </div>
      )
    },
    {
      key: 'userId',
      header: 'User',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FiUser style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          </div>
          <div>
            <div style={{ fontWeight: '500' }}>{row.userId?.name || 'Unknown'}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.userId?.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'timestamp',
      header: 'Date & Time',
      render: (row) => {
        const dateTime = formatDateTime(row.timestamp)
        return (
          <div>
            <div>{dateTime.date}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateTime.time}</div>
          </div>
        )
      }
    },
  ]

  if (loading && smsLogs.length === 0) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="SMS Logs"
        description="View and analyze SMS history from mobile devices"
        action={
          <Button variant="secondary" icon={FiDownload} onClick={handleExport}>
            Export
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total SMS"
            value={stats.totalSms?.toLocaleString() || 0}
            icon={FiMessageSquare}
            iconColor="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            title="Inbox"
            value={stats.byType?.find(t => t._id === 'inbox')?.count || 0}
            icon={FiInbox}
            iconColor="#16a34a"
            iconBg="#dcfce7"
          />
          <StatCard
            title="Sent"
            value={stats.byType?.find(t => t._id === 'sent')?.count || 0}
            icon={FiSend}
            iconColor="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            title="Unique Senders"
            value={stats.uniqueSenders || 0}
            icon={FiUser}
            iconColor="#7c3aed"
            iconBg="#f3e8ff"
          />
        </Grid>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in message..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Type Filter */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '120px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Types</option>
              <option value="inbox">Inbox</option>
              <option value="sent">Sent</option>
            </select>

            {/* SIM Filter */}
            <select
              value={simId}
              onChange={(e) => setSimId(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '160px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All SIMs</option>
              {sims.map((sim) => (
                <option key={sim._id} value={sim._id}>
                  {sim.mobileNumber} ({sim.operator})
                </option>
              ))}
            </select>

            {/* User Filter */}
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minWidth: '160px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            )}

            {/* Sender Filter */}
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Sender..."
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '120px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date Range and Actions */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>From:</span>
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
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>To:</span>
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
            </div>
            <Button onClick={fetchSmsLogs}>Apply Filters</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={smsLogs}
            emptyMessage="No SMS Logs Found"
            emptyAction={
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', maxWidth: '400px', margin: '0 auto' }}>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                  <strong>Mobile API Endpoint:</strong>
                </p>
                <code style={{ fontSize: '12px', color: '#2563eb', display: 'block', marginBottom: '8px' }}>
                  POST /api/sms/sync
                </code>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Send SMS logs from mobile devices using the sync endpoint with authentication token.
                </p>
              </div>
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
    </PageContainer>
  )
}