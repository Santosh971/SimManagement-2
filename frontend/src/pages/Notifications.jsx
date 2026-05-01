// import { useState, useEffect } from 'react'
// import { useAuth } from '../context/AuthContext'
// import {
//   FiBell,
//   FiCheck,
//   FiTrash2,
//   FiAlertCircle,
//   FiClock,
//   FiCreditCard,
//   FiInfo,
//   FiX,
// } from 'react-icons/fi'
// import toast from 'react-hot-toast'
// import {
//   PageContainer,
//   PageHeader,
//   Card,
//   CardBody,
//   Badge,
//   Button,
//   Spinner,
//   Pagination,
//   Modal,
// } from '../components/ui'

// // Plan names to highlight (known from the app)
// const PLAN_NAMES = ['Starter', 'Standard', 'Professional', 'Enterprise', 'Basic', 'Premium', 'Free', 'Pro']

// /**
//  * highlightMessage - Parses notification message and returns JSX with highlighted entities
//  * @param {string} message - The notification message text
//  * @param {object} metadata - Optional metadata with entity references
//  * @returns {Array} Array of React elements (strings and styled spans)
//  */
// function highlightMessage(message, metadata = {}) {
//   if (!message) return [message]

//   // Track which positions have been highlighted to avoid overlaps
//   const highlights = []

//   // 1. COMPANY NAMES - Bold + Blue (#2563eb)
//   // First check metadata for company name
//   if (metadata.companyName) {
//     const companyRegex = new RegExp(`(${escapeRegex(metadata.companyName)})`, 'gi')
//     let match
//     while ((match = companyRegex.exec(message)) !== null) {
//       highlights.push({
//         start: match.index,
//         end: match.index + match[0].length,
//         type: 'company',
//         text: match[0],
//       })
//     }
//   }

//   // Also match capitalized multi-word proper nouns after "for", "of", "to"
//   const companyPattern = /(?:for|of|to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/g
//   let match
//   while ((match = companyPattern.exec(message)) !== null) {
//     const start = match.index + match[0].indexOf(match[1])
//     const end = start + match[1].length
//     if (!highlights.some(h => (start >= h.start && start < h.end) || (end > h.start && end <= h.end))) {
//       highlights.push({ start, end, type: 'company', text: match[1] })
//     }
//   }

//   // 2. RUPEE AMOUNTS - Bold + Green (#16a34a)
//   const amountPattern = /₹[\d,]+/g
//   while ((match = amountPattern.exec(message)) !== null) {
//     if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
//       highlights.push({ start: match.index, end: match.index + match[0].length, type: 'amount', text: match[0] })
//     }
//   }

//   // 3. PHONE/SIM NUMBERS - Bold + Purple (#7c3aed)
//   const phonePattern = /(\+91\d{10}|[6-9]\d{9})/g
//   while ((match = phonePattern.exec(message)) !== null) {
//     if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
//       highlights.push({ start: match.index, end: match.index + match[0].length, type: 'phone', text: match[0] })
//     }
//   }

//   // 4. DATES - Bold + Amber (#d97706)
//   // Common date formats: "20 April 2026", "Nov 2031", "20/04/2026", "April 20, 2026"
//   const datePattern = /(\d{1,2}?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}?,?\s*\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi
//   while ((match = datePattern.exec(message)) !== null) {
//     const matchedText = match[0]
//     if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
//       highlights.push({ start: match.index, end: match.index + matchedText.length, type: 'date', text: matchedText })
//     }
//   }

//   // 5. STATUS WORDS
//   const statusPatterns = [
//     { words: ['Active', 'Enabled', 'Activated'], type: 'status-success' },
//     { words: ['Inactive', 'Disabled', 'Expired', 'Suspended', 'Deactivated'], type: 'status-danger' },
//     { words: ['Pending', 'Processing'], type: 'status-warning' },
//   ]

//   statusPatterns.forEach(({ words, type }) => {
//     words.forEach(word => {
//       const wordRegex = new RegExp(`\\b(${word})\\b`, 'gi')
//       while ((match = wordRegex.exec(message)) !== null) {
//         if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
//           highlights.push({ start: match.index, end: match.index + match[0].length, type, text: match[0] })
//         }
//       }
//     })
//   })

//   // 6. QUOTA/LIMIT NUMBERS - Bold + Cyan (#0891b2)
//   const quotaPattern = /(\d+)\s+(SIMs?|users?|records?|recharges?|entries?)/gi
//   while ((match = quotaPattern.exec(message)) !== null) {
//     if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
//       highlights.push({ start: match.index, end: match.index + match[0].length, type: 'quota', text: match[0] })
//     }
//   }

//   // 7. PLAN NAMES - Bold + Italic + Purple (#7c3aed)
//   PLAN_NAMES.forEach(planName => {
//     const planRegex = new RegExp(`\\b(${planName})\\b`, 'gi')
//     while ((match = planRegex.exec(message)) !== null) {
//       if (!highlights.some(h => match.index >= h.start && match.index < h.end)) {
//         highlights.push({ start: match.index, end: match.index + match[0].length, type: 'plan', text: match[0] })
//       }
//     }
//   })

//   // Sort highlights by start position
//   highlights.sort((a, b) => a.start - b.start)

//   // Build result array
//   if (highlights.length === 0) return [message]

//   const result = []
//   let lastEnd = 0

//   highlights.forEach((highlight, index) => {
//     // Add text before this highlight
//     if (highlight.start > lastEnd) {
//       result.push(message.slice(lastEnd, highlight.start))
//     }
//     // Add the highlighted span
//     result.push(
//       <HighlightSpan key={index} type={highlight.type} text={highlight.text} />
//     )
//     lastEnd = highlight.end
//   })

//   // Add remaining text after last highlight
//   if (lastEnd < message.length) {
//     result.push(message.slice(lastEnd))
//   }

//   return result
// }

// // Helper to escape regex special characters
// function escapeRegex(string) {
//   return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// }

// // Component for highlighted spans
// function HighlightSpan({ type, text }) {
//   const styles = {
//     company: { fontWeight: '600', color: '#2563eb' },
//     amount: { fontWeight: '600', color: '#16a34a' },
//     phone: { fontWeight: '600', color: '#7c3aed' },
//     date: { fontWeight: '600', color: '#d97706' },
//     'status-success': { fontWeight: '600', color: '#16a34a' },
//     'status-danger': { fontWeight: '600', color: '#dc2626' },
//     'status-warning': { fontWeight: '600', color: '#d97706' },
//     quota: { fontWeight: '600', color: '#0891b2' },
//     plan: { fontWeight: '600', fontStyle: 'italic', color: '#7c3aed' },
//   }

//   const style = styles[type] || {}

//   return <span style={style}>{text}</span>
// }

// // Format full date for modal
// function formatFullDate(dateString) {
//   const date = new Date(dateString)
//   return date.toLocaleString('en-IN', {
//     day: 'numeric',
//     month: 'long',
//     year: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//     hour12: true,
//   })
// }

// export default function Notifications() {
//   const { api } = useAuth()
//   const [notifications, setNotifications] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [filter, setFilter] = useState('all')
//   const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
//   const [showDeleteModal, setShowDeleteModal] = useState(false)
//   const [deleting, setDeleting] = useState(false)
//   const [selectedIds, setSelectedIds] = useState([])
//   const [viewingNotification, setViewingNotification] = useState(null)

//   useEffect(() => {
//     fetchNotifications()
//   }, [pagination.page])

//   // Reset to page 1 when filter changes
//   useEffect(() => {
//     if (pagination.page === 1) {
//       fetchNotifications()
//     } else {
//       setPagination((prev) => ({ ...prev, page: 1 }))
//     }
//   }, [filter])

//   // Clear selection when notifications change
//   useEffect(() => {
//     setSelectedIds([])
//   }, [filter, pagination.page])

//   const fetchNotifications = async () => {
//     try {
//       setLoading(true)
//       const params = new URLSearchParams({
//         page: pagination.page,
//         limit: pagination.limit,
//         ...(filter === 'unread' && { isRead: 'false' }),
//         ...(filter === 'read' && { isRead: 'true' }),
//       })

//       const response = await api.get(`/notifications?${params}`)
//       setNotifications(response.data.data || [])
//       setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
//     } catch (error) {
//       toast.error('Failed to fetch notifications')
//       setNotifications([])
//     } finally {
//       setLoading(false)
//     }
//   }

//   const markAsRead = async (id) => {
//     try {
//       await api.patch(`/notifications/${id}/read`)
//       setNotifications((prev) =>
//         prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
//       )
//     } catch (error) {
//       console.error('Failed to mark notification as read:', error)
//     }
//   }

//   // Open notification in modal and auto-mark as read
//   const openNotification = async (notification) => {
//     setViewingNotification(notification)

//     // Auto-mark as read if not already read
//     if (!notification.isRead) {
//       await markAsRead(notification._id)
//     }
//   }

//   const markAllAsRead = async () => {
//     try {
//       await api.post('/notifications/mark-all-read')
//       setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
//       toast.success('All notifications marked as read')
//     } catch (error) {
//       toast.error('Failed to mark all as read')
//     }
//   }

//   const deleteNotification = async (id) => {
//     try {
//       await api.delete(`/notifications/${id}`)
//       setNotifications((prev) => prev.filter((n) => n._id !== id))
//       setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
//       setSelectedIds((prev) => prev.filter((i) => i !== id))

//       // Close modal if viewing the deleted notification
//       if (viewingNotification && viewingNotification._id === id) {
//         setViewingNotification(null)
//       }

//       toast.success('Notification deleted')
//     } catch (error) {
//       toast.error('Failed to delete notification')
//     }
//   }

//   // Checkbox handlers
//   const handleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedIds(notifications.map((n) => n._id))
//     } else {
//       setSelectedIds([])
//     }
//   }

//   const handleSelectOne = (id, e) => {
//     e.stopPropagation() // Prevent opening modal when clicking checkbox
//     setSelectedIds((prev) => {
//       if (prev.includes(id)) {
//         return prev.filter((i) => i !== id)
//       }
//       return [...prev, id]
//     })
//   }

//   const isAllSelected = notifications.length > 0 && selectedIds.length === notifications.length
//   const isIndeterminate = selectedIds.length > 0 && selectedIds.length < notifications.length

//   const deleteSelectedNotifications = async () => {
//     try {
//       setDeleting(true)
//       await api.post('/notifications/delete-selected', { notificationIds: selectedIds })
//       setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n._id)))
//       setPagination((prev) => ({ ...prev, total: prev.total - selectedIds.length }))
//       const deletedCount = selectedIds.length
//       setSelectedIds([])
//       toast.success(`${deletedCount} notification${deletedCount > 1 ? 's' : ''} deleted`)
//       setShowDeleteModal(false)
//     } catch (error) {
//       toast.error('Failed to delete notifications')
//     } finally {
//       setDeleting(false)
//     }
//   }

//   const getTypeStyle = (type) => {
//     const styles = {
//       recharge_due: { bg: '#fffbeb', color: '#d97706', icon: FiCreditCard, label: 'Recharge Due' },
//       inactive_sim: { bg: '#fef2f2', color: '#dc2626', icon: FiAlertCircle, label: 'Inactive SIM' },
//       subscription_expiry: { bg: '#eff6ff', color: '#2563eb', icon: FiClock, label: 'Subscription' },
//       system: { bg: '#f1f5f9', color: '#475569', icon: FiInfo, label: 'System' },
//       alert: { bg: '#fef2f2', color: '#dc2626', icon: FiAlertCircle, label: 'Alert' },
//       info: { bg: '#eff6ff', color: '#2563eb', icon: FiInfo, label: 'Info' },
//     }
//     return styles[type] || styles.info
//   }

//   const getPriorityStyle = (priority) => {
//     const styles = {
//       low: { bg: '#f1f5f9', color: '#475569' },
//       medium: { bg: '#eff6ff', color: '#2563eb' },
//       high: { bg: '#fffbeb', color: '#d97706' },
//       critical: { bg: '#fef2f2', color: '#dc2626' },
//     }
//     return styles[priority] || styles.medium
//   }

//   const formatDate = (dateString) => {
//     const date = new Date(dateString)
//     const now = new Date()
//     const diffMs = now - date
//     const diffMins = Math.floor(diffMs / 60000)
//     const diffHours = Math.floor(diffMins / 60)
//     const diffDays = Math.floor(diffHours / 24)

//     if (diffDays > 0) return `${diffDays}d ago`
//     if (diffHours > 0) return `${diffHours}h ago`
//     if (diffMins > 0) return `${diffMins}m ago`
//     return 'Just now'
//   }

//   if (loading) {
//     return (
//       <PageContainer>
//         <Spinner size="lg" />
//       </PageContainer>
//     )
//   }

//   return (
//     <PageContainer>
//       <PageHeader
//         title="Notifications"
//         description="View and manage your notifications"
//         action={
//           <div style={{ display: 'flex', gap: '8px' }}>
//             <Button variant="secondary" icon={FiCheck} onClick={markAllAsRead}>
//               Mark All as Read
//             </Button>
//             <Button
//               variant="danger"
//               icon={FiTrash2}
//               onClick={() => setShowDeleteModal(true)}
//               disabled={selectedIds.length === 0}
//             >
//               Delete Selected {selectedIds.length > 0 && `(${selectedIds.length})`}
//             </Button>
//           </div>
//         }
//       />

//       {/* Filters and Select All */}
//       <Card style={{ marginBottom: '24px' }}>
//         <CardBody>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
//             <div style={{ display: 'flex', gap: '8px' }}>
//               {['all', 'unread', 'read'].map((f) => (
//                 <button
//                   key={f}
//                   onClick={() => setFilter(f)}
//                   style={{
//                     padding: '8px 16px',
//                     border: 'none',
//                     borderRadius: '8px',
//                     backgroundColor: filter === f ? '#2563eb' : '#f1f5f9',
//                     color: filter === f ? '#ffffff' : '#475569',
//                     cursor: 'pointer',
//                     fontSize: '14px',
//                     textTransform: 'capitalize',
//                   }}
//                 >
//                   {f}
//                 </button>
//               ))}
//             </div>
//             {notifications.length > 0 && (
//               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
//                 <input
//                   type="checkbox"
//                   checked={isAllSelected}
//                   ref={(el) => {
//                     if (el) el.indeterminate = isIndeterminate
//                   }}
//                   onChange={handleSelectAll}
//                   style={{
//                     width: '18px',
//                     height: '18px',
//                     cursor: 'pointer',
//                     accentColor: '#2563eb',
//                   }}
//                 />
//                 <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
//                   Select All ({notifications.length})
//                 </span>
//               </label>
//             )}
//           </div>
//         </CardBody>
//       </Card>

//       {/* Notifications List */}
//       {notifications.length > 0 ? (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//           {notifications.map((notification) => {
//             const typeStyle = getTypeStyle(notification.type)
//             const priorityStyle = getPriorityStyle(notification.priority)
//             const IconComponent = typeStyle.icon
//             const isSelected = selectedIds.includes(notification._id)

//             return (
//               <Card
//                 key={notification._id}
//                 onClick={() => openNotification(notification)}
//                 style={{
//                   borderLeft: notification.isRead ? 'none' : '4px solid #2563eb',
//                   backgroundColor: isSelected ? '#eff6ff' : (notification.isRead ? '#ffffff' : '#f0f7ff'),
//                   transition: 'all 0.2s',
//                   cursor: 'pointer',
//                 }}
//               >
//                 <CardBody>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
//                     {/* Checkbox */}
//                     <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '4px' }} onClick={(e) => e.stopPropagation()}>
//                       <input
//                         type="checkbox"
//                         checked={isSelected}
//                         onChange={(e) => handleSelectOne(notification._id, e)}
//                         style={{
//                           width: '18px',
//                           height: '18px',
//                           cursor: 'pointer',
//                           accentColor: '#2563eb',
//                         }}
//                       />
//                     </div>
//                     {/* Content */}
//                     <div style={{ flex: 1 }}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
//                         <span style={{
//                           display: 'inline-flex',
//                           alignItems: 'center',
//                           gap: '4px',
//                           padding: '4px 8px',
//                           borderRadius: '4px',
//                           backgroundColor: typeStyle.bg,
//                           color: typeStyle.color,
//                           fontSize: '12px',
//                           textTransform: 'capitalize',
//                         }}>
//                           <IconComponent style={{ width: '12px', height: '12px' }} />
//                           {typeStyle.label || notification.type.replace('_', ' ')}
//                         </span>
//                         <span style={{
//                           padding: '4px 8px',
//                           borderRadius: '4px',
//                           backgroundColor: priorityStyle.bg,
//                           color: priorityStyle.color,
//                           fontSize: '12px',
//                           textTransform: 'capitalize',
//                         }}>
//                           {notification.priority}
//                         </span>
//                         {!notification.isRead && (
//                           <span style={{
//                             width: '8px',
//                             height: '8px',
//                             backgroundColor: '#2563eb',
//                             borderRadius: '50%',
//                           }} />
//                         )}
//                       </div>
//                       <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '4px', margin: 0 }}>
//                         {notification.title}
//                       </h3>
//                       <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.5, margin: '4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
//                         {highlightMessage(notification.message, notification.metadata)}
//                       </p>
//                       <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
//                         <FiClock style={{ width: '12px', height: '12px' }} />
//                         {formatDate(notification.createdAt)}
//                       </p>
//                     </div>
//                     {/* Actions */}
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
//                       <Button
//                         variant="danger"
//                         size="sm"
//                         onClick={(e) => {
//                           e.stopPropagation()
//                           deleteNotification(notification._id)
//                         }}
//                         icon={FiTrash2}
//                       >
//                         Delete
//                       </Button>
//                     </div>
//                   </div>
//                 </CardBody>
//               </Card>
//             )
//           })}
//         </div>
//       ) : (
//         <Card>
//           <CardBody>
//             <div style={{ padding: '48px', textAlign: 'center' }}>
              
//               <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Notifications</h3>
//               <p style={{ color: '#6b7280' }}>You're all caught up! No notifications yet.</p>
//             </div>
//           </CardBody>
//         </Card>
//       )}

//       {/* Pagination */}
//       {pagination.total > pagination.limit && (
//         <Pagination
//           currentPage={pagination.page}
//           totalPages={Math.ceil(pagination.total / pagination.limit)}
//           total={pagination.total}
//           onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
//         />
//       )}

//       {/* Delete Selected Confirmation Modal */}
//       <Modal
//         isOpen={showDeleteModal}
//         onClose={() => setShowDeleteModal(false)}
//         title="Delete Selected Notifications"
//         size="sm"
//       >
//         <div style={{ padding: '16px 0' }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
//             <div style={{
//               width: '48px',
//               height: '48px',
//               borderRadius: '50%',
//               backgroundColor: '#fef2f2',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//               <FiTrash2 style={{ width: '24px', height: '24px', color: '#dc2626' }} />
//             </div>
//             <div>
//               <h4 style={{ margin: 0, fontWeight: '600', color: '#111827' }}>Delete Selected Notifications?</h4>
//               <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
//                 This action cannot be undone.
//               </p>
//             </div>
//           </div>
//           <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
//             Are you sure you want to delete {selectedIds.length} selected notification{selectedIds.length !== 1 ? 's' : ''}?
//           </p>
//           <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
//             <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
//               Cancel
//             </Button>
//             <Button
//               variant="danger"
//               onClick={deleteSelectedNotifications}
//               loading={deleting}
//             >
//               Delete {selectedIds.length} Notification{selectedIds.length !== 1 ? 's' : ''}
//             </Button>
//           </div>
//         </div>
//       </Modal>

//       {/* Notification Detail Modal */}
//       <Modal
//         isOpen={!!viewingNotification}
//         onClose={() => setViewingNotification(null)}
//         title={viewingNotification?.title || 'Notification'}
//         size="md"
//       >
//         {viewingNotification && (() => {
//           const typeStyle = getTypeStyle(viewingNotification.type)
//           const priorityStyle = getPriorityStyle(viewingNotification.priority)
//           const IconComponent = typeStyle.icon

//           return (
//             <div style={{ padding: '8px 0' }}>
//               {/* Type and Priority Badges */}
//               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
//                 <span style={{
//                   display: 'inline-flex',
//                   alignItems: 'center',
//                   gap: '6px',
//                   padding: '6px 12px',
//                   borderRadius: '6px',
//                   backgroundColor: typeStyle.bg,
//                   color: typeStyle.color,
//                   fontSize: '13px',
//                   fontWeight: '500',
//                   textTransform: 'capitalize',
//                 }}>
//                   <IconComponent style={{ width: '14px', height: '14px' }} />
//                   {typeStyle.label || viewingNotification.type.replace('_', ' ')}
//                 </span>
//                 <span style={{
//                   padding: '6px 12px',
//                   borderRadius: '6px',
//                   backgroundColor: priorityStyle.bg,
//                   color: priorityStyle.color,
//                   fontSize: '13px',
//                   fontWeight: '500',
//                   textTransform: 'capitalize',
//                 }}>
//                   {viewingNotification.priority} Priority
//                 </span>
//                 {viewingNotification.isRead ? (
//                   <span style={{
//                     padding: '6px 12px',
//                     borderRadius: '6px',
//                     backgroundColor: '#dcfce7',
//                     color: '#16a34a',
//                     fontSize: '13px',
//                     fontWeight: '500',
//                   }}>
//                     ✓ Read
//                   </span>
//                 ) : (
//                   <span style={{
//                     padding: '6px 12px',
//                     borderRadius: '6px',
//                     backgroundColor: '#eff6ff',
//                     color: '#2563eb',
//                     fontSize: '13px',
//                     fontWeight: '500',
//                   }}>
//                     Unread
//                   </span>
//                 )}
//               </div>

//               {/* Message Content */}
//               <div style={{
//                 backgroundColor: '#f8fafc',
//                 borderRadius: '8px',
//                 padding: '16px',
//                 marginBottom: '16px',
//               }}>
//                 <p style={{
//                   color: '#334155',
//                   fontSize: '15px',
//                   lineHeight: 1.7,
//                   margin: 0,
//                 }}>
//                   {highlightMessage(viewingNotification.message, viewingNotification.metadata)}
//                 </p>
//               </div>

//               {/* Timestamp */}
//               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', color: '#64748b', fontSize: '13px' }}>
//                 <FiClock style={{ width: '14px', height: '14px' }} />
//                 <span>{formatFullDate(viewingNotification.createdAt)}</span>
//               </div>

//               {/* Actions */}
//               <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
//                 <Button variant="secondary" onClick={() => setViewingNotification(null)}>
//                   Close
//                 </Button>
//                 <Button
//                   variant="danger"
//                   icon={FiTrash2}
//                   onClick={() => {
//                     deleteNotification(viewingNotification._id)
//                   }}
//                 >
//                   Delete Notification
//                 </Button>
//               </div>
//             </div>
//           )
//         })()}
//       </Modal>
//     </PageContainer>
//   )
// }



import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
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
    { words: ['Inactive', 'Disabled', 'Expired', 'Suspended', 'Deactivated'], type: 'status-danger' },
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
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function Notifications() {
  const { api } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
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
  }, [filter])

  useEffect(() => { setSelectedIds([]) }, [filter, pagination.page])

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

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      setSelectedIds((prev) => prev.filter((i) => i !== id))
      if (viewingNotification?._id === id) setViewingNotification(null)
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

  const deleteSelectedNotifications = async () => {
    try {
      setDeleting(true)
      await api.post('/notifications/delete-selected', { notificationIds: selectedIds })
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n._id)))
      setPagination((prev) => ({ ...prev, total: prev.total - selectedIds.length }))
      const count = selectedIds.length
      setSelectedIds([])
      toast.success(`${count} notification${count > 1 ? 's' : ''} deleted`)
      setShowDeleteModal(false)
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
              <FiBell className="text-blue-600 shrink-0" />
              Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage your notifications</p>
          </div>

          {/* Header action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              icon={FiCheck}
              onClick={markAllAsRead}
              className="text-sm"
            >
              <span className="hidden xs:inline">Mark All as Read</span>
              <span className="xs:hidden">Mark Read</span>
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
                Select All ({notifications.length})
              </span>
            </label>
          )}
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
                <div className="p-3 sm:p-4">
                  {/* Top row: checkbox + badges + time + delete */}
                  <div className="flex items-start gap-2 sm:gap-3">

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

                        {/* Timestamp pushed to the right on larger screens */}
                        <span className="hidden sm:flex items-center gap-1 ml-auto text-xs text-gray-400">
                          <FiClock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
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
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <FiClock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
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