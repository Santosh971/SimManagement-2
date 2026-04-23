import { useState, useEffect } from 'react'
import { FiX, FiSend, FiSmartphone, FiAlertCircle, FiLink, FiCheck, FiCopy } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function SendMessageModal({ isOpen, onClose, onSuccess }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sims, setSims] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('send') // 'send' or 'link'

  // Fetch eligible SIMs (with telegramChatId)
  useEffect(() => {
    if (isOpen) {
      fetchSIMs()
    }
  }, [isOpen])

  const fetchSIMs = async () => {
    try {
      const response = await api.get('/telegram/sims')
      setSims(response.data.data || [])
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

  // Toggle selection
  const toggleSIM = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSIMs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSIMs.map((s) => s._id))
    }
  }

  // Handle send
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
            }}
          >
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
            }}
          >
            Generate Links
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
              <strong>Telegram Note:</strong> Only SIMs linked to Telegram can receive messages.
              Use "Generate Links" tab to create deep links for SIMs to connect via bot.
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

          {/* Send Message Tab */}
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
                    {search ? 'No matching SIMs found' : 'No SIMs linked to Telegram. Use Generate Links tab to link SIMs.'}
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

          {/* Generate Links Tab */}
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
                {filteredSIMs.length === 0 && sims.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    No SIMs found
                  </div>
                ) : (
                  (sims.filter((sim) => {
                    if (!search) return true
                    const searchLower = search.toLowerCase()
                    return (
                      sim.mobileNumber.toLowerCase().includes(searchLower) ||
                      sim.operator?.toLowerCase().includes(searchLower)
                    )
                  })).map((sim) => (
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
                            {sim.operator} • {sim.telegramChatId ? 'Linked' : 'Not Linked'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => copyLink(sim._id, sim.mobileNumber)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: '1px solid #0088cc',
                          borderRadius: '6px',
                          background: '#fff',
                          color: '#0088cc',
                          cursor: 'pointer',
                        }}
                      >
                        <FiCopy style={{ width: '14px' }} />
                        {sim.telegramChatId ? 'Copy Link' : 'Generate & Copy'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer - Only for Send Tab */}
        {activeTab === 'send' && (
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
          </div>
        )}
      </div>
    </div>
  )
}