import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FiBell,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiMenu,
  FiCheck,
  FiCreditCard,
  FiAlertCircle,
  FiClock,
  FiInfo,
} from 'react-icons/fi'

export default function Header({ setSidebarOpen }) {
  const { user, logout, api } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    // Fetch unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (notificationOpen) {
      fetchNotifications()
    }
  }, [notificationOpen])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count')
      setUnreadCount(response.data.data?.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch unread count')
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/notifications?limit=5')
      setNotifications(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch notifications')
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
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read')
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: { bg: '#fef2f2', color: '#dc2626' },
      admin: { bg: '#eff6ff', color: '#2563eb' },
      user: { bg: '#f1f5f9', color: '#475569' },
    }
    return badges[role] || badges.user
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

  const formatTime = (dateString) => {
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

  const roleBadge = getRoleBadge(user?.role)

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left - Menu button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <FiMenu style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      {/* Right - Notifications & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} ref={dropdownRef}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => setNotificationOpen(!notificationOpen)}
          >
            <FiBell style={{ width: '20px', height: '20px', color: '#475569' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                minWidth: '16px',
                height: '16px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              marginTop: '8px',
              width: '360px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              zIndex: 50
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontWeight: '600', color: '#0f172a', margin: 0 }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid #e2e8f0',
                      borderTopColor: '#2563eb',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto'
                    }} />
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const typeStyle = getTypeStyle(notification.type)
                    const IconComponent = typeStyle.icon

                    return (
                      <div
                        key={notification._id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: notification.isRead ? 'transparent' : '#f8fafc',
                          cursor: 'pointer'
                        }}
                        onClick={() => !notification.isRead && markAsRead(notification._id)}
                      >
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: typeStyle.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <IconComponent style={{ width: '16px', height: '16px', color: typeStyle.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: '13px',
                              fontWeight: notification.isRead ? '400' : '600',
                              color: '#0f172a',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {notification.title}
                            </p>
                            <p style={{
                              fontSize: '12px',
                              color: '#64748b',
                              margin: '2px 0 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {notification.message}
                            </p>
                            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <span style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#2563eb',
                              borderRadius: '50%',
                              flexShrink: 0,
                              marginTop: '4px'
                            }} />
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    <FiBell style={{ width: '24px', height: '24px', marginBottom: '8px', color: '#94a3b8' }} />
                    <p style={{ margin: 0 }}>No notifications</p>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
                <Link
                  to="/app/notifications"
                  style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none' }}
                  onClick={() => setNotificationOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#eff6ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'none' }} className="md:block">
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a', margin: 0 }}>{user?.name}</p>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: roleBadge.bg,
                color: roleBadge.color
              }}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <FiChevronDown style={{ width: '16px', height: '16px', color: '#64748b' }} className="hidden md:block" />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              marginTop: '8px',
              width: '192px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              zIndex: 50
            }}>
              <Link
                to="/app/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  color: '#1e293b',
                  fontSize: '14px',
                  textDecoration: 'none'
                }}
                onClick={() => setDropdownOpen(false)}
              >
                <FiUser style={{ width: '16px', height: '16px' }} />
                Profile Settings
              </Link>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setDropdownOpen(false)
                  logout()
                }}
              >
                <FiLogOut style={{ width: '16px', height: '16px' }} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .lg\\:hidden { display: none; }
        @media (max-width: 1024px) {
          .lg\\:hidden { display: block; }
        }
        .md\\:block { display: block; }
        .hidden { display: none; }
        @media (min-width: 768px) {
          .md\\:block { display: block; }
        }
        @media (max-width: 768px) {
          .md\\:block { display: none; }
        }
      `}</style>
    </header>
  )
}