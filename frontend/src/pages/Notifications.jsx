



import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { formatDateTimeFull } from '../utils/dateFormat'
import {
  FiBell,
  FiCheck,
  FiTrash2,
  FiAlertCircle,
  FiClock,
  FiCreditCard,
  FiInfo,
  FiX,
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
  Modal,
} from '../components/ui'

// Plan names to highlight
const PLAN_NAMES = ['Starter', 'Standard', 'Professional', 'Enterprise', 'Basic', 'Premium', 'Free', 'Pro']

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightSpan({ type, text }) {
  const classMap = {
    company:        'font-semibold text-blue-600',
    amount:         'font-semibold text-green-600',
    phone:          'font-semibold text-purple-600',
    date:           'font-semibold text-amber-600',
    'status-success': 'font-semibold text-green-600',
    'status-danger':  'font-semibold text-red-600',
    'status-warning': 'font-semibold text-amber-600',
    quota:          'font-semibold text-cyan-600',
    plan:           'font-semibold italic text-purple-600',
  }
  return <span className={classMap[type] || ''}>{text}</span>
}

function highlightMessage(message, metadata = {}) {
  if (!message) return [message]
  const highlights = []

  if (metadata.companyName) {
    const re = new RegExp(`(${escapeRegex(metadata.companyName)})`, 'gi')
    let m
    while ((m = re.exec(message)) !== null) {
      highlights.push({ start: m.index, end: m.index + m[0].length, type: 'company', text: m[0] })
    }
  }

  const companyPattern = /(?:for|of|to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/g
  let match
  while ((match = companyPattern.exec(message)) !== null) {
    const start = match.index + match[0].indexOf(match[1])
    const end = start + match[1].length
    if (!highlights.some(h => (start >= h.start && start < h.end) || (end > h.start && end <= h.end))) {
      highlights.push({ start, end, type: 'company', text: match[1] })
    }
  }

  const amountPattern = /₹[\d,]+/g
  while ((match = amountPattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'amount', text: match[0] })
    }
  }

  const phonePattern = /(\+91\d{10}|[6-9]\d{9})/g
  while ((match = phonePattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'phone', text: match[0] })
    }
  }

  const datePattern = /(\d{1,2}?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}?,?\s*\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi
  while ((match = datePattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'date', text: match[0] })
    }
  }

  const statusPatterns = [
    { words: ['Active', 'Enabled', 'Activated'], type: 'status-success' },
    { words: ['Inactive', 'Disabled', 'Expired', 'Deactivated'], type: 'status-danger' },
    { words: ['Pending', 'Processing'], type: 'status-warning' },
  ]
  statusPatterns.forEach(({ words, type }) => {
    words.forEach(word => {
      const re = new RegExp(`\\b(${word})\\b`, 'gi')
      while ((match = re.exec(message)) !== null) {
        if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
          highlights.push({ start: match.index, end: match.index + match[0].length, type, text: match[0] })
        }
      }
    })
  })

  const quotaPattern = /(\d+)\s+(SIMs?|users?|records?|recharges?|entries?)/gi
  while ((match = quotaPattern.exec(message)) !== null) {
    if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'quota', text: match[0] })
    }
  }

  PLAN_NAMES.forEach(planName => {
    const re = new RegExp(`\\b(${planName})\\b`, 'gi')
    while ((match = re.exec(message)) !== null) {
      if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
        highlights.push({ start: match.index, end: match.index + match[0].length, type: 'plan', text: match[0] })
      }
    }
  })

  highlights.sort((a, b) => a.start - b.start)
  if (highlights.length === 0) return [message]

  const result = []
  let lastEnd = 0
  highlights.forEach((highlight, index) => {
    if (highlight.start > lastEnd) result.push(message.slice(lastEnd, highlight.start))
    result.push(<HighlightSpan key={index} type={highlight.type} text={highlight.text} />)
    lastEnd = highlight.end
  })
  if (lastEnd < message.length) result.push(message.slice(lastEnd))
  return result
}

function formatFullDate(dateString) {
  return formatDateTimeFull(dateString)
}

export default function Notifications() {
  const { api } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [viewingNotification, setViewingNotification] = useState(null)

  useEffect(() => { fetchNotifications() }, [pagination.page])

  useEffect(() => {
    if (pagination.page === 1) {
      fetchNotifications()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [filter, priorityFilter])

  useEffect(() => { setSelectedIds([]) }, [filter, priorityFilter, pagination.page])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filter === 'unread' && { isRead: 'false' }),
        ...(filter === 'read' && { isRead: 'true' }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
      })
      const response = await api.get(`/notifications?${params}`)
      setNotifications(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch {
      toast.error('Failed to fetch notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    } catch (e) { console.error(e) }
  }

  const openNotification = async (notification) => {
    setViewingNotification(notification)
    if (!notification.isRead) await markAsRead(notification._id)
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch { toast.error('Failed to mark all as read') }
  }

  const markSelectedAsRead = async () => {
    try {
      const unreadSelectedIds = selectedIds.filter(id => {
        const n = notifications.find(n => n._id === id)
        return n && !n.isRead
      })

      if (unreadSelectedIds.length === 0) {
        toast.info('Selected notifications are already read')
        return
      }

      await Promise.all(unreadSelectedIds.map(id => api.patch(`/notifications/${id}/read`)))
      setNotifications(prev => prev.map(n =>
        unreadSelectedIds.includes(n._id) ? { ...n, isRead: true } : n
      ))
      toast.success(`${unreadSelectedIds.length} notification${unreadSelectedIds.length > 1 ? 's' : ''} marked as read`)
    } catch { toast.error('Failed to mark selected as read') }
  }

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      if (viewingNotification?._id === id) setViewingNotification(null)
      setSelectedIds((prev) => prev.filter((i) => i !== id))
      await fetchNotifications()
      toast.success('Notification deleted')
    } catch { toast.error('Failed to delete notification') }
  }

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? notifications.map((n) => n._id) : [])
  }

  const handleSelectOne = (id, e) => {
    e.stopPropagation()
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const isAllSelected = notifications.length > 0 && selectedIds.length === notifications.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < notifications.length
  const hasUnreadNotifications = notifications.some(n => !n.isRead)
  const hasUnreadSelected = selectedIds.some(id => {
    const n = notifications.find(n => n._id === id)
    return n && !n.isRead
  })

  const deleteSelectedNotifications = async () => {
    try {
      setDeleting(true)
      const count = selectedIds.length
      await api.post('/notifications/delete-selected', { notificationIds: selectedIds })
      setSelectedIds([])
      setShowDeleteModal(false)
      await fetchNotifications()
      toast.success(`${count} notification${count > 1 ? 's' : ''} deleted`)
    } catch { toast.error('Failed to delete notifications') }
    finally { setDeleting(false) }
  }

  const getTypeStyle = (type) => {
    const styles = {
      recharge_due:        { bgClass: 'bg-amber-50',  colorClass: 'text-amber-600',  icon: FiCreditCard,  label: 'Recharge Due' },
      inactive_sim:        { bgClass: 'bg-red-50',    colorClass: 'text-red-600',    icon: FiAlertCircle, label: 'Inactive SIM' },
      subscription_expiry: { bgClass: 'bg-blue-50',   colorClass: 'text-blue-600',   icon: FiClock,       label: 'Subscription' },
      system:              { bgClass: 'bg-slate-100', colorClass: 'text-slate-600',  icon: FiInfo,        label: 'System' },
      alert:               { bgClass: 'bg-red-50',    colorClass: 'text-red-600',    icon: FiAlertCircle, label: 'Alert' },
      info:                { bgClass: 'bg-blue-50',   colorClass: 'text-blue-600',   icon: FiInfo,        label: 'Info' },
    }
    return styles[type] || styles.info
  }

  const getPriorityStyle = (priority) => {
    const styles = {
      low:      'bg-slate-100 text-slate-600',
      medium:   'bg-blue-50 text-blue-600',
      high:     'bg-amber-50 text-amber-600',
      critical: 'bg-red-50 text-red-600',
    }
    return styles[priority] || styles.medium
  }

  const formatDate = (dateString) => {
    const diffMs = Date.now() - new Date(dateString)
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
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* ── Page Header ── */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              
              Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage your notifications</p>
          </div>

          {/* Header action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              icon={FiCheck}
              onClick={markSelectedAsRead}
              disabled={!hasUnreadSelected}
              className="text-sm"
            >
              Mark Read
            </Button>
            <Button
              variant="secondary"
              icon={FiCheck}
              onClick={markAllAsRead}
              disabled={!hasUnreadNotifications}
              className="text-sm"
            >
              Mark All Read
            </Button>
            <Button
              variant="danger"
              icon={FiTrash2}
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedIds.length === 0}
              className="text-sm"
            >
              <span className="hidden sm:inline">
                Delete Selected{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </span>
              <span className="sm:hidden">
                Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
          {/* Row 1: Read status filter + Select all */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter tabs */}
            <div className="flex gap-2">
              {['all', 'unread', 'read'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Select all */}
            {notifications.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 sm:w-[18px] sm:h-[18px] cursor-pointer accent-blue-600 rounded"
                />
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                  {selectedIds.length > 0
                    // ? `Selected ${selectedIds.length} of ${pagination.total}`
                    // : `Select All ${pagination.total > pagination.limit ? `(${notifications.length} of ${pagination.total})` : `(${notifications.length})`}`}
                ? `Selected ${selectedIds.length} of ${pagination.total}`
                    : `Select All ${selectedIds.length} of ${pagination.total}`}
                    </span>
              </label>
            )}
          </div>

          {/* Row 2: Priority filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium shrink-0">Priority:</span>
            {['all', 'low', 'medium', 'high', 'critical'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors ${
                  priorityFilter === p
                    ? p === 'critical'
                      ? 'bg-red-600 text-white'
                      : p === 'high'
                        ? 'bg-amber-500 text-white'
                        : p === 'medium'
                          ? 'bg-blue-600 text-white'
                          : p === 'low'
                            ? 'bg-slate-500 text-white'
                            : 'bg-gray-800 text-white'
                    : p === 'critical'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : p === 'high'
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : p === 'medium'
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          : p === 'low'
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Notification Cards ── */}
      {notifications.length > 0 ? (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const typeStyle = getTypeStyle(notification.type)
            const IconComponent = typeStyle.icon
            const isSelected = selectedIds.includes(notification._id)

            return (
              <div
                key={notification._id}
                onClick={() => openNotification(notification)}
                className={`
                  bg-white rounded-xl shadow-sm border transition-all duration-200 cursor-pointer
                  hover:shadow-md hover:-translate-y-px
                  ${notification.isRead ? 'border-gray-200' : 'border-l-4 border-l-blue-500 border-gray-200'}
                  ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : ''}
                  ${!notification.isRead && !isSelected ? 'bg-blue-50/40' : ''}
                `}
              >
                <div className="p-3 sm:p-4 relative">
                  {/* Timestamp — top-right corner on desktop */}
                  <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 absolute top-3 right-28 sm:top-4 sm:right-4" title={formatDate(notification.createdAt)}>
                    <FiClock className="w-3 h-3" />
                    {formatFullDate(notification.createdAt)}
                  </span>

                  {/* Main row: checkbox + icon + content + delete */}
                  <div className="flex items-start gap-2 sm:gap-3 sm:pr-44">

                    {/* Checkbox */}
                    <div
                      className="flex items-center pt-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(notification._id, e)}
                        className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                      />
                    </div>

                    {/* Icon — hidden on very small screens */}
                    <div
                      className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${typeStyle.bgClass}`}
                    >
                      <IconComponent className={`w-4 h-4 ${typeStyle.colorClass}`} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {/* Type badge — icon visible on mobile */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeStyle.bgClass} ${typeStyle.colorClass}`}>
                          <IconComponent className="w-3 h-3 sm:hidden" />
                          {typeStyle.label || notification.type.replace('_', ' ')}
                        </span>

                        {/* Priority badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getPriorityStyle(notification.priority)}`}>
                          {notification.priority}
                        </span>

                        {/* Unread dot */}
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug mb-1 truncate">
                        {notification.title}
                      </h3>

                      {/* Message — 2 lines max */}
                      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed line-clamp-2">
                        {highlightMessage(notification.message, notification.metadata)}
                      </p>

                      {/* Mobile timestamp row */}
                      <div className="flex items-center justify-between mt-2 sm:hidden">
                        <span className="flex items-center gap-1 text-xs text-gray-400" title={formatDate(notification.createdAt)}>
                          <FiClock className="w-3 h-3" />
                          {formatFullDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div
                      className="shrink-0 self-start"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Desktop: text button */}
                      <button
                        type="button"
                        onClick={() => deleteNotification(notification._id)}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                      {/* Mobile: icon-only button */}
                      <button
                        type="button"
                        onClick={() => deleteNotification(notification._id)}
                        className="sm:hidden flex items-center justify-center w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <FiBell className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">No Notifications</h3>
            <p className="text-sm text-gray-500">You're all caught up! No notifications yet.</p>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.total > pagination.limit && (
        <div className="mt-4 sm:mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
        </div>
      )}

      {/* ── Delete Selected Modal ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Selected Notifications"
        size="sm"
      >
        <div className="py-2">
          <div className="flex items-start gap-3 mb-4 p-3 bg-red-50 rounded-lg">
            <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
              <FiTrash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Delete Selected Notifications?</h4>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-red-600">{selectedIds.length}</span>{' '}
            selected notification{selectedIds.length !== 1 ? 's' : ''}?
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={deleteSelectedNotifications}
              loading={deleting}
              className="w-full sm:w-auto"
            >
              Delete {selectedIds.length} Notification{selectedIds.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Notification Detail Modal ── */}
      <Modal
        isOpen={!!viewingNotification}
        onClose={() => setViewingNotification(null)}
        title={viewingNotification?.title || 'Notification'}
        size="md"
      >
        {viewingNotification && (() => {
          const typeStyle = getTypeStyle(viewingNotification.type)
          const IconComponent = typeStyle.icon

          return (
            <div className="py-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium ${typeStyle.bgClass} ${typeStyle.colorClass}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                  {typeStyle.label || viewingNotification.type.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize ${getPriorityStyle(viewingNotification.priority)}`}>
                  {viewingNotification.priority} Priority
                </span>
                {viewingNotification.isRead ? (
                  <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs sm:text-sm font-medium">
                    ✓ Read
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs sm:text-sm font-medium">
                    Unread
                  </span>
                )}
              </div>

              {/* Message body */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  {highlightMessage(viewingNotification.message, viewingNotification.metadata)}
                </p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 mb-6">
                <FiClock className="w-3.5 h-3.5 shrink-0" />
                {formatFullDate(viewingNotification.createdAt)}
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t border-gray-100 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setViewingNotification(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  icon={FiTrash2}
                  onClick={() => deleteNotification(viewingNotification._id)}
                  className="w-full sm:w-auto"
                >
                  Delete Notification
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </PageContainer>
  )
}

