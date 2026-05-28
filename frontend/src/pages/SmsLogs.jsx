import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiMessageSquare,
  FiInbox,
  FiSend,
  FiDownload,
  FiSearch,
  FiSmartphone,
  FiUser,
  FiPause,
  FiPlay,
  FiRefreshCw,
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
  const [uniqueSenders, setUniqueSenders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [stats, setStats] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true) // Auto-refresh toggle
  const isInitialMount = useRef(true)

  // Initial data load (SIMs, users, stats — only once)
  useEffect(() => {
    fetchSmsLogs() // Initial load with spinner
    fetchSims()
    fetchStats()
    fetchSenders()
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      fetchUsers()
    }
  }, [])

  // Fetch SMS logs when page changes (silent — no loading spinner)
  useEffect(() => {
    // Skip the initial mount since fetchSmsLogs is already called in the first useEffect
    if (isInitialMount.current) return
    fetchSmsLogs(true)
  }, [pagination.page])

  // Fetch SMS logs when filters change — reset to page 1
  useEffect(() => {
    // Skip the initial mount since fetchSmsLogs is already called in the first useEffect
    if (isInitialMount.current) return
    if (pagination.page === 1) {
      fetchSmsLogs(true)
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
      // Page change will trigger the above useEffect which calls fetchSmsLogs
    }
  }, [type, simId, userId, sender, dateRange.start, dateRange.end])

  // Debounced search — skip on initial mount to avoid double-fetch
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchSmsLogs(true)
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Auto-refresh polling (every 20 seconds)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Silent refresh - don't show loading spinner
      fetchSmsLogs(true)
      fetchStats()
    }, 20000)

    return () => clearInterval(interval)
  }, [autoRefresh])

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

  const fetchSmsLogs = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      // For toDate, append end-of-day so the filter includes the full selected day
      const toDateParam = dateRange.end ? `${dateRange.end}T23:59:59` : ''
      const isUniqueSender = type === 'unique_sender'

      // Build base params (common to both modes)
      const baseParams = {
        // When "unique_sender" is selected, don't send type filter — we deduplicate on frontend
        ...(type && !isUniqueSender && { type }),
        ...(simId && { simId }),
        ...(userId && { userId }),
        ...(sender && { sender }),
        ...(search && { search }),
        ...(dateRange.start && { fromDate: dateRange.start }),
        ...(toDateParam && { toDate: toDateParam }),
      }

      if (isUniqueSender) {
        // Unique sender mode: fetch all pages (up to 1000 records) and deduplicate
        const params = new URLSearchParams({
          page: '1',
          limit: '100',
          ...baseParams,
        })

        // Fetch first page to get total count
        const firstResponse = await api.get(`/sms?${params}`)
        const firstPageData = firstResponse.data.data || []
        const totalCount = firstResponse.data.pagination?.total || 0
        const totalPages = Math.ceil(totalCount / 100)

        let allLogs = [...firstPageData]

        // Fetch remaining pages in parallel (cap at 10 pages = 1000 records)
        if (totalPages > 1) {
          const pagePromises = []
          const maxPages = Math.min(totalPages, 10)
          for (let p = 2; p <= maxPages; p++) {
            const pageParams = new URLSearchParams({
              page: String(p),
              limit: '100',
              ...baseParams,
            })
            pagePromises.push(api.get(`/sms?${pageParams}`))
          }
          const responses = await Promise.all(pagePromises)
          responses.forEach((r) => {
            allLogs = allLogs.concat(r.data.data || [])
          })
        }

        // Deduplicate by sender (keep most recent message per sender)
        const senderMap = new Map()
        allLogs.forEach((log) => {
          const key = log.sender || 'unknown'
          if (!senderMap.has(key) || new Date(log.timestamp) > new Date(senderMap.get(key).timestamp)) {
            senderMap.set(key, log)
          }
        })
        const uniqueLogs = Array.from(senderMap.values()).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
        setSmsLogs(uniqueLogs)
        setPagination((prev) => ({ ...prev, total: uniqueLogs.length, page: 1 }))
      } else {
        // Normal mode — single page fetch
        const params = new URLSearchParams({
          page: pagination.page,
          limit: pagination.limit,
          ...baseParams,
        })

        const response = await api.get(`/sms?${params}`)
        setSmsLogs(response.data.data || [])
        setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
      }
    } catch (error) {
      // Only show toast error for manual refresh, not polling
      if (!silent) {
        toast.error('Failed to fetch SMS logs')
      }
      setSmsLogs([])
    } finally {
      if (!silent) {
        setLoading(false)
      }
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

  const fetchSenders = async () => {
    try {
      const response = await api.get('/sms/senders')
      setUniqueSenders(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch senders')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchSmsLogs()
  }

  const handleExport = async () => {
    try {
      const toDateParam = dateRange.end ? `${dateRange.end}T23:59:59` : ''
      const params = new URLSearchParams({
        // When "unique_sender" is selected, don't send type filter for export
        ...(type && type !== 'unique_sender' && { type }),
        ...(simId && { simId }),
        ...(userId && { userId }),
        ...(sender && { sender }),
        ...(search && { search }),
        ...(dateRange.start && { fromDate: dateRange.start }),
        ...(toDateParam && { toDate: toDateParam }),
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
      toast.error('This feature is available in higher plans. Upgrade your plan to access it.')
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

  const today = new Date().toISOString().split('T')[0];

  const isUniqueSenderMode = type === 'unique_sender'

  // Client-side pagination for unique sender mode (since we deduplicate on the frontend)
  const paginatedLogs = isUniqueSenderMode
    ? smsLogs.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit)
    : smsLogs

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
            {isUniqueSenderMode && (
              <Badge variant="warning" style={{ fontSize: '11px' }}>Unique</Badge>
            )}
          </div>
        )
      }
    },
    {
      key: 'sender',
      header: 'Sender',
      render: (row) => (
        <div style={{ fontWeight: isUniqueSenderMode ? '600' : '500', color: isUniqueSenderMode ? '#7c3aed' : undefined }}>{row.sender}</div>
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
      header: 'SIM Number',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '500' }}>{row.simId?.mobileNumber || row.simNumber || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.simId?.operator || ''}</div>
        </div>
      )
    },
    {
      key: 'userId',
      header: 'User NAME',
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
        description={isUniqueSenderMode ? "Showing the most recent message from each unique sender" : "View and analyze SMS history from mobile devices"}
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
              <option value="unique_sender">Unique Sender</option>
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
            {/* <input
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
            /> */}
          </div>

          {/* Date Range and Actions */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>From:</span>
              <input
                type="date"
                value={dateRange.start}
                max={today}
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
                max={today}
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
            <Button onClick={() => fetchSmsLogs(true)}>Apply Filters</Button>
            <Button variant="secondary" onClick={resetFilters}>Reset</Button>
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

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={isUniqueSenderMode ? paginatedLogs : smsLogs}
            emptyMessage={isUniqueSenderMode ? "No Unique Senders Found" : "No SMS Logs Found"}
            showSerial
            serialOffset={(pagination.page - 1) * pagination.limit}
          />
        </CardBody>
      </Card>

      {/* Pagination — server-side for normal mode, client-side for unique sender mode */}
      {!isUniqueSenderMode && pagination.total > pagination.limit && (
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit)}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        />
      )}
      {isUniqueSenderMode && smsLogs.length > pagination.limit && (
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(smsLogs.length / pagination.limit)}
          total={smsLogs.length}
          limit={pagination.limit}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        />
      )}
    </PageContainer>
  )
}