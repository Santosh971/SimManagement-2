

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPlus,
  FiCreditCard,
  FiX,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiSearch,
  FiDownload,
  FiEye,
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
  Spinner,
  Pagination,
  Table,
  Modal,
} from '../components/ui'
import { formatDate } from '../utils/dateFormat'

const paymentMethodLabels = { cash: 'Cash', upi: 'UPI', card: 'Card', netbanking: 'Net Banking', wallet: 'Wallet', other: 'Other' }
const paymentMethodColors = { cash: '#f0fdf4', upi: '#eff6ff', card: '#fdf4ff', netbanking: '#fff7ed', wallet: '#fefce8', other: '#f9fafb' }
const paymentMethodTextColors = { cash: '#15803d', upi: '#1d4ed8', card: '#a21caf', netbanking: '#c2410c', wallet: '#a16207', other: '#6b7280' }

// Recharge Modal Component
function RechargeModal({ isOpen, onClose, onSave, sims }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    simId: '',
    amount: '',
    plan: {
      name: '',
      validity: '',
      data: '',
      calls: '',
      sms: '',
    },
    validity: '',
    paymentMethod: 'cash',
    notes: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'netbanking', label: 'Net Banking' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'other', label: 'Other' },
  ]

  const requiredAsterisk = <span style={{ color: '#dc2626' }}>*</span>

  const validate = () => {
    const newErrors = {}
    if (!formData.simId) newErrors.simId = 'Please select a SIM card'
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Please enter a valid amount'
    if (!formData.validity || parseInt(formData.validity) <= 0) newErrors.validity = 'Please enter validity in days'
    if (!formData.plan.name.trim()) newErrors.planName = 'Please enter a plan name'
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Please select a payment method'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    if (sims && sims.length > 0 && !formData.simId) {
      setFormData((prev) => ({ ...prev, simId: sims[0]._id }))
    }
  }, [sims])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('plan.')) {
      const planField = name.split('.')[1]
      setFormData((prev) => ({
        ...prev,
        plan: { ...prev.plan, [planField]: value },
      }))
      if (planField === 'name') clearFieldError('planName')
      if (planField === 'data') clearFieldError('planData')
      if (planField === 'calls') clearFieldError('planCalls')
      if (planField === 'sms') clearFieldError('planSms')
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
      if (name === 'simId') clearFieldError('simId')
      if (name === 'amount') clearFieldError('amount')
      if (name === 'validity') clearFieldError('validity')
      if (name === 'paymentMethod') clearFieldError('paymentMethod')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const fd = new FormData()
      fd.append('simId', formData.simId)
      fd.append('amount', parseFloat(formData.amount))
      fd.append('validity', parseInt(formData.validity))
      fd.append('paymentMethod', formData.paymentMethod)
      fd.append('notes', formData.notes)

      if (formData.plan.name) {
        fd.append('plan[name]', formData.plan.name)
        fd.append('plan[validity]', parseInt(formData.plan.validity) || parseInt(formData.validity))
        fd.append('plan[data]', formData.plan.data || '')
        fd.append('plan[calls]', formData.plan.calls || '')
        fd.append('plan[sms]', formData.plan.sms || '')
      }

      if (receiptFile) {
        fd.append('receipt', receiptFile)
      }

      await onSave(fd)
      toast.success('Recharge added successfully')
      onClose()
      setFormData({
        simId: sims && sims.length > 0 ? sims[0]._id : '',
        amount: '',
        plan: { name: '', validity: '', data: '', calls: '', sms: '' },
        validity: '',
        paymentMethod: 'cash',
        notes: '',
      })
      setReceiptFile(null)
      setErrors({})
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Add Recharge</h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* SIM Card */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              SIM Card {requiredAsterisk}
            </label>
            <select
              name="simId"
              value={formData.simId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${errors.simId ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select SIM</option>
              {(sims || []).map((sim) => (
                <option key={sim._id} value={sim._id}>
                  {sim.mobileNumber} ({sim.operator}) {sim.status !== 'active' ? `- ${sim.status}` : ''}
                </option>
              ))}
            </select>
            {errors.simId && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.simId}</p>}
          </div>

          {/* Amount & Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Amount (₹) {requiredAsterisk}
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="299"
                min="1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.amount ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.amount && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.amount}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Validity (days) {requiredAsterisk}
              </label>
              <input
                type="number"
                name="validity"
                value={formData.validity}
                onChange={handleChange}
                placeholder="e.g., 28, 56, 84"
                min="1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.validity ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.validity && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.validity}</p>}
            </div>
          </div>

          {/* Plan Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Plan Name {requiredAsterisk}
            </label>
            <input
              type="text"
              name="plan.name"
              value={formData.plan.name}
              onChange={handleChange}
              placeholder="e.g., ₹299 Unlimited Plan"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${errors.planName ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.planName && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.planName}</p>}
          </div>

          {/* Plan Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Data (optional)
              </label>
              <input
                type="text"
                name="plan.data"
                value={formData.plan.data}
                onChange={handleChange}
                placeholder="e.g., 1.5GB/day"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Calls (optional)
              </label>
              <input
                type="text"
                name="plan.calls"
                value={formData.plan.calls}
                onChange={handleChange}
                placeholder="e.g., Unlimited"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                SMS (optional)
              </label>
              <input
                type="text"
                name="plan.sms"
                value={formData.plan.sms}
                onChange={handleChange}
                placeholder="e.g., 100/day"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Payment Method {requiredAsterisk}
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${errors.paymentMethod ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.paymentMethod && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.paymentMethod}</p>}
          </div>

          {/* Notes — optional, no asterisk */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Notes (optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes (optional)"
              rows="2"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Payment Proof — optional */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Payment Proof (optional)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setReceiptFile(e.target.files[0] || null)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#374151',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            />
            {receiptFile && (
              <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', display: 'block' }}>
              JPG, PNG, or PDF — max 5 MB
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>
              {loading ? 'Adding...' : 'Add Recharge'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Mobile Card View for each recharge record
function RechargeCard({ row, getNextRechargeStatus, formatDate, onPreviewReceipt }) {
  const nextRecharge = getNextRechargeStatus(row.nextRechargeDate)

  return (
    <div className="p-4 border border-gray-200 rounded-xl mb-3 bg-white shadow-sm">
      {/* Top Row: SIM info */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{row.simId?.mobileNumber || 'N/A'}</p>
          <p className="text-xs text-gray-500">{row.simId?.operator || ''}</p>
        </div>
      </div>

      {/* Amount + Plan */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Amount</p>
          <p className="text-base font-bold text-gray-900">₹{row.amount?.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">Plan</p>
          <p className="text-sm text-gray-700">{row.plan?.name || 'N/A'}</p>
          {(row.plan?.data || row.plan?.calls || row.plan?.sms || row.validity) && (
            <div className="flex flex-wrap gap-1 justify-end mt-1">
              {row.plan?.data && <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Data: {row.plan.data}</span>}
              {row.plan?.calls && <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#15803d' }}>Calls: {row.plan.calls}</span>}
              {row.plan?.sms && <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#fdf4ff', color: '#a21caf' }}>SMS: {row.plan.sms}</span>}
              {row.validity ? <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f3f4f6', color: '#6b7280' }}>{row.validity}d</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-3" />

      {/* Payment Method */}
      {row.paymentMethod && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500">Payment</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
            background: paymentMethodColors[row.paymentMethod] || '#f9fafb',
            color: paymentMethodTextColors[row.paymentMethod] || '#6b7280',
          }}>{paymentMethodLabels[row.paymentMethod] || row.paymentMethod}</span>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Recharge Date</p>
          <p className="text-sm text-gray-700">{formatDate(row.rechargeDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">Next Recharge</p>
          <p className="text-sm text-gray-700">{formatDate(row.nextRechargeDate)}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5" style={{ color: nextRecharge.color }}>
            {nextRecharge.status === 'overdue' && <FiAlertCircle className="w-3 h-3" />}
            {nextRecharge.status === 'due_soon' && <FiClock className="w-3 h-3" />}
            {nextRecharge.status === 'active' && <FiCheckCircle className="w-3 h-3" />}
            <span className="text-xs font-medium">{nextRecharge.label}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {row.notes && (
        <>
          <div className="border-t border-gray-100 mt-3 mb-3" />
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Notes</p>
            <p className="text-sm text-gray-700">{row.notes}</p>
          </div>
        </>
      )}

      {/* Receipt */}
      {row.receiptImage && (
        <>
          <div className="border-t border-gray-100 mt-3 mb-3" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Payment Proof</p>
            <button onClick={() => onPreviewReceipt(row.receiptImage)} className="text-blue-600 bg-transparent border-0 cursor-pointer p-0"><FiEye size={15} /></button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Recharges() {
  const { user, api } = useAuth()
  const [recharges, setRecharges] = useState([])
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [activeDateRange, setActiveDateRange] = useState({ start: '', end: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const fetchIdRef = useRef(0)
  const [showModal, setShowModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [stats, setStats] = useState(null)
  const [upcomingRecharges, setUpcomingRecharges] = useState([])
  const [overdueRecharges, setOverdueRecharges] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchRecharges()
    fetchStats()
    fetchSims()
    fetchUpcoming()
    fetchOverdue()
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    if (pagination.page === 1) {
      fetchRecharges()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [activeDateRange.start, activeDateRange.end])

  const fetchSims = async () => {
    try {
      const response = await api.get('/sims?limit=100')
      setSims(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch SIMs')
    }
  }

  const fetchRecharges = async (dates) => {
    const id = ++fetchIdRef.current
    try {
      setLoading(true)
      const filterDates = dates || activeDateRange
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filterDates.start && { startDate: filterDates.start }),
        ...(filterDates.end && { endDate: filterDates.end }),
      })

      const response = await api.get(`/recharges?${params}`)
      if (fetchIdRef.current !== id) return
      setRecharges(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      if (fetchIdRef.current !== id) return
      toast.error('Failed to fetch recharges')
      setRecharges([])
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/recharges/stats')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats')
    }
  }

  const fetchUpcoming = async () => {
    try {
      const response = await api.get('/recharges/upcoming?days=7')
      setUpcomingRecharges(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch upcoming')
    }
  }

  const fetchOverdue = async () => {
    try {
      const response = await api.get('/recharges/overdue')
      setOverdueRecharges(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch overdue')
    }
  }

  const handleAddRecharge = async (formData) => {
    await api.post('/recharges', formData)
    if (pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }))
    } else {
      await Promise.all([
        fetchRecharges(),
        fetchStats(),
        fetchOverdue(),
        fetchUpcoming(),
      ])
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(activeDateRange.start && { startDate: activeDateRange.start }),
        ...(activeDateRange.end && { endDate: activeDateRange.end }),
      })
      const r = await api.get(`/recharges/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'recharges-export.xlsx')
      document.body.appendChild(link); link.click(); link.remove()
      toast.success('Export completed')
    } catch { toast.error('This feature is available in higher plans. Upgrade your plan to access it.') }
  }

  const getNextRechargeStatus = (nextRechargeDate) => {
    if (!nextRechargeDate) return { status: 'unknown', label: 'N/A', color: '#94a3b8' }

    const now = new Date()
    const nextDate = new Date(nextRechargeDate)
    const diffDays = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', label: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`, color: '#dc2626' }
    } else if (diffDays === 0) {
      return { status: 'due_today', label: 'Due today', color: '#d97706' }
    } else if (diffDays <= 3) {
      return { status: 'due_soon', label: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`, color: '#f59e0b' }
    } else {
      return { status: 'active', label: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`, color: '#16a34a' }
    }
  }

  const filteredRecharges = searchQuery.trim()
    ? recharges.filter((r) => {
        const q = searchQuery.toLowerCase().trim()
        return (
          (r.simId?.mobileNumber || '').toLowerCase().includes(q) ||
          (r.simId?.operator || '').toLowerCase().includes(q) ||
          (r.simId?.circle || '').toLowerCase().includes(q) ||
          (r.plan?.name || '').toLowerCase().includes(q) ||
          (r.amount != null && String(r.amount).includes(q)) ||
          (r.paymentMethod || '').toLowerCase().includes(q)
        )
      })
    : recharges

  const columns = [
    {
      key: 'simId',
      header: 'SIM Card',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '500' }}>{row.simId?.mobileNumber || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.simId?.operator || ''}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span style={{ fontWeight: '600' }}>₹{row.amount?.toLocaleString()}</span>
    },
    {
      key: 'plan',
      header: 'Plan Name',
      render: (row) => (
        <div>
          <div style={{ fontSize: '14px' }}>{row.plan?.name || 'N/A'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {row.plan?.data && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '500' }}>Data: {row.plan.data}</span>}
            {row.plan?.calls && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#f0fdf4', color: '#15803d', fontWeight: '500' }}>Calls: {row.plan.calls}</span>}
            {row.plan?.sms && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#fdf4ff', color: '#a21caf', fontWeight: '500' }}>SMS: {row.plan.sms}</span>}
            {row.validity ? <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#f3f4f6', color: '#6b7280', fontWeight: '500' }}>{row.validity}d</span> : null}
          </div>
        </div>
      )
    },
    {
      key: 'rechargeDate',
      header: 'Recharge Date',
      render: (row) => <span style={{ fontSize: '14px' }}>{formatDate(row.rechargeDate)}</span>
    },
    {
      key: 'nextRecharge',
      header: 'Next Recharge',
      render: (row) => {
        const nextRecharge = getNextRechargeStatus(row.nextRechargeDate)
        return (
          <div>
            <div style={{ fontSize: '14px' }}>{formatDate(row.nextRechargeDate)}</div>
            <div style={{ fontSize: '12px', color: nextRecharge.color, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {nextRecharge.status === 'overdue' && <FiAlertCircle style={{ width: '12px', height: '12px' }} />}
              {nextRecharge.status === 'due_soon' && <FiClock style={{ width: '12px', height: '12px' }} />}
              {nextRecharge.status === 'active' && <FiCheckCircle style={{ width: '12px', height: '12px' }} />}
              {nextRecharge.label}
            </div>
          </div>
        )
      }
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (row) => {
        const method = paymentMethodLabels[row.paymentMethod] || row.paymentMethod || '-'
        return (
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '9999px',
            background: paymentMethodColors[row.paymentMethod] || '#f3f4f6',
            color: paymentMethodTextColors[row.paymentMethod] || '#6b7280',
            fontWeight: '500',
          }}>{method}</span>
        )
      }
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row) => <span style={{ fontSize: '13px', color: '#6b7280' }}>{row.notes || '-'}</span>
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (row) => row.receiptImage
        ? <button onClick={() => setPreviewUrl(row.receiptImage)} style={{ color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}><FiEye size={16} /></button>
        : <span style={{ fontSize: '13px', color: '#9ca3af' }}>-</span>
    },
  ]

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }
const today = new Date().toISOString().split('T')[0];

  return (
    <PageContainer>
      <PageHeader
        title="Recharges"
        description="Track and manage SIM recharges"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button variant="secondary" icon={FiDownload} onClick={handleExport}>Export</Button>
            <Button icon={FiPlus} onClick={() => setShowModal(true)}>
              Add Recharge
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Spent"
            value={`₹${(stats.overall?.totalAmount || 0).toLocaleString()}`}
            subtitle={`${stats.overall?.count || 0} transactions`}
            icon={FiCreditCard}
            iconColor="#16a34a"
            iconBg="#dcfce7"
          />
          <StatCard
            title="Total Recharges"
            value={stats.overall?.count || 0}
            icon={FiCreditCard}
            iconColor="#2563eb"
            iconBg="#eff6ff"
          />
          <StatCard
            title="Average Amount"
            value={`₹${Math.round(stats.overall?.avgAmount || 0)}`}
            icon={FiCreditCard}
            iconColor="#d97706"
            iconBg="#fffbeb"
          />
          <StatCard
            title="This Month"
            value={`₹${(stats.monthly?.[0]?.total || 0).toLocaleString()}`}
            icon={FiCreditCard}
            iconColor="#dc2626"
            iconBg="#fef2f2"
          />
        </Grid>
      )}

      {/* Alert Sections */}
      {(overdueRecharges.length > 0 || upcomingRecharges.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {overdueRecharges.length > 0 && (
            <Card style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FiAlertCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', margin: 0 }}>
                    Overdue Recharges ({overdueRecharges.length})
                  </h3>
                </div>
                <div style={{ maxHeight: '180px', overflow: 'auto' }}>
                  {overdueRecharges.slice(0, 5).map((r) => {
                    const daysOverdue = Math.ceil((new Date() - new Date(r.nextRechargeDate)) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #fee2e2' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{r.simId?.mobileNumber}</span>
                            {r.simId?.operator && (
                              <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>{r.simId.operator}</span>
                            )}
                            {r.simId?.circle && (
                              <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>{r.simId.circle}</span>
                            )}
                            {r.simId?.status && (
                              <span style={{ fontSize: '11px', backgroundColor: r.simId.status === 'active' ? '#dcfce7' : '#f3f4f6', color: r.simId.status === 'active' ? '#166534' : '#6b7280', padding: '1px 6px', borderRadius: '4px' }}>{r.simId.status}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px' }}>
                            {r.amount && `₹${r.amount.toLocaleString()}`}
                            {r.plan?.name && ` • ${r.plan.name}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>{daysOverdue}d overdue</div>
                          <div style={{ fontSize: '11px', color: '#f87171' }}>{formatDate(r.nextRechargeDate)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          )}
          {upcomingRecharges.length > 0 && (
            <Card style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FiClock style={{ width: '20px', height: '20px', color: '#d97706' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#d97706', margin: 0 }}>
                    Due This Week ({upcomingRecharges.length})
                  </h3>
                </div>
                <div style={{ maxHeight: '180px', overflow: 'auto' }}>
                  {upcomingRecharges.slice(0, 5).map((r) => {
                    const nextRecharge = getNextRechargeStatus(r.nextRechargeDate)
                    return (
                      <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #fde68a' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{r.simId?.mobileNumber}</span>
                            {r.simId?.operator && (
                              <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px' }}>{r.simId.operator}</span>
                            )}
                            {r.simId?.circle && (
                              <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px' }}>{r.simId.circle}</span>
                            )}
                            {r.simId?.status && (
                              <span style={{ fontSize: '11px', backgroundColor: r.simId.status === 'active' ? '#dcfce7' : '#f3f4f6', color: r.simId.status === 'active' ? '#166534' : '#6b7280', padding: '1px 6px', borderRadius: '4px' }}>{r.simId.status}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                            {r.amount && `₹${r.amount.toLocaleString()}`}
                            {r.plan?.name && ` • ${r.plan.name}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                          <div style={{ fontSize: '12px', color: nextRecharge.color, fontWeight: '500' }}>{nextRecharge.label}</div>
                          <div style={{ fontSize: '11px', color: '#92400e' }}>{formatDate(r.nextRechargeDate)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number, operator, plan..."
                className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <input
              type="date"
              value={dateRange.start}
              max={dateRange.end || today}
              onChange={(e) => {
                const val = e.target.value
                setDateRange((prev) => ({ ...prev, start: val }))
                setActiveDateRange((prev) => ({ ...prev, start: val }))
              }}
              onKeyDown={(e) => e.preventDefault()}
              className="flex-1 min-w-[130px] text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none cursor-pointer"
            />
            <input
              type="date"
              value={dateRange.end}
              min={dateRange.start || undefined}
              max={today}
              onChange={(e) => {
                const val = e.target.value
                setDateRange((prev) => ({ ...prev, end: val }))
                setActiveDateRange((prev) => ({ ...prev, end: val }))
              }}
              onKeyDown={(e) => e.preventDefault()}
              className="flex-1 min-w-[130px] text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none cursor-pointer"
            />
            <Button variant="secondary" type="button" onClick={() => { setDateRange({ start: '', end: '' }); setActiveDateRange({ start: '', end: '' }); setSearchQuery('') }}>Clear</Button>
          </div>
        </CardBody>
      </Card>

      {/* Table — Desktop only */}
      <div className="hidden md:block">
        <Card>
          <CardBody style={{ padding: 0 }}>
            <Table
              columns={columns}
              data={filteredRecharges}
              emptyMessage="No Recharges Found"
              emptyAction={
                <Button onClick={() => setShowModal(true)}>Add Recharge</Button>
              }
              showSerial
              serialOffset={(pagination.page - 1) * pagination.limit}
            />
          </CardBody>
        </Card>
      </div>

      {/* Mobile Card List — Mobile only */}
      <div className="block md:hidden">
        {filteredRecharges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm mb-3">No Recharges Found</p>
            <Button onClick={() => setShowModal(true)}>Add Recharge</Button>
          </div>
        ) : (
          filteredRecharges.map((row) => (
            <RechargeCard
              key={row._id}
              row={row}
              getNextRechargeStatus={getNextRechargeStatus}
              formatDate={formatDate}
              onPreviewReceipt={setPreviewUrl}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
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
            <div className="w-full sm:w-auto overflow-x-auto">
              <div className="flex justify-center sm:justify-end min-w-max">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={Math.ceil(pagination.total / pagination.limit)}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <RechargeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAddRecharge}
        sims={sims}
      />

      {/* Receipt Preview Modal */}
      {previewUrl && (
        <Modal isOpen={true} onClose={() => setPreviewUrl(null)} title="Payment Proof" size="xl">
          {previewUrl.endsWith('.pdf') ? (
            <iframe
              src={previewUrl}
              style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
              title="Receipt PDF"
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={previewUrl}
                alt="Payment Proof"
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open in New Tab</Button>
            </a>
          </div>
        </Modal>
      )}
    </PageContainer>
  )
}