import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPhone,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiDownload,
  FiSearch,
  FiFlag,
  FiCheck,
  FiX,
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

export default function CallLogs() {
  const { api } = useAuth()
  const [callLogs, setCallLogs] = useState([])
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [callType, setCallType] = useState('')
  const [simId, setSimId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchCallLogs()
    fetchStats()
    fetchSims()
  }, [pagination.page])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchCallLogs()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [callType, simId, phoneNumber, dateRange.start, dateRange.end])

  const fetchSims = async () => {
    try {
      const response = await api.get('/sims?limit=100')
      setSims(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch SIMs')
    }
  }

  const fetchCallLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(callType && { callType }),
        ...(simId && { simId }),
        ...(phoneNumber && { phoneNumber }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      })

      const response = await api.get(`/call-logs?${params}`)
      setCallLogs(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      toast.error('Failed to fetch call logs')
      setCallLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/call-logs/stats')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCallLogs()
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(callType && { callType }),
        ...(simId && { simId }),
        ...(phoneNumber && { phoneNumber }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      })
      const response = await api.get(`/call-logs/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'call-logs-export.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export completed')
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const handleFlag = async (callLogId, flagged, reason = '') => {
    try {
      await api.patch(`/call-logs/${callLogId}/flag`, { flagged, reason })
      setCallLogs((prev) =>
        prev.map((log) =>
          log._id === callLogId ? { ...log, isFlagged: flagged, flaggedReason: reason } : log
        )
      )
      toast.success(flagged ? 'Call log flagged' : 'Flag removed')
    } catch (error) {
      toast.error('Failed to update flag')
    }
  }

  const getCallTypeIcon = (type) => {
    const icons = {
      incoming: FiPhoneIncoming,
      outgoing: FiPhoneOutgoing,
      missed: FiPhoneMissed,
    }
    const Icon = icons[type] || FiPhone
    return Icon
  }

  const getCallTypeStyle = (type) => {
    const styles = {
      incoming: 'success',
      outgoing: 'primary',
      missed: 'danger',
    }
    return styles[type] || 'default'
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

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const columns = [
    {
      key: 'callType',
      header: 'Type',
      render: (row) => {
        const Icon = getCallTypeIcon(row.callType)
        const variant = getCallTypeStyle(row.callType)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon style={{ width: '16px', height: '16px' }} />
            <Badge variant={variant}>{row.callType}</Badge>
            {row.isFlagged && <FiFlag style={{ width: '14px', height: '14px', color: '#dc2626' }} />}
          </div>
        )
      }
    },
    {
      key: 'phoneNumber',
      header: 'Phone Number',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '500' }}>{row.phoneNumber}</div>
          {row.contactName && <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.contactName}</div>}
        </div>
      )
    },
    {
      key: 'simId',
      header: 'SIM',
      render: (row) => (
        <div>
          <div>{row.simId?.mobileNumber || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.simId?.operator || ''}</div>
        </div>
      )
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => formatDuration(row.duration)
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
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => row.isFlagged ? (
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleFlag(row._id, false)}
          icon={FiX}
        >
          Unflag
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleFlag(row._id, true, 'Flagged for review')}
          icon={FiFlag}
        >
          Flag
        </Button>
      )
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
        title="Call Logs"
        description="View and analyze call history from mobile devices"
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
            title="Total Calls"
            value={stats.totalCalls?.toLocaleString() || 0}
            icon={FiPhone}
            iconColor="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            title="Incoming"
            value={stats.byType?.find(t => t._id === 'incoming')?.count || 0}
            icon={FiPhoneIncoming}
            iconColor="#16a34a"
            iconBg="#dcfce7"
          />
          <StatCard
            title="Outgoing"
            value={stats.byType?.find(t => t._id === 'outgoing')?.count || 0}
            icon={FiPhoneOutgoing}
            iconColor="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            title="Missed"
            value={stats.byType?.find(t => t._id === 'missed')?.count || 0}
            icon={FiPhoneMissed}
            iconColor="#dc2626"
            iconBg="#fef2f2"
          />
        </Grid>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[\t\n\r]+/g, '').trim())}
                placeholder="Search by phone number..."
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
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '140px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Types</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
              <option value="missed">Missed</option>
            </select>
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
            <Button type="submit">Search</Button>
          </form>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={callLogs}
            emptyMessage="No Call Logs Found"
            emptyAction={
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', maxWidth: '400px', margin: '0 auto' }}>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                  <strong>Mobile API Endpoint:</strong>
                </p>
                <code style={{ fontSize: '12px', color: '#2563eb', display: 'block', marginBottom: '8px' }}>
                  POST /api/call-logs/sync
                </code>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Send call logs from mobile devices using the sync endpoint with authentication token.
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