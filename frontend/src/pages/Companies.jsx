import { useState, useEffect, useRef, Fragment } from 'react'
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
  FiToggleLeft,
  FiToggleRight,
  FiCreditCard,
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
  ConfirmModal,
} from '../components/ui'
import { formatDate, formatTime } from '../utils/dateFormat'

// Styles for CompanyModal
const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: '500',
  fontSize: '13px',
  color: '#374151',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
}

// Helper: get the correct monthly duration for a plan (free trial is always 14 days)
const getPlanDuration = (plan, billingCycle = 'monthly') => {
  if (!plan) return 0
  if (plan.planType === 'free_trial') return 14
  return billingCycle === 'yearly'
    ? (plan.durationDays?.yearly ?? 365)
    : (plan.durationDays?.monthly ?? 30)
}

// Company Modal Component
function CompanyModal({ isOpen, onClose, company, subscriptions, onSave, api }) {
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [errors, setErrors] = useState({})
  const nameCheckTimeout = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subscriptionId: '',
    subscriptionDuration: 0,
    isActive: true,
    'address.street': '',
    'address.city': '',
    'address.state': '',
    'address.country': '',
    'address.zipCode': '',
  })

  useEffect(() => {
    if (company) {
      // Find the subscription plan to get its duration
      const companyPlan = subscriptions.find(s => s._id === (company.subscriptionId?._id || company.subscriptionId))
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        subscriptionId: company.subscriptionId?._id || company.subscriptionId || '',
        subscriptionDuration: getPlanDuration(companyPlan),
        isActive: company.isActive ?? true,
        'address.street': company.address?.street || '',
        'address.city': company.address?.city || '',
        'address.state': company.address?.state || '',
        'address.country': company.address?.country || '',
        'address.zipCode': company.address?.zipCode || '',
      })
    } else {
      // For new company, set default plan and its duration
      const defaultPlan = subscriptions[0]
      setFormData({
        name: '',
        email: '',
        phone: '',
        subscriptionId: defaultPlan?._id || '',
        subscriptionDuration: getPlanDuration(defaultPlan),
        isActive: true,
        'address.street': '',
        'address.city': '',
        'address.state': '',
        'address.country': '',
        'address.zipCode': '',
      })
    }
    setNameError('')
    setErrors({})
  }, [company, subscriptions])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // Clear validation error for this field when user types
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }

    // Clear name error when name changes and run debounced check
    if (name === 'name') {
      // Strip invalid characters (allow letters, numbers, spaces, .&,'-())
      const sanitized = value.replace(/[^a-zA-Z0-9\s.&,'\-()]/g, '').slice(0, 100)
      // Collapse multiple consecutive spaces into one
      const collapsed = sanitized.replace(/\s{2,}/g, ' ')
      setFormData((prev) => ({ ...prev, name: collapsed }))
      // Validate on change
      const error = validateField('name', collapsed)
      setErrors((prev) => ({ ...prev, name: error }))
      // Clear duplicate name error and run debounced check
      setNameError('')
      if (nameCheckTimeout.current) clearTimeout(nameCheckTimeout.current)
      if (collapsed.trim().length >= 2) {
        nameCheckTimeout.current = setTimeout(async () => {
          try {
            const response = await api.get(`/companies/check-name?name=${encodeURIComponent(collapsed.trim())}`)
            if (response.data?.data?.available === false) {
              // Only show error if creating new, or editing and name actually changed
              if (!company || (company && collapsed.trim() !== company.name.trim())) {
                setNameError('A company with this name already exists')
              }
            }
          } catch {
            // Silently fail — server will validate on submit
          }
        }, 500)
      }
      return
    }

    // Auto-populate subscriptionDuration when plan is selected
    if (name === 'subscriptionId') {
      const selectedPlan = subscriptions.find((sub) => sub._id === value)
      const duration = getPlanDuration(selectedPlan)
      setFormData((prev) => ({ ...prev, subscriptionDuration: duration }))
    }
  }

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({ ...prev, phone }))
    // Clear phone error when user changes phone
    if (errors.phone) {
      setErrors((prev) => {
        const updated = { ...prev }
        delete updated.phone
        return updated
      })
    }
  }

  // Validate a single field, returns error message or empty string
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value || !value.trim()) return 'Company name is required'
        if (value.trim().length < 2) return 'Company name must be at least 2 characters'
        if (value.trim().length > 100) return 'Company name cannot exceed 100 characters'
        if (/[!@#$%^*+=\[\]{}|;:"<>?~`]/.test(value)) return 'Company name cannot contain special characters like @#$%^*+='
        if (/\s{2,}/.test(value)) return 'Company name cannot contain consecutive spaces'
        if (/^[\s]/.test(value)) return 'Company name cannot start with a space'
        if (!/^[a-zA-Z0-9\s.&,'\-()]+$/.test(value.trim())) return "Company name can only contain letters, numbers, spaces, and .&,'-()"
        return ''
      case 'email':
        if (!value || !value.trim()) return 'Email is required'
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) return 'Please enter a valid email address (e.g., user@domain.com)'
        return ''
      case 'phone':
        if (value && value.trim()) {
          const trimmed = value.trim()
          // Indian number validation: must start with 6-9 and be exactly 10 digits
          if (trimmed.startsWith('+91')) {
            const localDigits = trimmed.slice(3) // Strip '+91'
            if (localDigits.length !== 10) return 'Indian contact number must be exactly 10 digits'
            if (!/^[6-9]/.test(localDigits)) return 'Indian contact number must start with 6-9'
          } else if (/^\+\d/.test(trimmed)) {
            // Other country codes: strip the '+' and country code, validate remaining digits
            const localDigits = trimmed.replace(/^\+\d{1,4}/, '')
            if (!/^\d{7,15}$/.test(localDigits)) return 'Enter a valid contact number (7-15 digits)'
          } else {
            // No country code: validate as plain digits
            if (!/^\d{7,15}$/.test(trimmed)) return 'Enter a valid contact number (7-15 digits)'
          }
        }
        return ''
      case 'subscriptionId':
        if (!value) return 'Please select a subscription plan'
        return ''
      case 'address.street':
        if (value && value.length > 200) return 'Street cannot exceed 200 characters'
        return ''
      case 'address.city':
        if (value && value.length > 100) return 'City cannot exceed 100 characters'
        return ''
      case 'address.state':
        if (value && value.length > 100) return 'State cannot exceed 100 characters'
        return ''
      case 'address.country':
        if (value && value.length > 100) return 'Country cannot exceed 100 characters'
        return ''
      case 'address.zipCode':
        if (value && value.trim() && !/^[a-zA-Z0-9\s-]{1,20}$/.test(value.trim())) return 'Invalid zip/postal code format'
        return ''
      default:
        return ''
    }
  }

  // Handle blur — validate the field
  const handleBlur = (e) => {
    const { name, value } = e.target
    // Trim leading/trailing spaces for name on blur
    if (name === 'name') {
      const trimmed = value.trim()
      if (trimmed !== value) {
        setFormData((prev) => ({ ...prev, name: trimmed }))
      }
      const error = validateField('name', trimmed)
      setErrors((prev) => ({ ...prev, name: error }))
    } else {
      const error = validateField(name, value)
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Collect all validation errors
    const newErrors = {}
    const trimmedName = formData.name.trim()
    const fieldsToValidate = ['name', 'email', 'phone', 'subscriptionId', 'address.street', 'address.city', 'address.state', 'address.country', 'address.zipCode']
    fieldsToValidate.forEach((field) => {
      const value = field === 'name' ? trimmedName : formData[field]
      const error = validateField(field, value)
      if (error) newErrors[field] = error
    })

    // Check for duplicate company name
    if (nameError) {
      newErrors.name = nameError
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    const data = {
      name: trimmedName,
      email: formData.email,
      phone: formData.phone,
      subscriptionId: formData.subscriptionId,
      subscriptionDuration: formData.subscriptionDuration,
      isActive: formData.isActive,
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
        toast.success('Company updated successfully.')
      } else {
        await onSave(null, data)
        toast.success('Company created successfully.')
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
   <div
  style={{
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
    boxSizing: 'border-box',
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
      display: 'flex',
      flexDirection: 'column',
    }}
    onClick={(e) => e.stopPropagation()}
  >
    {/* Sticky Header */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff',
        zIndex: 1,
        flexShrink: 0,
      }}
    >
      <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: '#111827' }}>
        {company ? 'Edit Company' : 'Add New Company'}
      </h2>
      <button
        onClick={onClose}
        style={{
          padding: '6px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FiX style={{ width: '18px', height: '18px', color: '#6b7280' }} />
      </button>
    </div>

    {/* Form */}
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        flex: 1,
      }}
    >
      {/* Company Name + Email */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Company Name<span style={{ color: '#dc2626' }}>*</span></label>
            <span style={{ fontSize: '12px', color: formData.name?.length >= 90 ? '#ef4444' : '#9ca3af' }}>
              {formData.name?.length || 0}/100
            </span>
          </div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter company name"
            maxLength={100}
            style={{
              ...inputStyle,
              borderColor: errors.name || nameError ? '#ef4444' : '#d1d5db',
            }}
          />
          {errors.name || nameError ? (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
              {errors.name || nameError}
            </p>
          ) : (
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
              Letters, numbers, spaces, and .&amp;,&#39;-() allowed (2-100 characters)
            </p>
          )}
        </div>
        <div>
          <label style={labelStyle}>Email ID<span style={{ color: '#dc2626' }}>*</span></label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="company@example.com"
            disabled={!!company}
            style={{
              ...inputStyle,
              borderColor: errors.email ? '#ef4444' : '#d1d5db',
              ...(company ? {
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                cursor: 'not-allowed',
              } : {}),
            }}
          />
          {errors.email && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Phone + Subscription Plan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
        <div>
          <PhoneInput
            value={formData.phone}
            onChange={handlePhoneChange}
            onBlur={() => {
              const error = validateField('phone', formData.phone)
              setErrors((prev) => ({ ...prev, phone: error }))
            }}
            label="Contact Number"
            placeholder="Contact Number"
            error={errors.phone || ''}
          />
          {!errors.phone && (
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
              Indian numbers must start with 6-9 and be 10 digits
            </p>
          )}
        </div>
        {/* <div>
          <label style={labelStyle}>Subscription Plan *</label>
          <select
            name="subscriptionId"
            value={formData.subscriptionId}
            onChange={handleChange}
            style={inputStyle}
            required
            disabled={!!company}
          >
            <option value="">Select plan</option>
            {subscriptions.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name}{sub.planType === 'free_trial' ? ` (14 days)` : ` - ₹${sub.price?.monthly || 0}/mo (${getPlanDuration(sub)} days)`}
              </option>
            ))}
          </select>
        </div> */}
      </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
     
        <div>
          <label style={labelStyle}>Subscription Plan<span style={{ color: '#dc2626' }}>*</span></label>
          <select
            name="subscriptionId"
            value={formData.subscriptionId}
            onChange={handleChange}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor: errors.subscriptionId ? '#ef4444' : '#d1d5db',
              ...(company ? {
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                cursor: 'not-allowed',
                opacity: '1',
              } : {}),
            }}
            disabled={!!company}
          >
            <option value="">Select plan</option>
            {subscriptions.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name}{sub.planType === 'free_trial' ? ` (14 days)` : ` - ₹${sub.price?.monthly || 0}/mo (${getPlanDuration(sub)} days)`}
              </option>
            ))}
          </select>
          {errors.subscriptionId && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
              {errors.subscriptionId}
            </p>
          )}
        </div>
      </div>

      {/* Subscription Duration — Add only */}
      {!company && (
        <div>
          <label style={labelStyle}>Subscription Duration (days)</label>
          <input
            type="number"
            readOnly
            name="subscriptionDuration"
            value={formData.subscriptionDuration || ''}
            onChange={handleChange}
            min="1"
            max="365"
            placeholder="Duration from selected plan"
            style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'default' }}
          />
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
            Auto-filled from selected plan. You can modify if needed.
          </p>
        </div>
      )}

      {/* Active Toggle — Edit only */}
      {company && (
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              style={{ width: '16px', height: '16px', marginTop: '2px', flexShrink: 0, cursor: 'pointer' }}
            />
            <div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                Company Active
              </span>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0 0', lineHeight: '1.5' }}>
                When inactive, company users cannot access the system regardless of subscription status.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Address Section */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0' }}>
          Address
        </h4>

        {/* Street + City */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div>
            <label style={labelStyle}>Street</label>
            <input
              type="text"
              name="address.street"
              value={formData['address.street']}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Street address"
              style={{
                ...inputStyle,
                borderColor: errors['address.street'] ? '#ef4444' : '#d1d5db',
              }}
            />
            {errors['address.street'] && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                {errors['address.street']}
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              name="address.city"
              value={formData['address.city']}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="City"
              style={{
                ...inputStyle,
                borderColor: errors['address.city'] ? '#ef4444' : '#d1d5db',
              }}
            />
            {errors['address.city'] && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                {errors['address.city']}
              </p>
            )}
          </div>
        </div>

        {/* State + Country */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>State/Province</label>
            <input
              type="text"
              name="address.state"
              value={formData['address.state']}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="State"
              style={{
                ...inputStyle,
                borderColor: errors['address.state'] ? '#ef4444' : '#d1d5db',
              }}
            />
            {errors['address.state'] && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                {errors['address.state']}
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <input
              type="text"
              name="address.country"
              value={formData['address.country']}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Country"
              style={{
                ...inputStyle,
                borderColor: errors['address.country'] ? '#ef4444' : '#d1d5db',
              }}
            />
            {errors['address.country'] && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                {errors['address.country']}
              </p>
            )}
          </div>
        </div>

        {/* Zip / Postal Code */}
        <div>
          <label style={labelStyle}>Zip/Postal Code</label>
          <input
            type="text"
            name="address.zipCode"
            value={formData['address.zipCode']}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Zip code"
            style={{
              ...inputStyle,
              borderColor: errors['address.zipCode'] ? '#ef4444' : '#d1d5db',
            }}
          />
          {errors['address.zipCode'] && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
              {errors['address.zipCode']}
            </p>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          marginTop: '4px',
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="secondary"
          onClick={onClose}
          style={{ minWidth: '80px', fontSize: '13px' }}
        >
          Cancel
        </Button>
        <Button
          loading={loading}
          style={{ minWidth: '80px', fontSize: '13px' }}
        >
          {company ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  </div>
</div>
  )
}

// Admin Modal Component
function AdminModal({ isOpen, onClose, companyId, admin, onSave }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [emailError, setEmailError] = useState('')
  const emailCheckTimeout = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    isActive: true,
  })

  const PASSWORD_MIN = 8
  const PASSWORD_MAX = 32

  const validateField = (name, value) => {
    if (name === 'name') {
      if (!value || !value.trim()) return 'Full name is required'
      if (value.trim().length < 2) return 'Name must be at least 2 characters'
      if (value.length > 50) return 'Name cannot exceed 50 characters'
      if (/[0-9]/.test(value)) return 'Name cannot contain numbers'
      if (/[!@#$%^&*()_+=\[\]{};':"\\|,<>\/?~`]/.test(value)) return 'Name cannot contain special characters'
      if (/\s{2,}/.test(value)) return 'Name cannot contain consecutive spaces'
      if (/^[\s]/.test(value)) return 'Name cannot start with a space'
      if (/[\s]$/.test(value)) return 'Name cannot end with a space'
      if (!/^[a-zA-Z\s.'-]+$/.test(value.trim())) return 'Name can only contain letters, spaces, periods, apostrophes, and hyphens'
    }
    if (name === 'email') {
      if (!value || !value.trim()) return 'Email is required'
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) return 'Please enter a valid email address (e.g., user@domain.com)'
    }
    if (name === 'password') {
      if (!value) return 'Password is required'
      if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`
      if (value.length > PASSWORD_MAX) return `Password must not exceed ${PASSWORD_MAX} characters`
      if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
      if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter'
      if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return 'Password must contain at least one special character'
    }
    return ''
  }

  // Password strength calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= PASSWORD_MIN) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++
    if (score <= 2) return { score, label: 'Weak', color: '#ef4444' }
    if (score <= 4) return { score, label: 'Medium', color: '#f59e0b' }
    return { score, label: 'Strong', color: '#16a34a' }
  }

  useEffect(() => {
    if (isOpen) {
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
      setShowPassword(false)
      setErrors({})
      setEmailError('')
    }
  }, [admin, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    // Enforce max length and strip invalid characters for name field
    if (name === 'name') {
      // Strip numbers and special characters (allow only letters, spaces, ., ', -)
      const sanitized = value.replace(/[^a-zA-Z\s.'\-]/g, '').slice(0, 50)
      // Collapse multiple consecutive spaces into one
      const collapsed = sanitized.replace(/\s{2,}/g, ' ')
      setFormData((prev) => ({
        ...prev,
        name: collapsed,
      }))
      const error = validateField('name', collapsed)
      setErrors((prev) => ({ ...prev, name: error }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Validate password on change (immediate feedback)
    if (name === 'password') {
      const error = validateField(name, value)
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
    // Validate email on change (immediate feedback) + debounced duplicate check
    if (name === 'email') {
      // Clear duplicate email error when user starts typing
      if (emailError) setEmailError('')
      // Only show format validation if user has typed something
      if (value && value.trim()) {
        const error = validateField('email', value)
        setErrors((prev) => ({ ...prev, email: error }))
      } else {
        // Clear error when field is empty (don't nag while empty)
        setErrors((prev) => ({ ...prev, email: '' }))
      }
      // Debounced duplicate email check for new admins
      if (!admin) {
        if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
        if (value && value.trim() && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) {
          emailCheckTimeout.current = setTimeout(async () => {
            try {
              const response = await api.get(`/companies/check-admin-email?email=${encodeURIComponent(value.trim())}`)
              if (response.data?.data?.exists) {
                setEmailError('This email is already registered. Please use a different email.')
              }
            } catch {
              // Silently fail — server will validate on submit
            }
          }, 500)
        }
      }
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    if (name === 'name') {
      // Trim leading/trailing spaces on blur
      const trimmed = value.trim()
      if (trimmed !== value) {
        setFormData((prev) => ({ ...prev, name: trimmed }))
      }
      const error = validateField('name', trimmed)
      setErrors((prev) => ({ ...prev, name: error }))
    } else if (name === 'email' || name === 'password') {
      const error = validateField(name, value)
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({ ...prev, phone }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all fields
    const newErrors = {}
    const trimmedName = formData.name.trim()
    const nameErr = validateField('name', trimmedName)
    if (nameErr) newErrors.name = nameErr
    const emailErr = validateField('email', formData.email)
    if (emailErr) newErrors.email = emailErr
    // Check for duplicate email (from debounced check)
    if (emailError) newErrors.email = emailError
    if (!admin) {
      const pwdErr = validateField('password', formData.password)
      if (pwdErr) newErrors.password = pwdErr
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      if (admin) {
        await onSave(admin._id, {
          name: trimmedName,
          phone: formData.phone,
          isActive: formData.isActive,
        })
        // Toast is handled in handleSaveAdmin
      } else {
        await onSave(null, { ...formData, name: trimmedName })
        // Toast is handled in handleSaveAdmin
      }
      onClose()
    } catch (error) {
      const message = error.response?.data?.message || 'Operation failed'
      // Check if it's a duplicate email error and show inline
      if (message.toLowerCase().includes('email') && message.toLowerCase().includes('already')) {
        setErrors((prev) => ({ ...prev, email: message }))
      } else {
        toast.error(message)
      }
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
    }}>
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

        <form onSubmit={handleSubmit} noValidate style={{ padding: '24px' }} autoComplete="off">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Full Name<span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span style={{ fontSize: '12px', color: formData.name?.length >= 45 ? '#ef4444' : '#9ca3af' }}>
                {formData.name?.length || 0}/50
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
               placeholder="John Doe"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {errors.name ? (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>{errors.name}</p>
            ) : (
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>Only letters, spaces, periods, hyphens, and apostrophes allowed</p>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Email ID<span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="admin@company.com"
                autoComplete="off"
                disabled={!!admin}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: `1px solid ${(errors.email || emailError) ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  ...(admin ? { backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' } : {}),
                }}
              />
            </div>
            {(errors.email || emailError) && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>{emailError || errors.email}</p>
            )}
          </div>

          <PhoneInput
            value={formData.phone}

            onChange={handlePhoneChange}
            label="Contact Number(Optional)"
            placeholder="9874563210"
          />

          {!admin && (
            <div style={{ marginBottom: '16px' , marginTop : '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Password<span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0' }}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={`${PASSWORD_MIN}-${PASSWORD_MAX} Characters`}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      border: `1px solid ${errors.password ? '#dc2626' : '#d1d5db'}`,
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '10px 14px',
                    border: `1px solid ${errors.password ? '#dc2626' : '#d1d5db'}`,
                    borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    background: '#d1d5db',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                  }}
                >
                  {showPassword ? <FiEye style={{ width: '16px', height: '16px' }} /> : <FiEyeOff style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>{errors.password}</p>
              )}
              {/* Password format guidance — always visible, replaced by dynamic checklist when typing */}
              {!formData.password ? (
                <div style={{ marginTop: '6px', padding: '8px 10px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '500' }}>Password must contain:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#d1d5db' }}>●</span>
                      {PASSWORD_MIN}-{PASSWORD_MAX} characters
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#d1d5db' }}>●</span>
                      One uppercase letter (A-Z)
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#d1d5db' }}>●</span>
                      One lowercase letter (a-z)
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#d1d5db' }}>●</span>
                      One number (0-9)
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#d1d5db' }}>●</span>
                      One special character (!@#$%...)
                    </div>
                  </div>
                </div>
              ) : !errors.password ? (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(getPasswordStrength(formData.password).score / 6) * 100}%`,
                        backgroundColor: getPasswordStrength(formData.password).color,
                        borderRadius: '2px',
                        transition: 'all 0.2s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: getPasswordStrength(formData.password).color, minWidth: '45px' }}>
                      {getPasswordStrength(formData.password).label}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                    <div style={{ fontSize: '11px', color: formData.password.length >= PASSWORD_MIN ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: formData.password.length >= PASSWORD_MIN ? '#16a34a' : '#d1d5db' }}>●</span>
                      {PASSWORD_MIN}-{PASSWORD_MAX} characters
                    </div>
                    <div style={{ fontSize: '11px', color: /[A-Z]/.test(formData.password) ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: /[A-Z]/.test(formData.password) ? '#16a34a' : '#d1d5db' }}>●</span>
                      One uppercase letter (A-Z)
                    </div>
                    <div style={{ fontSize: '11px', color: /[a-z]/.test(formData.password) ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: /[a-z]/.test(formData.password) ? '#16a34a' : '#d1d5db' }}>●</span>
                      One lowercase letter (a-z)
                    </div>
                    <div style={{ fontSize: '11px', color: /[0-9]/.test(formData.password) ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: /[0-9]/.test(formData.password) ? '#16a34a' : '#d1d5db' }}>●</span>
                      One number (0-9)
                    </div>
                    <div style={{ fontSize: '11px', color: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '#16a34a' : '#d1d5db' }}>●</span>
                      One special character (!@#$%...)
                    </div>
                  </div>
                </div>
              ) : null}
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
    }}>
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

        <form onSubmit={handleSubmit} noValidate style={{ padding: '24px' }}>
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

// Manage Plan Modal Component
function ManagePlanModal({ isOpen, onClose, company, subscriptions, api, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('renew')
  const [formData, setFormData] = useState({
    subscriptionId: '',
    billingCycle: 'monthly',
  })
  const [extendDays, setExtendDays] = useState(7)

  useEffect(() => {
    if (isOpen && company) {
      setFormData({
        subscriptionId: company.subscriptionId?._id || company.subscriptionId || '',
        billingCycle: company.billingCycle || 'monthly',
      })
      setExtendDays(7)
      setActiveTab(company.isTrial ? 'extend' : 'renew')
    }
  }, [isOpen, company])

  const handleRenewSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subscriptionId) {
      toast.error('Please select a subscription plan')
      return
    }

    setLoading(true)
    try {
      await api.post(`/companies/${company._id}/renew-subscription`, {
        subscriptionId: formData.subscriptionId,
        billingCycle: formData.billingCycle,
      })
      toast.success('Subscription renewed/updated successfully')
      onRefresh()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to renew subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleExtendTrial = async (e) => {
    e.preventDefault()
    if (extendDays < 1 || extendDays > 30) {
      toast.error('Trial extension must be between 1 and 30 days')
      return
    }

    setLoading(true)
    try {
      await api.post(`/companies/${company._id}/extend-trial`, { days: extendDays })
      toast.success(`Trial extended by ${extendDays} days`)
      onRefresh()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to extend trial')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !company) return null

  const currentPlanName = company.subscriptionId?.name || 'N/A'
  const expiryDate = company.subscriptionEndDate
    ? formatDate(company.subscriptionEndDate)
    : 'N/A'
  const billingLabel = company.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: '16px', boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff', borderRadius: '12px',
          width: '100%', maxWidth: '500px', maxHeight: '90vh',
          overflow: 'auto', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #e5e7eb',
          position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 1, flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: '#111827' }}>
            Manage Plans — {company.name}
          </h2>
          <button onClick={onClose} style={{
            padding: '6px', borderRadius: '8px', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <FiX style={{ width: '18px', height: '18px', color: '#6b7280' }} />
          </button>
        </div>

        {/* Current plan info card */}
        <div style={{
          margin: '16px 18px 0', padding: '12px 14px',
          backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '6px' }}>
            CURRENT PLAN
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                {currentPlanName}
              </span>
              {company.isTrial && (
                <span style={{
                  marginLeft: '8px', fontSize: '11px', fontWeight: '500',
                  backgroundColor: '#fef3c7', color: '#92400e',
                  padding: '2px 8px', borderRadius: '12px',
                }}>
                  Trial
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: '#374151' }}>
                {billingLabel}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Expires: {expiryDate}
              </div>
            </div>
          </div>
        </div>

        {/* Tab selector */}
        <div style={{
          display: 'flex', margin: '16px 18px 0',
          backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px',
        }}>
          <button
            onClick={() => setActiveTab('renew')}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              backgroundColor: activeTab === 'renew' ? '#ffffff' : 'transparent',
              color: activeTab === 'renew' ? '#111827' : '#6b7280',
              boxShadow: activeTab === 'renew' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Renew / Change Plan
          </button>
          {company.isTrial && (
            <button
              onClick={() => setActiveTab('extend')}
              style={{
                flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                backgroundColor: activeTab === 'extend' ? '#ffffff' : 'transparent',
                color: activeTab === 'extend' ? '#111827' : '#6b7280',
                boxShadow: activeTab === 'extend' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Extend Trial
            </button>
          )}
        </div>

        {/* Tab content */}
        <div style={{ padding: '18px' }}>
          {/* Extend Trial tab */}
          {activeTab === 'extend' && company.isTrial && (
            <form onSubmit={handleExtendTrial}>
              <label style={labelStyle}>Days to Extend (1-30)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', marginBottom: '0' }}>
                Current trial ends on {expiryDate}. Extension will add {extendDays} day{extendDays !== 1 ? 's' : ''} to the trial period.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button loading={loading}>Extend Trial</Button>
              </div>
            </form>
          )}

          {/* Renew / Change Plan tab */}
          {activeTab === 'renew' && (
            <form onSubmit={handleRenewSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Subscription Plan *</label>
                <select
                  name="subscriptionId"
                  value={formData.subscriptionId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscriptionId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Select plan</option>
                  {subscriptions.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}{sub.planType === 'free_trial' ? ' (Trial)' : ''} — ₹{sub.price?.monthly || 0}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Billing Cycle</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                    padding: '10px 14px', borderRadius: '8px',
                    border: formData.billingCycle === 'monthly' ? '2px solid #2563eb' : '1px solid #d1d5db',
                    backgroundColor: formData.billingCycle === 'monthly' ? '#eff6ff' : '#ffffff',
                    fontSize: '14px', flex: 1,
                  }}>
                    <input
                      type="radio" name="billingCycle" value="monthly"
                      checked={formData.billingCycle === 'monthly'}
                      onChange={() => setFormData((prev) => ({ ...prev, billingCycle: 'monthly' }))}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500' }}>Monthly</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{(() => {
                        const plan = subscriptions.find((s) => s._id === formData.subscriptionId)
                        return plan?.planType === 'free_trial' ? '14-day trial' : `${getPlanDuration(plan)}-day billing`
                      })()}</div>
                    </div>
                  </label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                    padding: '10px 14px', borderRadius: '8px',
                    border: formData.billingCycle === 'yearly' ? '2px solid #2563eb' : '1px solid #d1d5db',
                    backgroundColor: formData.billingCycle === 'yearly' ? '#eff6ff' : '#ffffff',
                    fontSize: '14px', flex: 1,
                  }}>
                    <input
                      type="radio" name="billingCycle" value="yearly"
                      checked={formData.billingCycle === 'yearly'}
                      onChange={() => setFormData((prev) => ({ ...prev, billingCycle: 'yearly' }))}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500' }}>Yearly</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{(() => {
                        const plan = subscriptions.find((s) => s._id === formData.subscriptionId)
                        return plan?.planType === 'free_trial' ? '14-day trial' : `${getPlanDuration(plan, 'yearly')}-day billing`
                      })()}</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Duration preview */}
              {formData.subscriptionId && (() => {
                const selectedPlan = subscriptions.find((s) => s._id === formData.subscriptionId)
                if (!selectedPlan) return null
                const duration = getPlanDuration(selectedPlan, formData.billingCycle)
                const price = formData.billingCycle === 'yearly'
                  ? selectedPlan.price?.yearly
                  : selectedPlan.price?.monthly
                return (
                  <div style={{
                    padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px',
                    border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534',
                    marginBottom: '14px',
                  }}>
                    Duration: {duration} days — ₹{price}
                    {formData.billingCycle === 'yearly' && selectedPlan.price?.monthly && selectedPlan.price?.yearly && (
                      <span style={{ color: '#16a34a', marginLeft: '8px' }}>
                        (Save ₹{selectedPlan.price.monthly * 12 - selectedPlan.price.yearly}/year)
                      </span>
                    )}
                  </div>
                )
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button loading={loading}>
                  {company.isTrial ? 'Convert to Paid Plan' : 'Renew / Change Plan'}
                </Button>
              </div>
            </form>
          )}
        </div>
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

  // Delete confirmation state
  const [deleteCompanyConfirm, setDeleteCompanyConfirm] = useState({ show: false, companyId: null, companyName: '' })
  const [deleteAdminConfirm, setDeleteAdminConfirm] = useState({ show: false, adminId: null, adminName: '', companyId: null })

  // Toggle active status confirmation state
  const [toggleActiveConfirm, setToggleActiveConfirm] = useState({ show: false, companyId: null, companyName: '', currentStatus: true })

  // Manage plan modal state
  const [showManagePlanModal, setShowManagePlanModal] = useState(false)
  const [planModalCompany, setPlanModalCompany] = useState(null)

  // Admins state
  const [companyAdmins, setCompanyAdmins] = useState({})
  const [expandedCompanies, setExpandedCompanies] = useState([])
  const fetchIdRef = useRef(0)

  useEffect(() => {
    fetchCompanies()
    fetchSubscriptions()
  }, [pagination.page, pagination.limit])

  // Reset to page 1 when status filter changes
  useEffect(() => {
    if (pagination.page === 1) {
      fetchCompanies()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [status])

  const fetchCompanies = async () => {
    const id = ++fetchIdRef.current
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
      if (fetchIdRef.current !== id) return
      setCompanies(response.data.data || [])
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }))
    } catch (err) {
      if (fetchIdRef.current !== id) return
      console.error('Failed to fetch companies:', err)
      const message = err.response?.data?.message || err.message || 'Failed to fetch companies'
      setError(message)
      toast.error(message)
      setCompanies([])
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
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
        [companyId]: response.data.data || [],
      }))
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch admins:', error)
      throw error
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

  const handleDeleteCompany = (id) => {
    const company = companies.find((c) => c._id === id)
    setDeleteCompanyConfirm({ show: true, companyId: id, companyName: company?.name || '' })
  }

  const confirmDeleteCompany = async () => {
    try {
      await api.delete(`/companies/${deleteCompanyConfirm.companyId}`)
      toast.success('Company deleted successfully')
      fetchCompanies()
    } catch (error) {
      toast.error('Failed to delete company')
    } finally {
      setDeleteCompanyConfirm({ show: false, companyId: null, companyName: '' })
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

        // Update admin count in companies list (only for new admins)
        setCompanies((prevCompanies) =>
          prevCompanies.map((company) =>
            company._id === selectedCompany._id
              ? { ...company, adminCount: (company.adminCount || 0) + 1 }
              : company
          )
        )
      }
      // Refresh admin list after successful save
      try {
        await fetchCompanyAdmins(selectedCompany._id)
      } catch (refreshError) {
        console.error('Failed to refresh admin list:', refreshError)
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save admin'
      toast.error(message)
    }
  }

  const handleDeleteAdmin = (adminId, companyId) => {
    const admin = companyAdmins[companyId]?.find((a) => a._id === adminId)
    setDeleteAdminConfirm({ show: true, adminId, adminName: admin?.name || '', companyId })
  }

  const confirmDeleteAdmin = async () => {
    try {
      await api.delete(`/companies/admins/${deleteAdminConfirm.adminId}`)
      toast.success('Admin deleted successfully')
      const companyId = deleteAdminConfirm.companyId
      setDeleteAdminConfirm({ show: false, adminId: null, adminName: '', companyId: null })

      // Update admin count in companies list
      setCompanies((prevCompanies) =>
        prevCompanies.map((company) =>
          company._id === companyId
            ? { ...company, adminCount: Math.max(0, (company.adminCount || 1) - 1) }
            : company
        )
      )

      // Refresh admin list after successful delete
      try {
        const response = await api.get(`/companies/${companyId}/admins`)
        setCompanyAdmins((prev) => ({
          ...prev,
          [companyId]: response.data.data || [],
        }))
      } catch (refreshError) {
        console.error('Failed to refresh admin list:', refreshError)
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete admin'
      toast.error(message)
      setDeleteAdminConfirm({ show: false, adminId: null, adminName: '', companyId: null })
    }
  }

  // Toggle company active/suspended status
  const handleToggleActive = (company) => {
    setToggleActiveConfirm({
      show: true,
      companyId: company._id,
      companyName: company.name,
      currentStatus: company.isActive,
    })
  }

  const confirmToggleActive = async () => {
    try {
      const newStatus = !toggleActiveConfirm.currentStatus
      await api.put(`/companies/${toggleActiveConfirm.companyId}`, { isActive: newStatus })
      toast.success(newStatus ? 'Company reactivated successfully' : 'Company suspended successfully')
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update company status')
    } finally {
      setToggleActiveConfirm({ show: false, companyId: null, companyName: '', currentStatus: true })
    }
  }

  // Manage plan modal
  const openManagePlanModal = (company) => {
    setPlanModalCompany(company)
    setShowManagePlanModal(true)
  }

  const closeManagePlanModal = () => {
    setShowManagePlanModal(false)
    setPlanModalCompany(null)
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
        fetchCompanyAdmins(companyId).catch(err => console.error('Failed to fetch admins:', err))
      }
    }
  }

  const openCompanyModal = (company = null) => {
    setEditingCompany(company)
    setShowCompanyModal(true)
    // Refresh subscriptions to get latest data including subscriptionDuration
    fetchSubscriptions()
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
        // action={
        //   <Button icon={FiPlus} onClick={() => openCompanyModal()}>
        //     Add Company
        //   </Button>
        // }
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
                    <th style={{ width: '50px', padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>S.No.</th>
                    <th style={{ width: '40px', padding: '12px 16px' }}></th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Company Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Email ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px', minWidth: '140px' }}>Created</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Type</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Subscription</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Expiry Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Admins</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company, index) => (
                    <Fragment key={company._id}>
                      <tr style={{ borderTop: '1px solid #e5e7eb', cursor: 'pointer' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{(pagination.page - 1) * pagination.limit + index + 1}</td>
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
                          {company.createdAt ? (
                            <div style={{ lineHeight: '1.5' }}>
                              <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{formatDate(company.createdAt)}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatTime(company.createdAt)}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Badge variant={company.createdBy ? 'primary' : 'default'}>
                            {company.createdBy ? 'Admin' : 'Self'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant="default">{company.subscriptionId?.name || 'N/A'}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>{formatDate(company.subscriptionEndDate)}</div>
                          {company.subscriptionStatus === 'expiring' && (
                            <span style={{ fontSize: '12px', color: '#d97706' }}>Expiring soon</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={getStatusBadge(company)}>{getStatusLabel(company)}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Badge variant={company.adminCount > 0 ? 'primary' : 'default'}>
                            {company.adminCount ?? (companyAdmins[company._id]?.length || 0)}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* <button
                              onClick={() => openAdminModal(company)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Add Admin"
                            >
                              <FiUser style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                            </button> */}
                            <button
                              onClick={() => openCompanyModal(company)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Edit"
                            >
                              <FiEdit style={{ width: '16px', height: '16px' }} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(company)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title={company.isActive ? 'Suspend Company' : 'Reactivate Company'}
                            >
                              {company.isActive ? (
                                <FiToggleLeft style={{ width: '16px', height: '16px', color: '#d97706' }} />
                              ) : (
                                <FiToggleRight style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                              )}
                            </button>
                            <button
                              onClick={() => openManagePlanModal(company)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Manage Plans"
                            >
                              <FiCreditCard style={{ width: '16px', height: '16px', color: '#2563eb' }} />
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
                          <td colSpan="11" style={{ backgroundColor: '#f9fafb', padding: '16px' }}>
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h4 style={{ fontWeight: '500', margin: 0 }}>Company Admins</h4>
                                {/* <Button size="sm" icon={FiPlus} onClick={() => openAdminModal(company)}>
                                  Add Admin
                                </Button> */}
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
                                        {/* <button
                                          onClick={() => openAdminModal(company, admin)}
                                          style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                          title="Edit"
                                        >
                                          <FiEdit style={{ width: '16px', height: '16px' }} />
                                        </button> */}
                                        {/* <button
                                          onClick={() => openResetModal(admin)}
                                          style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                          title="Reset Password"
                                        >
                                          <FiRefreshCw style={{ width: '16px', height: '16px' }} />
                                        </button> */}
                                        {/* <button
                                          onClick={() => handleDeleteAdmin(admin._id, company._id)}
                                          style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                          title="Delete"
                                        >
                                          <FiTrash2 style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                                        </button> */}
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
             
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Companies Found</h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Add your first company to get started</p>
              {/* <Button onClick={() => openCompanyModal()}>+ Add Company</Button> */}
            
                 {/* <Button icon={FiPlus} onClick={() => openCompanyModal()}>
                     Add Company
                 </Button>             */}
            </div>
          )}
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
      <CompanyModal
        isOpen={showCompanyModal}
        onClose={closeCompanyModal}
        company={editingCompany}
        subscriptions={subscriptions}
        onSave={handleSaveCompany}
        api={api}
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

      {/* Delete Company Confirmation */}
      <ConfirmModal
        isOpen={deleteCompanyConfirm.show}
        onClose={() => setDeleteCompanyConfirm({ show: false, companyId: null, companyName: '' })}
        onConfirm={confirmDeleteCompany}
        title="Delete Company"
        message={`Are you sure you want to delete "${deleteCompanyConfirm.companyName}"? This will delete all associated admins.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete Admin Confirmation */}
      <ConfirmModal
        isOpen={deleteAdminConfirm.show}
        onClose={() => setDeleteAdminConfirm({ show: false, adminId: null, adminName: '', companyId: null })}
        onConfirm={confirmDeleteAdmin}
        title="Delete Admin"
        message={`Are you sure you want to permanently delete admin "${deleteAdminConfirm.adminName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Toggle Active Status Confirmation */}
      <ConfirmModal
        isOpen={toggleActiveConfirm.show}
        onClose={() => setToggleActiveConfirm({ show: false, companyId: null, companyName: '', currentStatus: true })}
        onConfirm={confirmToggleActive}
        title={toggleActiveConfirm.currentStatus ? 'Suspend Company' : 'Reactivate Company'}
        message={
          toggleActiveConfirm.currentStatus
            ? `Are you sure you want to suspend "${toggleActiveConfirm.companyName}"? The company and its users will lose access to the system.`
            : `Are you sure you want to reactivate "${toggleActiveConfirm.companyName}"? The company users will regain access to the system.`
        }
        confirmText={toggleActiveConfirm.currentStatus ? 'Suspend' : 'Reactivate'}
        variant={toggleActiveConfirm.currentStatus ? 'warning' : 'primary'}
      />

      {/* Manage Plan Modal */}
      <ManagePlanModal
        isOpen={showManagePlanModal}
        onClose={closeManagePlanModal}
        company={planModalCompany}
        subscriptions={subscriptions}
        api={api}
        onRefresh={fetchCompanies}
      />
    </PageContainer>
  )
}