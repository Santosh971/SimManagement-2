import { useState, useEffect, Fragment } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiX,
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Badge,
  Button,
  Table,
  Spinner,
  Pagination,
  PhoneInput,
} from '../components/ui'

// Company Modal Component
function CompanyModal({ isOpen, onClose, company, subscriptions, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subscriptionId: '',
    subscriptionDuration: 30,
    'address.street': '',
    'address.city': '',
    'address.state': '',
    'address.country': '',
    'address.zipCode': '',
  })

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        subscriptionId: company.subscriptionId?._id || company.subscriptionId || '',
        subscriptionDuration: 30,
        'address.street': company.address?.street || '',
        'address.city': company.address?.city || '',
        'address.state': company.address?.state || '',
        'address.country': company.address?.country || '',
        'address.zipCode': company.address?.zipCode || '',
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        subscriptionId: subscriptions[0]?._id || '',
        subscriptionDuration: 30,
        'address.street': '',
        'address.city': '',
        'address.state': '',
        'address.country': '',
        'address.zipCode': '',
      })
    }
  }, [company, subscriptions])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({ ...prev, phone }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.subscriptionId) {
      toast.error('Please fill all required fields')
      return
    }

    setLoading(true)

    const data = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subscriptionId: formData.subscriptionId,
      subscriptionDuration: formData.subscriptionDuration,
      address: {
        street: formData['address.street'],
        city: formData['address.city'],
        state: formData['address.state'],
        country: formData['address.country'],
        zipCode: formData['address.zipCode'],
      },
    }

    try {
      if (company) {
        await onSave(company._id, data)
        toast.success('Company updated successfully')
      } else {
        await onSave(null, data)
        toast.success('Company created successfully')
      }
      onClose()
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
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {company ? 'Edit Company' : 'Add New Company'}
          </h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Company Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter company name"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="company@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <PhoneInput
              value={formData.phone}
              onChange={handlePhoneChange}
              label="Phone"
              placeholder="Phone number"
            />
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Subscription Plan *
              </label>
              <select
                name="subscriptionId"
                value={formData.subscriptionId}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
                disabled={!!company}
              >
                <option value="">Select plan</option>
                {subscriptions.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} - ${sub.price?.monthly || 0}/mo
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!company && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Subscription Duration (days)
              </label>
              <input
                type="number"
                name="subscriptionDuration"
                value={formData.subscriptionDuration}
                onChange={handleChange}
                min="1"
                max="365"
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
          )}

          {/* Address */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
            <h4 style={{ fontWeight: '500', marginBottom: '12px' }}>Address</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Street
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData['address.street']}
                  onChange={handleChange}
                  placeholder="Street address"
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
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  City
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData['address.city']}
                  onChange={handleChange}
                  placeholder="City"
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
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  State/Province
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData['address.state']}
                  onChange={handleChange}
                  placeholder="State"
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
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Country
                </label>
                <input
                  type="text"
                  name="address.country"
                  value={formData['address.country']}
                  onChange={handleChange}
                  placeholder="Country"
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
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={loading}>{company ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Admin Modal Component
function AdminModal({ isOpen, onClose, companyId, admin, onSave }) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    isActive: true,
  })

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        email: admin.email || '',
        phone: admin.phone || '',
        password: '',
        isActive: admin.isActive ?? true,
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        isActive: true,
      })
    }
  }, [admin])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({ ...prev, phone }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast.error('Name and email are required')
      return
    }

    if (!admin && !formData.password) {
      toast.error('Password is required for new admin')
      return
    }

    if (!admin && formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      if (admin) {
        await onSave(admin._id, {
          name: formData.name,
          phone: formData.phone,
          isActive: formData.isActive,
        })
        toast.success('Admin updated successfully')
      } else {
        await onSave(null, formData)
        toast.success('Admin created successfully')
      }
      onClose()
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
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {admin ? 'Edit Admin' : 'Add New Admin'}
          </h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter admin name"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Email *
            </label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@company.com"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
                disabled={!!admin}
              />
            </div>
          </div>

          <PhoneInput
            value={formData.phone}
            onChange={handlePhoneChange}
            label="Phone"
            placeholder="Phone number"
          />

          {!admin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? <FiEyeOff style={{ width: '16px', height: '16px', color: '#9ca3af' }} /> : <FiEye style={{ width: '16px', height: '16px', color: '#9ca3af' }} />}
                </button>
              </div>
            </div>
          )}

          {admin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px' }}>Active</span>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={loading}>{admin ? 'Update' : 'Create Admin'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Reset Password Modal
function ResetPasswordModal({ isOpen, onClose, adminId, adminName, onReset }) {
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await onReset(adminId, password)
      toast.success('Password reset successfully')
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password')
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
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Reset Password</h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Set a new password for <strong>{adminName}</strong>
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 38px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <FiEyeOff style={{ width: '16px', height: '16px', color: '#9ca3af' }} /> : <FiEye style={{ width: '16px', height: '16px', color: '#9ca3af' }} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={loading}>Reset Password</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Companies Page
export default function Companies() {
  const { api, user } = useAuth()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [subscriptions, setSubscriptions] = useState([])

  // Modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)

  // Admins state
  const [companyAdmins, setCompanyAdmins] = useState({})
  const [expandedCompanies, setExpandedCompanies] = useState([])

  useEffect(() => {
    fetchCompanies()
    fetchSubscriptions()
  }, [pagination.page])

  // Reset to page 1 when status filter changes
  useEffect(() => {
    if (pagination.page === 1) {
      fetchCompanies()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [status])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(status && { status }),
      })

      const response = await api.get(`/companies?${params}`)
      setCompanies(response.data.data || [])
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }))
    } catch (err) {
      console.error('Failed to fetch companies:', err)
      const message = err.response?.data?.message || err.message || 'Failed to fetch companies'
      setError(message)
      toast.error(message)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/subscriptions')
      setSubscriptions(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
      setSubscriptions([])
    }
  }

  const fetchCompanyAdmins = async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}/admins`)
      setCompanyAdmins((prev) => ({
        ...prev,
        [companyId]: response.data.data,
      }))
    } catch (error) {
      toast.error('Failed to fetch admins')
    }
  }

  const handleSaveCompany = async (companyId, data) => {
    if (companyId) {
      await api.put(`/companies/${companyId}`, data)
    } else {
      await api.post('/companies', data)
    }
    fetchCompanies()
  }

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company? This will deactivate all associated admins.')) return

    try {
      await api.delete(`/companies/${id}`)
      toast.success('Company deleted successfully')
      fetchCompanies()
    } catch (error) {
      toast.error('Failed to delete company')
    }
  }

  const handleSaveAdmin = async (adminId, data) => {
    try {
      if (adminId) {
        // Update existing admin
        await api.put(`/companies/admins/${adminId}`, data)
        toast.success('Admin updated successfully')
      } else {
        // Create new admin
        const response = await api.post(`/companies/${selectedCompany._id}/admins`, data)
        // [ADMIN EMAIL FIX] Check if welcome email was sent
        const emailSent = response.data?.data?.emailSent ?? response.data?.emailSent
        if (emailSent === false) {
          toast.success('Admin created successfully but welcome email could not be sent.')
        } else {
          toast.success('Admin created successfully. Login credentials sent to email.')
        }
      }
      fetchCompanyAdmins(selectedCompany._id)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save admin'
      toast.error(message)
    }
  }

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to deactivate this admin?')) return

    try {
      await api.delete(`/companies/admins/${adminId}`)
      toast.success('Admin deactivated successfully')
      fetchCompanyAdmins(selectedCompany._id)
    } catch (error) {
      toast.error('Failed to deactivate admin')
    }
  }

  const handleResetPassword = async (adminId, password) => {
    await api.post(`/companies/admins/${adminId}/reset-password`, { password })
  }

  const toggleCompanyExpand = (companyId) => {
    if (expandedCompanies.includes(companyId)) {
      setExpandedCompanies(expandedCompanies.filter((id) => id !== companyId))
    } else {
      setExpandedCompanies([...expandedCompanies, companyId])
      if (!companyAdmins[companyId]) {
        fetchCompanyAdmins(companyId)
      }
    }
  }

  const openCompanyModal = (company = null) => {
    setEditingCompany(company)
    setShowCompanyModal(true)
  }

  const closeCompanyModal = () => {
    setShowCompanyModal(false)
    setEditingCompany(null)
  }

  const openAdminModal = (company, admin = null) => {
    setSelectedCompany(company)
    setEditingAdmin(admin)
    setShowAdminModal(true)
  }

  const closeAdminModal = () => {
    setShowAdminModal(false)
    setEditingAdmin(null)
  }

  const openResetModal = (admin) => {
    setEditingAdmin(admin)
    setShowResetModal(true)
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    setEditingAdmin(null)
  }

  const getStatusBadge = (company) => {
    if (!company.isActive) return 'danger'
    if (company.subscriptionStatus === 'expired') return 'danger'
    if (company.subscriptionStatus === 'expiring') return 'warning'
    return 'success'
  }

  const getStatusLabel = (company) => {
    if (!company.isActive) return 'Inactive'
    if (company.subscriptionStatus === 'expired') return 'Expired'
    if (company.subscriptionStatus === 'expiring') return 'Expiring'
    return 'Active'
  }

  // Check if user is super_admin
  if (user && user.role !== 'super_admin') {
    return (
      <PageContainer>
        <Card>
          <CardBody>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Access Denied</h2>
              <p style={{ color: '#6b7280' }}>You need Super Admin privileges to access this page.</p>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    )
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
        title="Companies"
        description="Manage client companies and their admins"
        action={
          <Button icon={FiPlus} onClick={() => openCompanyModal()}>
            Add Company
          </Button>
        }
      />

      {/* Error State */}
      {error && (
        <Card style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '24px' }}>
          <CardBody>
            <p style={{ color: '#dc2626' }}>{error}</p>
            <Button variant="danger" size="sm" style={{ marginTop: '8px' }} onClick={fetchCompanies}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={(e) => { e.preventDefault(); fetchCompanies(); }} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
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
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '140px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
            <Button type="submit">Search</Button>
          </form>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {companies.length > 0 ? (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ width: '40px', padding: '12px 16px' }}></th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Company Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Subscription</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Expiry Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <Fragment key={company._id}>
                      <tr style={{ borderTop: '1px solid #e5e7eb', cursor: 'pointer' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => toggleCompanyExpand(company._id)}
                            style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          >
                            {expandedCompanies.includes(company._id) ? (
                              <FiChevronUp style={{ width: '16px', height: '16px' }} />
                            ) : (
                              <FiChevronDown style={{ width: '16px', height: '16px' }} />
                            )}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '500' }}>{company.name}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>{company.phone}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{company.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant="default">{company.subscriptionId?.name || 'N/A'}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>{new Date(company.subscriptionEndDate).toLocaleDateString()}</div>
                          {company.subscriptionStatus === 'expiring' && (
                            <span style={{ fontSize: '12px', color: '#d97706' }}>Expiring soon</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatusBadge(company)}>{getStatusLabel(company)}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openAdminModal(company)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Add Admin"
                            >
                              <FiUser style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                            </button>
                            <button
                              onClick={() => openCompanyModal(company)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Edit"
                            >
                              <FiEdit style={{ width: '16px', height: '16px' }} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company._id)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Delete"
                            >
                              <FiTrash2 style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Admins Row */}
                      {expandedCompanies.includes(company._id) && (
                        <tr>
                          <td colSpan="7" style={{ backgroundColor: '#f9fafb', padding: '16px' }}>
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h4 style={{ fontWeight: '500', margin: 0 }}>Company Admins</h4>
                                <Button size="sm" icon={FiPlus} onClick={() => openAdminModal(company)}>
                                  Add Admin
                                </Button>
                              </div>
                              {companyAdmins[company._id]?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {companyAdmins[company._id].map((admin) => (
                                    <div
                                      key={admin._id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: '500' }}>{admin.name}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{admin.email}</div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Badge variant={admin.isActive ? 'success' : 'danger'}>
                                          {admin.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                        <button
                                          onClick={() => openAdminModal(company, admin)}
                                          style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                          title="Edit"
                                        >
                                          <FiEdit style={{ width: '16px', height: '16px' }} />
                                        </button>
                                        <button
                                          onClick={() => openResetModal(admin)}
                                          style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                          title="Reset Password"
                                        >
                                          <FiRefreshCw style={{ width: '16px', height: '16px' }} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAdmin(admin._id)}
                                          style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                          title="Deactivate"
                                        >
                                          <FiTrash2 style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>
                                  <FiUsers style={{ width: '32px', height: '32px', margin: '0 auto 8px', opacity: 0.5 }} />
                                  <p style={{ margin: 0 }}>No admins added yet</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiUsers style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Companies Found</h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Add your first company to get started</p>
              <Button onClick={() => openCompanyModal()}>Add Company</Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit)}
          total={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        />
      )}

      {/* Modals */}
      <CompanyModal
        isOpen={showCompanyModal}
        onClose={closeCompanyModal}
        company={editingCompany}
        subscriptions={subscriptions}
        onSave={handleSaveCompany}
      />

      <AdminModal
        isOpen={showAdminModal}
        onClose={closeAdminModal}
        companyId={selectedCompany?._id}
        admin={editingAdmin}
        onSave={handleSaveAdmin}
      />

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={closeResetModal}
        adminId={editingAdmin?._id}
        adminName={editingAdmin?.name}
        onReset={handleResetPassword}
      />
    </PageContainer>
  )
}