import { useState, useEffect } from 'react'
import { FiX, FiSend, FiSmartphone, FiUser, FiAlertCircle, FiPhone, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function SendMessageModal({ isOpen, onClose, onSuccess }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [recipients, setRecipients] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [updateSimStatus, setUpdateSimStatus] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  // Fetch eligible recipients
  useEffect(() => {
    if (isOpen) {
      fetchRecipients()
    } else {
      setSelectedIds([])
      setMessage('')
      setSearch('')
      setUpdateSimStatus(false)
      setShowSetup(false)
      setLoading(false)
    }
  }, [isOpen])

  const fetchRecipients = async () => {
    try {
      const response = await api.get('/whatsapp/recipients')
      const { sims, users } = response.data.data

      // Combine SIMs and Users into unified recipients list
      const combinedRecipients = []

      // Add SIMs
      sims.forEach((sim) => {
        combinedRecipients.push({
          id: `sim_${sim._id}`,
          _id: sim._id,
          type: 'sim',
          phoneNumber: sim.mobileNumber,
          name: sim.assignedTo?.name || 'Unassigned',
          operator: sim.operator,
          status: sim.status,
          email: sim.assignedTo?.email || '',
        })
      })

      // Add Users
      users.forEach((user) => {
        // Check if this phone number already exists (avoid duplicates)
        const existingPhone = combinedRecipients.find(
          (r) => r.phoneNumber === user.phone
        )

        if (!existingPhone) {
          combinedRecipients.push({
            id: `user_${user._id}`,
            _id: user._id,
            type: 'user',
            phoneNumber: user.phone,
            name: user.name,
            operator: '',
            status: 'active',
            email: user.email,
          })
        }
      })

      setRecipients(combinedRecipients)
    } catch (error) {
      console.error('Failed to fetch recipients:', error)
      toast.error('Failed to load recipients')
    }
  }

  // Filter recipients based on search
  const filteredRecipients = recipients.filter((recipient) => {
    if (!search.trim()) return true
    const searchLower = search.trim().toLowerCase()
    return (
      recipient.phoneNumber.toLowerCase().includes(searchLower) ||
      recipient.name.toLowerCase().includes(searchLower) ||
      recipient.operator?.toLowerCase().includes(searchLower) ||
      recipient.email?.toLowerCase().includes(searchLower)
    )
  })

  // Toggle selection
  const toggleRecipient = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedIds.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRecipients.map((r) => r.id))
    }
  }

  // Get selected recipients for sending
  const getSelectedForSending = () => {
    const simIds = []
    const userIds = []

    selectedIds.forEach((id) => {
      const recipient = recipients.find((r) => r.id === id)
      if (recipient) {
        if (recipient.type === 'sim') {
          simIds.push(recipient._id)
        } else {
          userIds.push(recipient._id)
        }
      }
    })

    return { simIds, userIds }
  }

  // Handle send
  const handleSend = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (message.trim().length < 10) {
      toast.error('Message must be at least 10 characters')
      return
    }

    if (message.length > 4096) {
      toast.error('Message cannot exceed 4096 characters')
      return
    }

    setLoading(true)
    try {
      const { simIds, userIds } = getSelectedForSending()

      const response = await api.post('/whatsapp/send-bulk', {
        simIds,
        userIds,
        message: message.trim(),
        updateSimStatus,
      })

      toast.success(`Messages sent: ${response.data.data.sent}, Failed: ${response.data.data.failed}`)

      // Reset form
      setSelectedIds([])
      setMessage('')
      setUpdateSimStatus(false)

      if (onSuccess) {
        onSuccess(response.data.data)
      }
      onClose()
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send messages'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Count by type
  const selectedSimsCount = selectedIds.filter((id) => id.startsWith('sim_')).length
  const selectedUsersCount = selectedIds.filter((id) => id.startsWith('user_')).length

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            backgroundColor: '#fff',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiSend style={{ color: '#25d366' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Send WhatsApp Message
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Setup Guide */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              marginBottom: '20px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setShowSetup(!showSetup)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#166534',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
                <span>Initial WhatsApp Setup (Testing / Trial Environment)</span>
              </div>
              {showSetup ? <FiChevronUp style={{ width: '18px', height: '18px', flexShrink: 0 }} /> : <FiChevronDown style={{ width: '18px', height: '18px', flexShrink: 0 }} />}
            </button>

            {showSetup && (
              <div style={{ padding: '0 16px 16px', fontSize: '13px', color: '#1f2937' }}>
                <p style={{ margin: '0 0 12px 0', color: '#374151' }}>
                  Before receiving WhatsApp messages from the platform during the testing phase, recipients need to complete a <strong>one-time WhatsApp verification</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: '#166534', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '600', flexShrink: 0, marginTop: '1px',
                    }}>
                      1
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Save the Twilio WhatsApp Number
                      </div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        backgroundColor: '#fff', padding: '8px 14px', borderRadius: '8px',
                        border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '15px', fontWeight: '600',
                      }}>
                        <FiPhone style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                        +1 (415) 523-8886
                      </div>
                      <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '12px' }}>
                        Add this number to your mobile contacts
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: '#166534', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '600', flexShrink: 0, marginTop: '1px',
                    }}>
                      2
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Send the Verification Message
                      </div>
                      <div style={{ color: '#374151', marginBottom: '4px' }}>
                        Open WhatsApp and send this exact message to the saved number:
                      </div>
                      <div style={{
                        display: 'inline-block',
                        backgroundColor: '#fff', padding: '8px 14px', borderRadius: '8px',
                        border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '15px', fontWeight: '600',
                        letterSpacing: '0.5px',
                      }}>
                        join chair-tropical
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: '#166534', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '600', flexShrink: 0, marginTop: '1px',
                    }}>
                      3
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Verification Complete
                      </div>
                      <div style={{ color: '#374151' }}>
                        Once verification is successful, the recipient is connected to the platform's WhatsApp testing environment and can receive messages.
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: '#166534', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '600', flexShrink: 0, marginTop: '1px',
                    }}>
                      4
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Receive Activity Check Messages
                      </div>
                      <div style={{ color: '#374151' }}>
                        After verification, whenever the admin sends a WhatsApp activity check, the user will receive messages directly on WhatsApp.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow */}
                <div style={{
                  backgroundColor: '#fff', borderRadius: '8px',
                  border: '1px solid #d1d5db', padding: '14px 16px',
                }}>
                  <div style={{ fontWeight: '600', color: '#111827', marginBottom: '10px', fontSize: '13px' }}>
                    Message Workflow
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#374151' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>1</span>
                      <span>Admin Sends WhatsApp Message</span>
                    </div>
                    <div style={{ paddingLeft: '12px', color: '#9ca3af' }}>&#x2193;</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>2</span>
                      <span>Employee Receives Message on WhatsApp</span>
                    </div>
                    <div style={{ paddingLeft: '12px', color: '#9ca3af' }}>&#x2193;</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>3</span>
                      <span>Employee Replies &rarr; <strong style={{ color: '#16a34a' }}>SIM Marked Active</strong></span>
                    </div>
                    <div style={{ paddingLeft: '12px', color: '#9ca3af' }}>&#x2193;</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>4</span>
                      <span>No Reply within 1 hour &rarr; <strong style={{ color: '#dc2626' }}>SIM Marked Inactive</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recipients Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                Select Recipients ({selectedIds.length} selected)
              </h3>
              <button
                onClick={toggleSelectAll}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {selectedIds.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by name, Contact Number, or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Recipients List */}
            <div
  style={{
    maxHeight: '280px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  }}
>
  {filteredRecipients.length === 0 ? (
    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      {search ? 'No matching recipients found' : 'No recipients available'}
    </div>
  ) : (
    filteredRecipients.map((recipient) => (
      <div
        key={recipient.id}
        onClick={() => toggleRecipient(recipient.id)}
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: selectedIds.includes(recipient.id) ? '#eff6ff' : '#fff',
          borderBottom: '1px solid #f3f4f6',
          transition: 'background-color 0.15s',
          gap: '12px',
        }}
      >
        {/* Left: Icon + Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>

          {/* Type Icon */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: recipient.type === 'sim' ? '#dbeafe' : '#dcfce7',
          }}>
            {recipient.type === 'sim' ? (
              <FiSmartphone style={{ width: '16px', height: '16px', color: '#2563eb' }} />
            ) : (
              <FiUser style={{ width: '16px', height: '16px', color: '#16a34a' }} />
            )}
          </div>

          {/* Info */}
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: '500',
                fontSize: '14px',
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {recipient.name}
              </span>
              {recipient.type === 'sim' && recipient.status !== 'active' && (
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  flexShrink: 0,
                }}>
                  {recipient.status}
                </span>
              )}
            </div>

            {/* Phone + Operator row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '3px',
              fontSize: '12px',
              color: '#6b7280',
            }}>
              <FiPhone style={{ width: '11px', height: '11px', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap' }}>{recipient.phoneNumber}</span>
              {recipient.operator && (
                <>
                  <span style={{ color: '#d1d5db' }}>•</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{recipient.operator}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Badge + Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            backgroundColor: recipient.type === 'sim' ? '#eff6ff' : '#f0fdf4',
            color: recipient.type === 'sim' ? '#2563eb' : '#16a34a',
            whiteSpace: 'nowrap',
          }}>
            {recipient.type === 'sim' ? 'SIM' : 'User'}
          </span>
          <input
            type="checkbox"
            checked={selectedIds.includes(recipient.id)}
            onChange={() => toggleRecipient(recipient.id)}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
          />
        </div>
      </div>
    ))
  )}
</div>
            {/* Selection Summary */}
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#475569',
              }}
            >
              {selectedIds.length > 0 ? (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {selectedSimsCount > 0 && (
                    <span>
                      📱 <strong>{selectedSimsCount}</strong> SIM{selectedSimsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {selectedUsersCount > 0 && (
                    <span>
                      👤 <strong>{selectedUsersCount}</strong> User{selectedUsersCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{ color: '#16a34a' }}>
                    → <strong>{selectedIds.length}</strong> unique recipient{selectedIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                'Select recipients from the list above'
              )}
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              Message <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here (minimum 10 characters)..."
              rows={5}
              maxLength={4096}
              style={{
                width: '100%',
                height: '120px',
                padding: '12px 14px',
                border: `1px solid ${message.length > 0 && message.trim().length < 10 ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
                overflow: 'auto',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: '12px',
              }}
            >
              {message.length > 0 && message.trim().length < 10 ? (
                <span style={{ color: '#dc2626' }}>
                  Minimum 10 characters required ({10 - message.trim().length} more needed)
                </span>
              ) : (
                <span />
              )}
              <span style={{ color: message.length > 3800 ? '#dc2626' : '#6b7280' }}>
                {message.length}/4096
              </span>
            </div>
          </div>

          {/* Update SIM Status Option */}
          {/* <div
            style={{
              marginBottom: '20px',
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={updateSimStatus}
                onChange={(e) => setUpdateSimStatus(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px', color: '#111827' }}>
                  Update SIM Status Based on Reply
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  If enabled, SIMs will be marked as <strong>active</strong> if they reply within 1 hour, or <strong>inactive</strong> if no reply. If disabled, only message status will be tracked.
                </div>
              </div>
            </label>
          </div> */}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || selectedIds.length === 0 || message.trim().length < 10}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              background: loading || selectedIds.length === 0 || message.trim().length < 10 ? '#9ca3af' : '#25d366',
              color: '#fff',
              cursor: loading || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FiSend />
            {loading ? 'Sending...' : `Send to ${selectedIds.length} Recipient${selectedIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}