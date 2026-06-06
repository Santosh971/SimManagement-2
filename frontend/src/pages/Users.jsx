import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiX,
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
  PhoneInput,
  ConfirmModal,
  Tooltip,
} from '../components/ui'

// User Modal Component
function UserModal({ isOpen, onClose, user, onSave, users }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isActive: true,
  })
  const [errors, setErrors] = useState({})

  const validateField = (name, value) => {
    let error = ''

    switch (name) {
      case 'name':
        if (!value || !value.trim()) {
          error = 'Name is required'
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters'
        } else if (value.trim().length > 100) {
          error = 'Name cannot exceed 100 characters'
        } else if (!/^[a-zA-Z\s.''-]+$/.test(value.trim())) {
          error = 'Name can only contain letters, spaces, dots, hyphens and apostrophes'
        }
        break

      case 'email':
        if (!value || !value.trim()) {
          error = 'Email Id is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error = 'Please enter a valid email id'
        }
        break

      case 'phone':
        if (value && value.trim()) {
          if (!/^\+?\d{7,20}$/.test(value.trim())) {
            error = 'Enter a valid contact number'
          }
        }
        break

      default:
        break
    }

    return error
  }

  const validateForm = () => {
    const newErrors = {}

    const nameError = validateField('name', formData.name)
    if (nameError) newErrors.name = nameError

    // Email only validated on Add (not editable on Edit)
    if (!user) {
      const emailError = validateField('email', formData.email)
      if (emailError) newErrors.email = emailError
    }

    const phoneError = validateField('phone', formData.phone)
    if (phoneError) newErrors.phone = phoneError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  useEffect(() => {
    if (!isOpen) return
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        isActive: user.isActive ?? true,
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        isActive: true,
      })
    }
    setErrors({})
  }, [user, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({ ...prev, phone }))
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: '' }))
    }
  }

  // Validate on blur for immediate feedback
  const handleBlur = (e) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      if (user) {
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          isActive: formData.isActive,
        }
        await onSave(user._id, updateData)
        toast.success('User updated successfully.')
      } else {
        await onSave(null, formData)
        toast.success('User created successfully')
      }
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputErrorStyle = (field) => ({
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${errors[field] ? '#ef4444' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  })

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
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="John Michael Doe"
              maxLength={100}
              style={inputErrorStyle('name')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px' }}>
              {errors.name ? (
                <span style={{ color: '#ef4444' }}>{errors.name}</span>
              ) : (
                <span />
              )}
              <span style={{ color: formData.name.length >= 100 ? '#d97706' : '#9ca3af' }}>
                {formData.name.length}/100
              </span>
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              Email ID *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={!user ? handleBlur : undefined}
              placeholder="john@gmail.com"
              disabled={!!user}
              style={{
                ...inputErrorStyle('email'),
                ...(user ? {
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f3f4f6',
                  color: '#9ca3af',
                  cursor: 'not-allowed',
                } : {}),
              }}
            />
            {errors.email && !user && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', marginBottom: 0 }}>
                {errors.email}
              </p>
            )}
            {user && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Email Id cannot be changed
              </p>
            )}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '16px' }}>
            <PhoneInput
              value={formData.phone}
              onChange={handlePhoneChange}
              label="Contact Number"
              placeholder="8805771695"
            />
            {errors.phone && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', marginBottom: 0 }}>
                {errors.phone}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label
              htmlFor="isActive"
              style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}
            >
              Active User
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Reset Password Modal
function ResetPasswordModal({ isOpen, onClose, user, onReset }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await onReset(user._id, password)
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
          maxWidth: '400px',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Reset Password for {user?.name}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              New Password*
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingRight: '40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" loading={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Users() {
  const { user, api } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, activeLast30Days: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, userId: null, userName: '' })
  const fetchIdRef = useRef(0)

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [pagination.page, pagination.limit, status])

  // Debounced search - reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers()
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const fetchUsers = async () => {
    const id = ++fetchIdRef.current
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(status && { status }),
      })

      const response = await api.get(`/users?${params}`)
      if (fetchIdRef.current !== id) return
      setUsers(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      if (fetchIdRef.current !== id) return
      toast.error('Failed to fetch users')
      setUsers([])
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/users/stats')
      setStats(response.data.data || { total: 0, active: 0, inactive: 0, activeLast30Days: 0 })
    } catch (error) {
      console.error('Failed to fetch user stats')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    // Reset to page 1 when searching
    if (pagination.page === 1) {
      fetchUsers()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }

  const handleSaveUser = async (userId, data) => {
    if (userId) {
      await api.put(`/users/${userId}`, data)
    } else {
      await api.post('/users', data)
    }
    fetchUsers()
      fetchStats() // ✅ ADD THIS

  }

  const handleDelete = async (id) => {
    const user = users.find(u => u._id === id)
    setDeleteConfirm({ show: true, userId: id, userName: user?.name || 'this user' })
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${deleteConfirm.userId}`)
      toast.success('User deleted successfully.')
      setUsers(prev => prev.filter(user => user._id !== deleteConfirm.userId))
      fetchUsers()
      fetchStats()
    } catch (error) {
      toast.error('Failed to delete user')
    } finally {
      setDeleteConfirm({ show: false, userId: null, userName: '' })
    }
  }

  const handleResetPassword = async (userId, password) => {
    await api.post(`/users/${userId}/reset-password`, { password })
  }

  const openModal = (u = null) => {
    setEditingUser(u)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const openResetModal = (u) => {
    setResetUser(u)
    setShowResetModal(true)
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    setResetUser(null)
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '500' }}>{row.name}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.email}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Numbe',
      render: (row) => row.phone || '-',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'primary' : 'default'}>
          {row.role === 'admin' ? 'Admin' : 'User'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    // {
    //   key: 'lastLogin',
    //   header: 'Last Login',
    //   render: (row) =>
    //     row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never',
    // },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.role !== 'admin' ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Tooltip text="Edit">
              <button
                onClick={() => openModal(row)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <FiEdit style={{ width: '16px', height: '16px' }} />
              </button>
            </Tooltip>
            <Tooltip text="Delete">
              <button
                onClick={() => handleDelete(row._id)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#dc2626',
                }}
              >
                <FiTrash2 style={{ width: '16px', height: '16px' }} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>Admin</span>
        ),
    },
  ]

  if (loading && users.length === 0) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="Manage company users and their permissions"
        action={
          <Button icon={FiPlus} onClick={() => openModal()}>
            Add User
          </Button>
        }
      />

      {/* Stats */}
      <Grid cols={3} gap={16} style={{ marginBottom: '24px' }}>
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={FiUsers}
          iconColor="#2563eb"
          iconBg="#eff6ff"
        />
        <StatCard
          title="Active Users"
          value={stats.active}
          icon={FiUserCheck}
          iconColor="#16a34a"
          iconBg="#dcfce7"
        />
        <StatCard
          title="Inactive Users"
          value={stats.inactive}
          icon={FiUserX}
          iconColor="#dc2626"
          iconBg="#fef2f2"
        />
      </Grid>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <FiSearch
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value.replace(/[\t\n\r]+/g, '').trim())}
                placeholder="Search by name, emai idl, or contact Number..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
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
            </select>
            {/* <Button type="submit">Search</Button> */}
          </form>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table columns={columns} data={users} emptyMessage="No users found. Add your first user to get started." showSerial serialOffset={(pagination.page - 1) * pagination.limit} />
        </CardBody>
      </Card>

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

      {/* Modals */}
      <UserModal isOpen={showModal} onClose={closeModal} user={editingUser} onSave={handleSaveUser} />

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={closeResetModal}
        user={resetUser}
        onReset={handleResetPassword}
      />

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, userId: null, userName: '' })}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteConfirm.userName}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </PageContainer>
  )
}