import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiBell,
  FiCheck,
  FiTrash2,
  FiAlertCircle,
  FiClock,
  FiCreditCard,
  FiInfo,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Badge,
  Button,
  Spinner,
  Pagination,
} from '../components/ui'

// Plan names to highlight (known from the app)
const PLAN_NAMES = ['Starter', 'Standard', 'Professional', 'Enterprise', 'Basic', 'Premium', 'Free', 'Pro']

/**
 * highlightMessage - Parses notification message and returns JSX with highlighted entities
 * @param {string} message - The notification message text
 * @param {object} metadata - Optional metadata with entity references
 * @returns {Array} Array of React elements (strings and styled spans)
 */
function highlightMessage(message, metadata = {}) {
  if (!message) return [message]

  // Track which positions have been highlighted to avoid overlaps
  const highlights = []

  // 1. COMPANY NAMES - Bold + Blue (#2563eb)
  // First check metadata for company name
  if (metadata.companyName) {
    const companyRegex = new RegExp(`(${escapeRegex(metadata.companyName)})`, 'gi')
    let match
    while ((match = companyRegex.exec(message)) !== null) {
      highlights.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'company',
        text: match[0],
      })
    }
  }

  // Also match capitalized multi-word proper nouns after "for", "of", "to"
  const companyPattern = /(?:for|of|to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/g
  let match
  while ((match = companyPattern.exec(message)) !== null) {
    const start = match.index + match[0].indexOf(match[1])
    const end = start + match[1].length
    if (!highlights.some(h => (start >= h.start && start < h.end) || (end > h.start && end <= h.end))) {
      highlights.push({ start, end, type: 'company', text: match[1] })
    }
  }

  // 2. RUPEE AMOUNTS - Bold + Green (#16a34a)
  const amountPattern = /₹[\d,]+/g
  while ((match = amountPattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'amount', text: match[0] })
    }
  }

  // 3. PHONE/SIM NUMBERS - Bold + Purple (#7c3aed)
  const phonePattern = /(\+91\d{10}|[6-9]\d{9})/g
  while ((match = phonePattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'phone', text: match[0] })
    }
  }

  // 4. DATES - Bold + Amber (#d97706)
  // Common date formats: "20 April 2026", "Nov 2031", "20/04/2026", "April 20, 2026"
  const datePattern = /(\d{1,2}?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}?,?\s*\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi
  while ((match = datePattern.exec(message)) !== null) {
    const matchedText = match[0]
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + matchedText.length, type: 'date', text: matchedText })
    }
  }

  // 5. STATUS WORDS
  const statusPatterns = [
    { words: ['Active', 'Enabled', 'Activated'], type: 'status-success' },
    { words: ['Inactive', 'Disabled', 'Expired', 'Suspended', 'Deactivated'], type: 'status-danger' },
    { words: ['Pending', 'Processing'], type: 'status-warning' },
  ]

  statusPatterns.forEach(({ words, type }) => {
    words.forEach(word => {
      const wordRegex = new RegExp(`\\b(${word})\\b`, 'gi')
      while ((match = wordRegex.exec(message)) !== null) {
        if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
          highlights.push({ start: match.index, end: match.index + match[0].length, type, text: match[0] })
        }
      }
    })
  })

  // 6. QUOTA/LIMIT NUMBERS - Bold + Cyan (#0891b2)
  const quotaPattern = /(\d+)\s+(SIMs?|users?|records?|recharges?|entries?)/gi
  while ((match = quotaPattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'quota', text: match[0] })
    }
  }

  // 7. PLAN NAMES - Bold + Italic + Purple (#7c3aed)
  PLAN_NAMES.forEach(planName => {
    const planRegex = new RegExp(`\\b(${planName})\\b`, 'gi')
    while ((match = planRegex.exec(message)) !== null) {
      if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
        highlights.push({ start: match.index, end: match.index + match[0].length, type: 'plan', text: match[0] })
      }
    }
  })

  // Sort highlights by start position
  highlights.sort((a, b) => a.start - b.start)

  // Build result array
  if (highlights.length === 0) return [message]

  const result = []
  let lastEnd = 0

  highlights.forEach((highlight, index) => {
    // Add text before this highlight
    if (highlight.start > lastEnd) {
      result.push(message.slice(lastEnd, highlight.start))
    }
    // Add the highlighted span
    result.push(
      <HighlightSpan key={index} type={highlight.type} text={highlight.text} />
    )
    lastEnd = highlight.end
  })

  // Add remaining text after last highlight
  if (lastEnd < message.length) {
    result.push(message.slice(lastEnd))
  }

  return result
}

// Helper to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Component for highlighted spans
function HighlightSpan({ type, text }) {
  const styles = {
    company: { fontWeight: '600', color: '#2563eb' },
    amount: { fontWeight: '600', color: '#16a34a' },
    phone: { fontWeight: '600', color: '#7c3aed' },
    date: { fontWeight: '600', color: '#d97706' },
    'status-success': { fontWeight: '600', color: '#16a34a' },
    'status-danger': { fontWeight: '600', color: '#dc2626' },
    'status-warning': { fontWeight: '600', color: '#d97706' },
    quota: { fontWeight: '600', color: '#0891b2' },
    plan: { fontWeight: '600', fontStyle: 'italic', color: '#7c3aed' },
  }

  const style = styles[type] || {}

  return <span style={style}>{text}</span>
}

export default function Notifications() {
  const { api } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })

  useEffect(() => {
    fetchNotifications()
  }, [pagination.page])

  // Reset to page 1 when filter changes
  useEffect(() => {
    if (pagination.page === 1) {
      fetchNotifications()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [filter])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filter === 'unread' && { isRead: 'false' }),
        ...(filter === 'read' && { isRead: 'true' }),
      })

      const response = await api.get(`/notifications?${params}`)
      setNotifications(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      toast.error('Failed to fetch notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      )
      toast.success('Notification marked as read')
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      toast.success('Notification deleted')
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const getTypeStyle = (type) => {
    const styles = {
      recharge_due: { bg: '#fffbeb', color: '#d97706', icon: FiCreditCard },
      inactive_sim: { bg: '#fef2f2', color: '#dc2626', icon: FiAlertCircle },
      subscription_expiry: { bg: '#eff6ff', color: '#2563eb', icon: FiClock },
      system: { bg: '#f1f5f9', color: '#475569', icon: FiInfo },
      alert: { bg: '#fef2f2', color: '#dc2626', icon: FiAlertCircle },
      info: { bg: '#eff6ff', color: '#2563eb', icon: FiInfo },
    }
    return styles[type] || styles.info
  }

  const getPriorityStyle = (priority) => {
    const styles = {
      low: { bg: '#f1f5f9', color: '#475569' },
      medium: { bg: '#eff6ff', color: '#2563eb' },
      high: { bg: '#fffbeb', color: '#d97706' },
      critical: { bg: '#fef2f2', color: '#dc2626' },
    }
    return styles[priority] || styles.medium
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

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
        title="Notifications"
        description="View and manage your notifications"
        action={
          <Button variant="secondary" icon={FiCheck} onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'unread', 'read'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: filter === f ? '#2563eb' : '#f1f5f9',
                  color: filter === f ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notification) => {
            const typeStyle = getTypeStyle(notification.type)
            const priorityStyle = getPriorityStyle(notification.priority)
            const IconComponent = typeStyle.icon

            return (
              <Card
                key={notification._id}
                style={{
                  borderLeft: notification.isRead ? 'none' : '4px solid #2563eb',
                  backgroundColor: notification.isRead ? '#ffffff' : '#f0f7ff',
                }}
              >
                <CardBody>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: typeStyle.bg,
                          color: typeStyle.color,
                          fontSize: '12px',
                          textTransform: 'capitalize',
                        }}>
                          <IconComponent style={{ width: '12px', height: '12px' }} />
                          {notification.type.replace('_', ' ')}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: priorityStyle.bg,
                          color: priorityStyle.color,
                          fontSize: '12px',
                          textTransform: 'capitalize',
                        }}>
                          {notification.priority}
                        </span>
                        {!notification.isRead && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#2563eb',
                            borderRadius: '50%',
                          }} />
                        )}
                      </div>
                      <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '4px', margin: 0 }}>
                        {notification.title}
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.5, margin: '4px 0' }}>
                        {highlightMessage(notification.message, notification.metadata)}
                      </p>
                      <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiClock style={{ width: '12px', height: '12px' }} />
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {!notification.isRead && (
                        <Button variant="secondary" size="sm" onClick={() => markAsRead(notification._id)} icon={FiCheck}>
                          Mark Read
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => deleteNotification(notification._id)} icon={FiTrash2}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiBell style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Notifications</h3>
              <p style={{ color: '#6b7280' }}>You're all caught up! No notifications yet.</p>
            </div>
          </CardBody>
        </Card>
      )}

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