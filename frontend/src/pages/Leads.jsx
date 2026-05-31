import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiMail,
  FiSearch,
  FiEye,
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
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
  ConfirmModal,
} from '../components/ui'
import { formatDate, formatTime } from '../utils/dateFormat'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'lost', label: 'Lost' },
]

const getStatusBadge = (status) => {
  switch (status) {
    case 'new': return 'info'
    case 'contacted': return 'primary'
    case 'qualified': return 'success'
    case 'lost': return 'danger'
    default: return 'default'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'new': return 'New'
    case 'contacted': return 'Contacted'
    case 'qualified': return 'Qualified'
    case 'lost': return 'Lost'
    default: return status
  }
}

export default function Leads() {
  const { api } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, leadId: null, leadName: '' })
  const fetchIdRef = useRef(0)

  useEffect(() => {
    fetchLeads()
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    if (status) {
      setPagination((prev) => ({ ...prev, page: 1 }))
      fetchLeads(1)
    } else {
      fetchLeads()
    }
  }, [status])

  const fetchLeads = async (page) => {
    const id = ++fetchIdRef.current
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: page || pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(status && { status }),
      })
      const response = await api.get(`/leads?${params}`)
      if (fetchIdRef.current !== id) return
      setLeads(response.data.data || [])
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        page: page || prev.page,
      }))
    } catch (err) {
      if (fetchIdRef.current !== id) return
      console.error('Failed to fetch leads:', err)
      const message = err.response?.data?.message || err.message || 'Failed to fetch leads'
      setError(message)
      toast.error(message)
      setLeads([])
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchLeads(1)
  }

  const openDetailModal = async (lead) => {
    try {
      setDetailLoading(true)
      const response = await api.get(`/leads/${lead._id}`)
      setSelectedLead(response.data.data)
      setShowDetailModal(true)
    } catch (err) {
      toast.error('Failed to load lead details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedLead(null)
  }

  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus })
      toast.success('Status updated successfully')
      fetchLeads()
      closeDetailModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDelete = (leadId, leadName) => {
    setDeleteConfirm({ show: true, leadId, leadName })
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/leads/${deleteConfirm.leadId}`)
      toast.success('Lead deleted successfully')
      fetchLeads()
    } catch (err) {
      toast.error('Failed to delete lead')
    } finally {
      setDeleteConfirm({ show: false, leadId: null, leadName: '' })
    }
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  if (loading && leads.length === 0) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  if (error && leads.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Leads" description="Manage contact form submissions" />
        <Card style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '24px' }}>
          <CardBody>
            <p style={{ color: '#dc2626' }}>{error}</p>
            <Button variant="danger" size="sm" style={{ marginTop: '8px' }} onClick={() => fetchLeads()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title="Leads" description="Manage contact form submissions" />

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or company..."
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '14px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button icon={FiSearch} type="submit">Search</Button>
          </form>
        </CardBody>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardBody>
          {leads.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ width: '50px', padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>S.No.</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Email</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Company</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px', minWidth: '140px' }}>Created</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, index) => (
                      <tr key={lead._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '500' }}>{lead.name}</div>
                          {lead.phone && (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{lead.phone}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{lead.email}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{lead.company || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatusBadge(lead.status)}>{getStatusLabel(lead.status)}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {lead.createdAt ? (
                            <div style={{ lineHeight: '1.5' }}>
                              <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{formatDate(lead.createdAt)}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(lead.createdAt)}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openDetailModal(lead)}
                              style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="View Details"
                            >
                              <FiEye style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                            </button>
                            <button
                              onClick={() => handleDelete(lead._id, lead.name)}
                              style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Delete"
                            >
                              <FiTrash2 style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>Rows per page:</span>
                      <select
                        value={pagination.limit}
                        onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          outline: 'none',
                          minWidth: '60px',
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                      icon={FiChevronLeft}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pagination.page >= totalPages}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                      <FiChevronRight style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiMail style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Leads Found</h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Contact form submissions will appear here</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
          onClick={closeDetailModal}
        >
          <div
            style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Lead Details</h3>
              <button onClick={closeDetailModal} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <FiX style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><Spinner size="md" /></div>
            ) : (
              <div style={{ padding: '20px' }}>
                {/* Name & Email */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{selectedLead.name}</span>
                    <Badge variant={getStatusBadge(selectedLead.status)}>{getStatusLabel(selectedLead.status)}</Badge>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedLead.email}</div>
                  {selectedLead.phone && <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedLead.phone}</div>}
                </div>

                {/* Company */}
                {selectedLead.company && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '2px' }}>Company</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{selectedLead.company}</div>
                  </div>
                )}

                {/* Message */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Message</div>
                  <div style={{ fontSize: '14px', color: '#374151', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {selectedLead.message}
                  </div>
                </div>

                {/* Created */}
                <div style={{ marginBottom: '16px', fontSize: '12px', color: '#6b7280' }}>
                  Submitted on {selectedLead.createdAt ? `${formatDate(selectedLead.createdAt)} at ${formatTime(selectedLead.createdAt)}` : 'N/A'}
                </div>

                {/* Status Update */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Update Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleStatusUpdate(selectedLead._id, e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                      backgroundColor: '#fff', cursor: 'pointer',
                    }}
                  >
                    {STATUS_OPTIONS.filter((opt) => opt.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Notes</label>
                  <textarea
                    value={selectedLead.notes || ''}
                    onChange={(e) => setSelectedLead((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes about this lead..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                  <Button
                    size="sm"
                    style={{ marginTop: '8px' }}
                    onClick={async () => {
                      try {
                        await api.put(`/leads/${selectedLead._id}`, { notes: selectedLead.notes })
                        toast.success('Notes saved')
                        fetchLeads()
                        closeDetailModal()
                      } catch (err) {
                        toast.error('Failed to save notes')
                      }
                    }}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, leadId: null, leadName: '' })}
        onConfirm={confirmDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete the lead from "${deleteConfirm.leadName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </PageContainer>
  )
}