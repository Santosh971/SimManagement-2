import { useState, useEffect } from 'react'
import { FiX, FiSend, FiSmartphone, FiAlertCircle, FiLink, FiCheck, FiCopy, FiMail, FiUsers } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function SendMessageModal({ isOpen, onClose, onSuccess }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sendingEmailId, setSendingEmailId] = useState(null) // Track which SIM is being sent
  const [sims, setSims] = useState([]) // Linked SIMs for sending
  const [allSIMs, setAllSIMs] = useState([]) // All SIMs for generating links
  const [selectedIds, setSelectedIds] = useState([])
  const [emailSelectedIds, setEmailSelectedIds] = useState([]) // For email tab
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('send') // 'send', 'link', or 'email'
  const [updateSimStatus, setUpdateSimStatus] = useState(false)

  // Reset form state and fetch SIMs when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([])
      setEmailSelectedIds([])
      setMessage('')
      setSearch('')
      setActiveTab('send')
      setUpdateSimStatus(false)
      setSendingEmailId(null)
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
    if (!search || !search.trim()) return true
    const searchLower = search.trim().toLowerCase()
    return (
      sim.mobileNumber.toLowerCase().includes(searchLower) ||
      sim.operator?.toLowerCase().includes(searchLower) ||
      sim.assignedTo?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Filter all SIMs for email/link tabs
  const filteredAllSIMs = allSIMs.filter((sim) => {
    if (!search || !search.trim()) return true
    const searchLower = search.trim().toLowerCase()
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
      const response = await api.post('/telegram/send-bulk', {
        simIds: selectedIds,
        message: message.trim(),
        updateSimStatus,
      })

      toast.success(`Messages sent: ${response.data.data.sent}, Skipped: ${response.data.data.skipped}, Failed: ${response.data.data.failed}`)

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
    setSendingEmailId(simId) // Set loading for this specific SIM
    try {
      const response = await api.post('/telegram/send-link-email', { simId })
      toast.success(response.data.message)
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send email'
      toast.error(errorMsg)
    } finally {
      setSendingEmailId(null) // Clear loading for this SIM
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

  // Send links to all UNLINKED SIMs via email
  const sendEmailToAllUnlinked = async () => {
    // Get all unlinked SIMs with email (unlinked = not phone verified)
    const unlinkedSIMs = allSIMs.filter((sim) => (!sim.telegramChatId || !sim.telegramPhoneVerified) && sim.assignedTo?.email)

    if (unlinkedSIMs.length === 0) {
      toast.error('No unlinked SIMs with assigned email found')
      return
    }

    setLoading(true)
    try {
      const simIds = unlinkedSIMs.map((sim) => sim._id)
      const response = await api.post('/telegram/send-link-email-bulk', {
        simIds
      })
      toast.success(response.data.message)
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
          {/* <button
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
          </button> */}
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
              placeholder="Search by Contact Number, operator, or user..."
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
                  marginBottom: '16px',
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
            </>
          )}

          {/* ============= GENERATE LINKS TAB ============= */}
          {activeTab === 'link' && (
            <>
              {/* Stats and Bulk Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                  All SIMs - Generate Telegram Deep Links
                </h3>
                {/* Bulk Send to Unlinked */}
                <button
                  onClick={sendEmailToAllUnlinked}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    border: '1px solid #16a34a',
                    borderRadius: '6px',
                    background: loading ? '#e5e7eb' : '#16a34a',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                  }}
                >
                  <FiMail />
                  {loading ? 'Sending...' : 'Send to All Unlinked'}
                </button>
              </div>

              {/* Unlinked Stats */}
              {(() => {
                // Unlinked = no telegramChatId OR not phone verified
                const unlinkedSIMs = allSIMs.filter((sim) => !sim.telegramChatId || !sim.telegramPhoneVerified)
                const unlinkedWithEmail = unlinkedSIMs.filter((sim) => sim.assignedTo?.email)
                const unlinkedNoEmail = unlinkedSIMs.filter((sim) => !sim.assignedTo?.email)
                return (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fcd34d',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      fontSize: '13px',
                    }}
                  >
                    <strong>Unlinked SIMs:</strong> {unlinkedSIMs.length} total
                    ({unlinkedWithEmail.length} with email, {unlinkedNoEmail.length} without email)
                  </div>
                )
              })()}

             <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
  {filteredAllSIMs.length === 0 ? (
    <div className="p-5 text-center text-gray-500">
      No SIMs found
    </div>
  ) : (
    filteredAllSIMs.map((sim) => {
      const isLinked = sim.telegramChatId && sim.telegramPhoneVerified;
      const isPending = sim.telegramChatId && !sim.telegramPhoneVerified;

      return (
        <div
          key={sim._id}
          className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 ${
            isLinked ? "bg-gray-50" : "bg-white"
          }`}
        >
          {/* LEFT SECTION */}
          <div className="flex items-start sm:items-center gap-3 w-full">
            {/* ICON */}
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${
                isLinked ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              {isLinked ? (
                <FiCheck className="text-green-600 text-sm" />
              ) : (
                <FiLink className="text-yellow-600 text-sm" />
              )}
            </div>

            {/* TEXT */}
            <div className="flex-1 min-w-0">
              {/* NUMBER + BADGE */}
              <div className="text-sm font-medium break-all">
                {sim.mobileNumber}

                {isLinked && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-600 rounded">
                    LINKED
                  </span>
                )}

                {isPending && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-600 rounded">
                    PENDING
                  </span>
                )}
              </div>

              {/* OPERATOR */}
              <div className="text-xs text-gray-500">
                {sim.operator} • {sim.assignedTo?.name || "Unassigned"}
              </div>

              {/* EMAIL */}
              {sim.assignedTo?.email ? (
                <div className="text-xs text-green-600 break-all">
                  📧 {sim.assignedTo.email}
                </div>
              ) : (
                <div className="text-xs text-red-600">
                  ⚠️ No email assigned
                </div>
              )}
            </div>
          </div>

          {/* RIGHT BUTTONS */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            {/* COPY BUTTON */}
            <button
              onClick={() => copyLink(sim._id, sim.mobileNumber)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 text-xs border border-[#0088cc] rounded-md text-[#0088cc] hover:bg-blue-50 transition"
            >
              <FiCopy className="text-sm" />
              Copy
            </button>

            {/* EMAIL BUTTON */}
            <button
              onClick={() => sendEmailToSingle(sim._id, sim.mobileNumber)}
              disabled={sendingEmailId === sim._id || !sim.assignedTo?.email}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 text-xs border rounded-md transition
                ${
                  sendingEmailId === sim._id || !sim.assignedTo?.email
                    ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "border-green-600 text-green-600 hover:bg-green-50"
                }`}
            >
              <FiMail className="text-sm" />
              {sendingEmailId === sim._id ? "Sending..." : "Email"}
            </button>
          </div>
        </div>
      );
    })
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
                  Telegram links will be sent to the registered Email IDes of assigned users.
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
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'send' && (
              <button
                onClick={handleSend}
                disabled={loading || selectedIds.length === 0 || message.trim().length < 10}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading || selectedIds.length === 0 || message.trim().length < 10 ? '#9ca3af' : '#0088cc',
                  color: '#fff',
                  cursor: loading || selectedIds.length === 0 || message.trim().length < 10 ? 'not-allowed' : 'pointer',
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
        </div>
      </div>
    </div>
  )
}