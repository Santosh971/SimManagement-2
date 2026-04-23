import { useState, useEffect } from 'react'
import { FiX, FiSend, FiSmartphone, FiAlertCircle, FiLink, FiCheck, FiCopy, FiMail, FiUsers } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function SendMessageModal({ isOpen, onClose, onSuccess }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sims, setSims] = useState([]) // Linked SIMs for sending
  const [allSIMs, setAllSIMs] = useState([]) // All SIMs for generating links
  const [selectedIds, setSelectedIds] = useState([])
  const [emailSelectedIds, setEmailSelectedIds] = useState([]) // For email tab
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('send') // 'send', 'link', or 'email'

  // Fetch eligible SIMs (with telegramChatId) and all SIMs
  useEffect(() => {
    if (isOpen) {
      fetchSIMs()
    }
  }, [isOpen])

  const fetchSIMs = async () => {
    try {
      // Fetch linked SIMs for sending messages
      const linkedRes = await api.get('/telegram/sims')

      // Fetch ALL SIMs for generating links (use pagination to get all)
      let allSimsData = []
      let page = 1
      const limit = 100
      let hasMore = true

      while (hasMore) {
        const allSimsRes = await api.get('/sims', {
          params: { limit, page, status: 'active' }
        })
        allSimsData = [...allSimsData, ...(allSimsRes.data.data || [])]
        const total = allSimsRes.data.pagination?.total || 0
        hasMore = allSimsData.length < total
        page++
      }

      setSims(linkedRes.data.data || [])
      setAllSIMs(allSimsData)
    } catch (error) {
      console.error('Failed to fetch SIMs:', error)
      toast.error('Failed to load SIMs')
    }
  }

  // Filter SIMs based on search
  const filteredSIMs = sims.filter((sim) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      sim.mobileNumber.toLowerCase().includes(searchLower) ||
      sim.operator?.toLowerCase().includes(searchLower) ||
      sim.assignedTo?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Filter all SIMs for email/link tabs
  const filteredAllSIMs = allSIMs.filter((sim) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      sim.mobileNumber.toLowerCase().includes(searchLower) ||
      sim.operator?.toLowerCase().includes(searchLower) ||
      sim.assignedTo?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Toggle selection for message tab
  const toggleSIM = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Toggle selection for email tab
  const toggleEmailSIM = (id) => {
    setEmailSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Select/Deselect all for message tab
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSIMs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSIMs.map((s) => s._id))
    }
  }

  // Select/Deselect all for email tab
  const toggleEmailSelectAll = () => {
    if (emailSelectedIds.length === filteredAllSIMs.length) {
      setEmailSelectedIds([])
    } else {
      setEmailSelectedIds(filteredAllSIMs.map((s) => s._id))
    }
  }

  // Handle send message
  const handleSend = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one SIM')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (message.length > 4096) {
      toast.error('Message cannot exceed 4096 characters')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/telegram/send-bulk', {
        simIds: selectedIds,
        message: message.trim(),
      })

      toast.success(`Messages sent: ${response.data.data.sent}, Skipped: ${response.data.data.skipped}, Failed: ${response.data.data.failed}`)

      // Reset form
      setSelectedIds([])
      setMessage('')

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

  // Generate link for SIM
  const generateLink = async (simId) => {
    try {
      const response = await api.get(`/telegram/link/${simId}`)
      return response.data.data.deepLink
    } catch (error) {
      console.error('Failed to generate link:', error)
      return null
    }
  }

  // Copy link to clipboard
  const copyLink = async (simId, mobileNumber) => {
    const link = await generateLink(simId)
    if (link) {
      navigator.clipboard.writeText(link)
      toast.success(`Link copied for ${mobileNumber}`)
    } else {
      toast.error('Failed to generate link')
    }
  }

  // Send link to single user via email
  const sendEmailToSingle = async (simId, mobileNumber) => {
    setLoading(true)
    try {
      const response = await api.post('/telegram/send-link-email', { simId })
      toast.success(response.data.message)
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send email'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Send links to all selected users via email (bulk)
  const sendEmailToAll = async () => {
    if (emailSelectedIds.length === 0) {
      toast.error('Please select at least one SIM')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/telegram/send-link-email-bulk', {
        simIds: emailSelectedIds
      })
      toast.success(response.data.message)
      setEmailSelectedIds([])
      fetchSIMs() // Refresh data
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send emails'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '700px',
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
            <FiSend style={{ color: '#0088cc' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Telegram Messages
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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('send')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTab === 'send' ? '2px solid #0088cc' : '2px solid transparent',
              color: activeTab === 'send' ? '#0088cc' : '#6b7280',
              fontWeight: activeTab === 'send' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <FiSend size={14} />
            Send Message
          </button>
          <button
            onClick={() => setActiveTab('link')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTab === 'link' ? '2px solid #0088cc' : '2px solid transparent',
              color: activeTab === 'link' ? '#0088cc' : '#6b7280',
              fontWeight: activeTab === 'link' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <FiLink size={14} />
            Generate Links
          </button>
          <button
            onClick={() => setActiveTab('email')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTab === 'email' ? '2px solid #0088cc' : '2px solid transparent',
              color: activeTab === 'email' ? '#0088cc' : '#6b7280',
              fontWeight: activeTab === 'email' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <FiMail size={14} />
            Send via Email
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Alert */}
          <div
            style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <FiAlertCircle style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '14px', color: '#1e40af' }}>
              {activeTab === 'email' ? (
                <><strong>Email:</strong> Telegram links will be sent to the registered email of assigned users.</>
              ) : (
                <><strong>Telegram Note:</strong> Only SIMs linked to Telegram can receive messages. Use other tabs to send links to users.</>
              )}
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search by mobile number, operator, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* ============= SEND MESSAGE TAB ============= */}
          {activeTab === 'send' && (
            <>
              {/* Select All */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                  Linked SIMs ({selectedIds.length} selected)
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
                  {selectedIds.length === filteredSIMs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* SIMs List */}
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                {filteredSIMs.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    {search ? 'No matching SIMs found' : 'No SIMs linked to Telegram. Use other tabs to send links to users.'}
                  </div>
                ) : (
                  filteredSIMs.map((sim) => (
                    <div
                      key={sim._id}
                      onClick={() => toggleSIM(sim._id)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: selectedIds.includes(sim._id) ? '#eff6ff' : '#fff',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#dbeafe',
                          }}
                        >
                          <FiSmartphone style={{ color: '#2563eb' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '13px' }}>
                            {sim.mobileNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {sim.operator} • {sim.assignedTo?.name || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sim._id)}
                        onChange={() => toggleSIM(sim._id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Message */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  rows={5}
                  maxLength={4096}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '4px',
                    fontSize: '12px',
                    color: message.length > 3800 ? '#dc2626' : '#6b7280',
                  }}
                >
                  {message.length}/4096 characters
                </div>
              </div>
            </>
          )}

          {/* ============= GENERATE LINKS TAB ============= */}
          {activeTab === 'link' && (
            <>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                All SIMs - Generate Telegram Deep Links
              </h3>
              <div
                style={{
                  maxHeight: '350px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                {filteredAllSIMs.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    No SIMs found
                  </div>
                ) : (
                  filteredAllSIMs.map((sim) => (
                    <div
                      key={sim._id}
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: sim.telegramChatId ? '#dcfce7' : '#fef3c7',
                          }}
                        >
                          {sim.telegramChatId ? (
                            <FiCheck style={{ color: '#16a34a' }} />
                          ) : (
                            <FiLink style={{ color: '#d97706' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '13px' }}>
                            {sim.mobileNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {sim.operator} • {sim.telegramChatId ? '✅ Linked' : '⚠️ Not Linked'}
                          </div>
                          {sim.assignedTo?.email && (
                            <div style={{ fontSize: '11px', color: '#16a34a' }}>
                              📧 {sim.assignedTo.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Copy Link Button */}
                        <button
                          onClick={() => copyLink(sim._id, sim.mobileNumber)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            border: '1px solid #0088cc',
                            borderRadius: '6px',
                            background: '#fff',
                            color: '#0088cc',
                            cursor: 'pointer',
                          }}
                          title="Copy link to clipboard"
                        >
                          <FiCopy style={{ width: '14px' }} />
                          Copy
                        </button>
                        {/* Send Email Button */}
                        <button
                          onClick={() => sendEmailToSingle(sim._id, sim.mobileNumber)}
                          disabled={loading || !sim.assignedTo?.email}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            border: '1px solid #16a34a',
                            borderRadius: '6px',
                            background: loading || !sim.assignedTo?.email ? '#e5e7eb' : '#fff',
                            color: loading || !sim.assignedTo?.email ? '#9ca3af' : '#16a34a',
                            cursor: loading || !sim.assignedTo?.email ? 'not-allowed' : 'pointer',
                          }}
                          title={sim.assignedTo?.email ? `Send link to ${sim.assignedTo.email}` : 'No email assigned'}
                        >
                          <FiMail style={{ width: '14px' }} />
                          Email
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ============= SEND VIA EMAIL TAB ============= */}
          {activeTab === 'email' && (
            <>
              {/* Select All */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                  Select SIMs ({emailSelectedIds.length} selected)
                </h3>
                <button
                  onClick={toggleEmailSelectAll}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {emailSelectedIds.length === filteredAllSIMs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* SIMs List for Email */}
              <div
                style={{
                  maxHeight: '280px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                {filteredAllSIMs.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    No SIMs found
                  </div>
                ) : (
                  filteredAllSIMs.map((sim) => (
                    <div
                      key={sim._id}
                      onClick={() => toggleEmailSIM(sim._id)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: emailSelectedIds.includes(sim._id) ? '#eff6ff' : '#fff',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: sim.assignedTo?.email ? '#dcfce7' : '#fef2f2',
                          }}
                        >
                          {sim.assignedTo?.email ? (
                            <FiMail style={{ color: '#16a34a' }} />
                          ) : (
                            <FiAlertCircle style={{ color: '#dc2626' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '13px' }}>
                            {sim.mobileNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {sim.operator} • {sim.assignedTo?.name || 'Unassigned'}
                          </div>
                          <div style={{ fontSize: '11px', color: sim.assignedTo?.email ? '#16a34a' : '#dc2626' }}>
                            {sim.assignedTo?.email || 'No email assigned'}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailSelectedIds.includes(sim._id)}
                        onChange={() => toggleEmailSIM(sim._id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!sim.assignedTo?.email}
                        style={{ width: '16px', height: '16px', cursor: sim.assignedTo?.email ? 'pointer' : 'not-allowed' }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Email Summary */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FiUsers style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    <strong>{emailSelectedIds.length}</strong> SIM{emailSelectedIds.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  Telegram links will be sent to the registered email addresses of assigned users.
                  SIMs without assigned users or email will be skipped.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
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

          {activeTab === 'send' && (
            <button
              onClick={handleSend}
              disabled={loading || selectedIds.length === 0}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                border: 'none',
                borderRadius: '8px',
                background: loading || selectedIds.length === 0 ? '#9ca3af' : '#0088cc',
                color: '#fff',
                cursor: loading || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FiSend />
              {loading ? 'Sending...' : `Send to ${selectedIds.length} SIM${selectedIds.length !== 1 ? 's' : ''}`}
            </button>
          )}

          {activeTab === 'email' && (
            <button
              onClick={sendEmailToAll}
              disabled={loading || emailSelectedIds.length === 0}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                border: 'none',
                borderRadius: '8px',
                background: loading || emailSelectedIds.length === 0 ? '#9ca3af' : '#16a34a',
                color: '#fff',
                cursor: loading || emailSelectedIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FiMail />
              {loading ? 'Sending...' : `Send Email to ${emailSelectedIds.length} User${emailSelectedIds.length !== 1 ? 's' : ''}`}
            </button>
          )}

          {activeTab === 'link' && (
            <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
              Click "Copy Link" next to any SIM to copy its Telegram link
            </div>
          )}
        </div>
      </div>
    </div>
  )
}