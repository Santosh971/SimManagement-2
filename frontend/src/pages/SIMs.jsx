import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPlus,
  FiSearch,
  FiDownload,
  FiEdit,
  FiTrash2,
  FiSmartphone,
  FiMessageCircle,
  FiX,
  FiUser,
  FiUpload,
  FiRefreshCw,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  StatCard,
  Badge,
  Button,
  Table,
  Spinner,
  Pagination,
  Grid,
  CountryCodeSelect,
  ConfirmModal,
} from '../components/ui'
import { countryCodes, getFlagUrl, getFlagFromPhone } from '../data/countries'

// Toggle Switch Component
// [WHATSAPP/TELEGRAM TOGGLE SYNC] - Made read-only, status derived from message logs
function ToggleSwitch({ enabled, loading, readOnly }) {
  return (
    <button
      disabled={loading || readOnly}
      style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: enabled ? '#16a34a' : '#d1d5db',
        border: 'none',
        cursor: readOnly ? 'default' : (loading ? 'not-allowed' : 'pointer'),
        opacity: loading ? 0.7 : 1,
        transition: 'background-color 0.2s',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '2px',
        left: enabled ? '22px' : '2px',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }} />
    </button>
  )
}

// SIM Modal Component
function SimModal({ isOpen, onClose, sim, onSave, users, loadingUsers }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setErrors({})
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const [detectingOperator, setDetectingOperator] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    countryCode: '+91',
    mobileNumber: '',
    operator: 'Jio',
    circle: '',
    status: 'active',
    notes: '',
    assignedTo: '',
    isAdminCaller: false,
  })

  const statuses = ['active', 'inactive']
  const requiredAsterisk = <span style={{ color: '#dc2626' }}>*</span>

  const validate = () => {
    const newErrors = {}
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Contact number is required'
    } else if (!/^\d+$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Only digits are allowed'
    } else if (formData.countryCode === '+91' && !/^\d{10}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Must be 10 digits for Indian numbers'
    } else {
      const totalDigits = (formData.countryCode.length - 1) + formData.mobileNumber.length
      if (totalDigits < 10 || totalDigits > 15) {
        newErrors.mobileNumber = 'Combined number must be 10-15 digits'
      }
    }
    if (!formData.operator) {
      newErrors.operator = 'Operator is required'
    }
    if (!hideCircleField && !showCircleInput && !formData.circle) {
      newErrors.circle = 'Circle is required'
    }
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Please select a user'
    }
    if (formData.notes.trim().length > 0 && formData.notes.trim().length < 10) {
      newErrors.notes = 'Notes must be at least 10 characters if provided'
    }
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

  // [DYNAMIC OPERATOR/CIRCLE CONFIG] - Country-specific operators and circles
  // operators: array = dropdown, 'input' = free text input
  // circles: array = dropdown, null = hidden, 'optional' = optional text input
  const countryConfig = {
    // India
    '+91': {
      country: 'India',
      operators: ['Jio', 'Airtel', 'Vi', 'BSNL', 'MTNL', 'Other'],
      circles: [
        { label: 'Metro Circles', options: ['Delhi', 'Mumbai', 'Kolkata', 'Chennai'] },
        { label: 'Category A', options: ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Gujarat', 'Rajasthan', 'Uttar Pradesh (East)', 'Uttar Pradesh (West)'] },
        { label: 'Category B', options: ['Kerala', 'Punjab', 'Haryana', 'Madhya Pradesh', 'West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Telangana'] },
        { label: 'Category C', options: ['Himachal Pradesh', 'Uttarakhand', 'Goa', 'Assam', 'North East', 'Jammu & Kashmir', 'Chhattisgarh', 'Andaman & Nicobar'] },
        { label: 'Union Territories', options: ['Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Lakshadweep', 'Puducherry', 'Ladakh'] },
      ],
      autoDetectOperator: true,
    },
    // UAE
    '+971': {
      country: 'UAE',
      operators: ['Etisalat', 'Du', 'Virgin Mobile', 'Other'],
      circles: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'],
      autoDetectOperator: false,
    },
    // Saudi Arabia
    '+966': {
      country: 'Saudi Arabia',
      operators: ['STC', 'Mobily', 'Zain', 'Other'],
      circles: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Eastern Province', 'Other'],
      autoDetectOperator: false,
    },
    // Qatar
    '+974': {
      country: 'Qatar',
      operators: ['Ooredoo', 'Vodafone Qatar', 'Other'],
      circles: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Other'],
      autoDetectOperator: false,
    },
    // Kuwait
    '+965': {
      country: 'Kuwait',
      operators: ['Zain', 'Ooredoo', 'STC', 'Other'],
      circles: ['Kuwait City', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Jahra', 'Mubarak Al-Kabeer'],
      autoDetectOperator: false,
    },
    // Bahrain
    '+973': {
      country: 'Bahrain',
      operators: ['Batelco', 'Zain Bahrain', 'STC Bahrain', 'Other'],
      circles: ['Manama', 'Muharraq', 'Northern Governorate', 'Southern Governorate'],
      autoDetectOperator: false,
    },
    // Oman
    '+968': {
      country: 'Oman',
      operators: ['Omantel', 'Ooredoo', 'Other'],
      circles: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Other'],
      autoDetectOperator: false,
    },
    // USA
    '+1': {
      country: 'USA/Canada',
      operators: ['Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'US Cellular', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // UK
    '+44': {
      country: 'United Kingdom',
      operators: ['EE', 'Vodafone', 'O2', 'Three', 'Virgin Mobile', 'Sky Mobile', 'Giffgaff', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // Australia
    '+61': {
      country: 'Australia',
      operators: ['Telstra', 'Optus', 'Vodafone', 'TPG', 'Other'],
      circles: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
      autoDetectOperator: false,
    },
    // Singapore
    '+65': {
      country: 'Singapore',
      operators: ['Singtel', 'StarHub', 'M1', 'Circles.Life', 'Other'],
      circles: null, // Hide circle field (Singapore is small)
      autoDetectOperator: false,
    },
    // Malaysia
    '+60': {
      country: 'Malaysia',
      operators: ['Maxis', 'Celcom', 'Digi', 'U Mobile', 'TM', 'Other'],
      circles: ['Selangor', 'Kuala Lumpur', 'Johor', 'Penang', 'Perak', 'Sabah', 'Sarawak', 'Other'],
      autoDetectOperator: false,
    },
    // Indonesia
    '+62': {
      country: 'Indonesia',
      operators: ['Telkomsel', 'Indosat', 'XL Axiata', 'Tri', 'Smartfren', 'Other'],
      circles: ['Jakarta', 'West Java', 'Central Java', 'East Java', 'Bali', 'Other'],
      autoDetectOperator: false,
    },
    // Pakistan
    '+92': {
      country: 'Pakistan',
      operators: ['Jazz', 'Telenor', 'Zong', 'Ufone', 'Other'],
      circles: ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad', 'Other'],
      autoDetectOperator: false,
    },
    // Bangladesh
    '+880': {
      country: 'Bangladesh',
      operators: ['Grameenphone', 'Banglalink', 'Robi', 'Teletalk', 'Airtel', 'Other'],
      circles: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Rangpur', 'Barisal', 'Other'],
      autoDetectOperator: false,
    },
    // Nepal
    '+977': {
      country: 'Nepal',
      operators: ['Ncell', 'Nepal Telecom', 'Smart Cell', 'Other'],
      circles: ['Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Province 1', 'Province 2', 'Other'],
      autoDetectOperator: false,
    },
    // Sri Lanka
    '+94': {
      country: 'Sri Lanka',
      operators: ['Dialog', 'Mobitel', 'Airtel', 'Hutch', 'Other'],
      circles: ['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'Other'],
      autoDetectOperator: false,
    },
    // Thailand
    '+66': {
      country: 'Thailand',
      operators: ['AIS', 'DTAC', 'True Move', 'Other'],
      circles: ['Bangkok', 'Central', 'Northern', 'Northeastern', 'Southern', 'Other'],
      autoDetectOperator: false,
    },
    // Vietnam
    '+84': {
      country: 'Vietnam',
      operators: ['Viettel', 'Vinaphone', 'Mobifone', 'Vietnamobile', 'Other'],
      circles: ['Hanoi', 'Ho Chi Minh', 'Da Nang', 'Other'],
      autoDetectOperator: false,
    },
    // Philippines
    '+63': {
      country: 'Philippines',
      operators: ['Globe', 'Smart', 'DITO', 'Other'],
      circles: ['Luzon', 'Visayas', 'Mindanao', 'Metro Manila', 'Other'],
      autoDetectOperator: false,
    },
    // Egypt
    '+20': {
      country: 'Egypt',
      operators: ['Vodafone', 'Orange', 'Etisalat', 'WE', 'Other'],
      circles: ['Cairo', 'Alexandria', 'Giza', 'Other'],
      autoDetectOperator: false,
    },
    // Nigeria
    '+234': {
      country: 'Nigeria',
      operators: ['MTN', 'Glo', 'Airtel', '9mobile', 'Other'],
      circles: ['Lagos', 'Abuja', 'Port Harcourt', 'Other'],
      autoDetectOperator: false,
    },
    // South Africa
    '+27': {
      country: 'South Africa',
      operators: ['Vodacom', 'MTN', 'Cell C', 'Telkom', 'Other'],
      circles: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Other'],
      autoDetectOperator: false,
    },
    // Kenya
    '+254': {
      country: 'Kenya',
      operators: ['Safaricom', 'Airtel', 'Telkom', 'Other'],
      circles: ['Nairobi', 'Mombasa', 'Kisumu', 'Other'],
      autoDetectOperator: false,
    },
    // Germany
    '+49': {
      country: 'Germany',
      operators: ['Telekom', 'Vodafone', 'O2', '1&1', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // France
    '+33': {
      country: 'France',
      operators: ['Orange', 'SFR', 'Bouygues', 'Free', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // Spain
    '+34': {
      country: 'Spain',
      operators: ['Movistar', 'Vodafone', 'Orange', 'Yoigo', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // Italy
    '+39': {
      country: 'Italy',
      operators: ['TIM', 'Vodafone', 'Wind Tre', 'Iliad', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // Brazil
    '+55': {
      country: 'Brazil',
      operators: ['Claro', 'Vivo', 'TIM', 'Oi', 'Other'],
      circles: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Other'],
      autoDetectOperator: false,
    },
    // Mexico
    '+52': {
      country: 'Mexico',
      operators: ['Telcel', 'AT&T', 'Movistar', 'Other'],
      circles: ['Ciudad de México', 'Jalisco', 'Other'],
      autoDetectOperator: false,
    },
    // Japan
    '+81': {
      country: 'Japan',
      operators: ['NTT Docomo', 'au', 'SoftBank', 'Rakuten Mobile', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // South Korea
    '+82': {
      country: 'South Korea',
      operators: ['SK Telecom', 'KT', 'LG U+', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // China
    '+86': {
      country: 'China',
      operators: ['China Mobile', 'China Unicom', 'China Telecom', 'Other'],
      circles: ['Beijing', 'Shanghai', 'Guangdong', 'Other'],
      autoDetectOperator: false,
    },
    // Russia
    '+7': {
      country: 'Russia',
      operators: ['MTS', 'Beeline', 'MegaFon', 'Tele2', 'Other'],
      circles: ['Moscow', 'Saint Petersburg', 'Other'],
      autoDetectOperator: false,
    },
    // Turkey
    '+90': {
      country: 'Turkey',
      operators: ['Turkcell', 'Vodafone', 'Turk Telekom', 'Other'],
      circles: ['Istanbul', 'Ankara', 'Izmir', 'Other'],
      autoDetectOperator: false,
    },
    // Israel
    '+972': {
      country: 'Israel',
      operators: ['Pelephone', 'Cellcom', 'Hot Mobile', 'Partner', 'Golan Telecom', 'Other'],
      circles: null, // Hide circle field
      autoDetectOperator: false,
    },
    // New Zealand
    '+64': {
      country: 'New Zealand',
      operators: ['Spark', 'Vodafone', '2degrees', 'Skinny', 'Other'],
      circles: ['Auckland', 'Wellington', 'Christchurch', 'Other'],
      autoDetectOperator: false,
    },
  }

  // Helper function to get config for current country code
  const getCountryConfig = (countryCode) => {
    return countryConfig[countryCode] || {
      country: 'Other',
      operators: 'input', // Free text input
      circles: 'optional', // Optional text input
      autoDetectOperator: false,
    }
  }

  // Get current country config
  const currentConfig = getCountryConfig(formData.countryCode)

  // Determine if operator should be dropdown or input
  const operatorOptions = Array.isArray(currentConfig.operators) ? currentConfig.operators : null
  const showOperatorDropdown = operatorOptions !== null
  const showOperatorInput = !showOperatorDropdown

  // Determine circle field visibility
  const circleOptions = currentConfig.circles
  const showCircleDropdown = Array.isArray(circleOptions)
  const showCircleInput = circleOptions === 'optional'
  const hideCircleField = circleOptions === null

  useEffect(() => {
    if (sim) {
      // Extract country code if present in mobileNumber
      let mobileNum = sim.mobileNumber || ''
      let cCode = '+91'
      if (mobileNum.startsWith('+')) {
        // Try to extract country code (longest match first)
        const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
        for (const cc of sortedCodes) {
          if (mobileNum.startsWith(cc.code)) {
            cCode = cc.code
            mobileNum = mobileNum.substring(cc.code.length).trim()
            break
          }
        }
      }
      setFormData({
        countryCode: cCode,
        mobileNumber: mobileNum,
        operator: sim.operator || '',
        circle: sim.circle || '',
        status: sim.status || 'active',
        notes: sim.notes || '',
        assignedTo: sim.assignedTo?._id || '',
        isAdminCaller: sim.isAdminCaller || false,
      })
    } else {
      // Default to India
      const defaultConfig = getCountryConfig('+91')
      setFormData({
        countryCode: '+91',
        mobileNumber: '',
        operator: Array.isArray(defaultConfig.operators) ? defaultConfig.operators[0] : '',
        circle: '',
        status: 'active',
        notes: '',
        assignedTo: '',
        isAdminCaller: false,
      })
    }
  }, [sim])

  // Auto-detect operator when Contact Number changes (for Indian numbers)
  const detectOperatorFromNumber = async (mobileNum, countryCode) => {
    // Only auto-detect for Indian numbers (+91)
    const config = getCountryConfig(countryCode)
    if (!config.autoDetectOperator || !mobileNum || mobileNum.length < 3) {
      return
    }

    // Check if 10 digits entered
    if (!/^\d{10}$/.test(mobileNum)) {
      return
    }

    setDetectingOperator(true)
    try {
      const fullNumber = countryCode + mobileNum
      const response = await api.post('/sims/detect-operator', { mobileNumber: fullNumber })

      if (response.data?.success && response.data?.data?.operator) {
        setFormData(prev => ({
          ...prev,
          operator: response.data.data.operator,
        }))
      }
    } catch (error) {
      // Silently fail - operator detection is optional
      console.log('Operator detection failed:', error.message)
    } finally {
      setDetectingOperator(false)
    }
  }

  // Debounce for operator detection
  const handleMobileNumberChange = (e, currentCountryCode) => {
    const value = e.target.value.replace(/\D/g, '')
    setFormData(prev => ({ ...prev, mobileNumber: value }))

    // Only detect for countries with auto-detect enabled
    const config = getCountryConfig(currentCountryCode)
    if (config.autoDetectOperator && /^\d{10}$/.test(value)) {
      detectOperatorFromNumber(value, currentCountryCode)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    clearFieldError(name)

    if (name === 'mobileNumber') {
      handleMobileNumberChange(e, formData.countryCode)
    } else if (name === 'countryCode') {
      // [DYNAMIC OPERATOR/CIRCLE] - When country changes, update operator and circle based on config
      setErrors({})
      const newConfig = getCountryConfig(value)
      const newOperator = Array.isArray(newConfig.operators) ? newConfig.operators[0] : ''
      const newCircle = Array.isArray(newConfig.circles)
        ? (typeof newConfig.circles[0] === 'string' ? '' : '') // If array of strings, clear; if array of objects, also clear
        : '' // For 'optional' or null, clear

      setFormData(prev => ({
        ...prev,
        countryCode: value,
        operator: newOperator,
        circle: newCircle,
        mobileNumber: '', // Clear Contact Number for fresh entry
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    // Combine country code with Contact Number
    const dataToSave = {
      ...formData,
      mobileNumber: formData.countryCode + formData.mobileNumber,
    }
    delete dataToSave.countryCode

    try {
      if (sim) {
        await onSave(sim._id, dataToSave)
        toast.success('SIM updated successfully.')
      } else {
        await onSave(null, dataToSave)
        toast.success('SIM added successfully')
      }
      onClose()
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Operation failed'
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
      } else {
        toast.error(errorMsg)
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
      zIndex: 50
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
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {sim ? 'Edit SIM' : 'Add New SIM'}
          </h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Contact Number {requiredAsterisk}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CountryCodeSelect
                value={formData.countryCode}
                onChange={handleChange}
              />
              <input
                type="text"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
                placeholder='9822653371'
                maxLength={formData.countryCode === '+91' ? 10 : 15 - (formData.countryCode.length - 1)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: `1px solid ${errors.mobileNumber ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {errors.mobileNumber && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.mobileNumber}</p>}
            
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Operator {requiredAsterisk} {detectingOperator && <span style={{ color: '#6b7280', fontSize: '12px' }}>(detecting...)</span>}
              </label>
              {/* [DYNAMIC OPERATOR] - Show dropdown for supported countries, input for others */}
              {showOperatorDropdown ? (
                <select
                  name="operator"
                  value={formData.operator}
                  onChange={handleChange}
                  disabled={detectingOperator}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1px solid ${errors.operator ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: detectingOperator ? '#f9fafb' : '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: detectingOperator ? 0.7 : 1,
                  }}
                >
                  {operatorOptions.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="operator"
                  value={formData.operator}
                  onChange={handleChange}
                  placeholder="Enter operator name"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1px solid ${errors.operator ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              )}
              {errors.operator && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.operator}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Status {requiredAsterisk}
              </label>
              <select
                name="status"
                value={formData.status}
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
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* [DYNAMIC CIRCLE] - Show dropdown, input, or hide based on country */}
          {!hideCircleField && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Circle {!showCircleInput && requiredAsterisk} {showCircleInput && <span style={{ color: '#6b7280', fontSize: '12px' }}>(optional)</span>}
              </label>
              {showCircleDropdown ? (
                <select
                  name="circle"
                  value={formData.circle}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1px solid ${errors.circle ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: formData.circle ? '#111827' : '#9ca3af',
                  }}
                >
                  <option value="">Select Circle / Region</option>
                  {/* Handle both array of strings and array of objects with groups */}
                  {circleOptions[0]?.options ? (
                    // Object format with groups (India)
                    circleOptions.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map(circle => (
                          <option key={circle} value={circle}>{circle}</option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    // Simple array of strings (UAE, etc.)
                    circleOptions.map(circle => (
                      <option key={circle} value={circle}>{circle}</option>
                    ))
                  )}
                </select>
              ) : showCircleInput ? (
                <input
                  type="text"
                  name="circle"
                  value={formData.circle}
                  onChange={handleChange}
                  placeholder="Enter circle/region (optional)"
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
              ) : null}
              {errors.circle && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.circle}</p>}
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              <FiUser style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Assigned User {requiredAsterisk}
            </label>
            {loadingUsers ? (
              <div style={{ padding: '10px 14px', color: '#6b7280', fontSize: '14px' }}>
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #fcd34d',
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#92400e' }}>
                  No users found. Please add a user first to assign SIMs.
                </p>
              </div>
            ) : (
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.assignedTo ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.assignedTo && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.assignedTo}</p>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Notes <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes (minimum 10 characters if provided)..."
              maxLength={500}
              style={{
                width: '100%',
                height: '120px',
                padding: '12px 14px',
                border: `1px solid ${formData.notes.length > 0 && formData.notes.trim().length < 10 ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
                overflow: 'auto',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px' }}>
              {formData.notes.length > 0 && formData.notes.trim().length < 10 ? (
                <span style={{ color: '#dc2626' }}>
                  Minimum 10 characters required ({10 - formData.notes.trim().length} more needed)
                </span>
              ) : (
                <span />
              )}
              <span style={{ color: formData.notes.length > 450 ? '#dc2626' : '#6b7280' }}>
                {formData.notes.length}/500
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                name="isAdminCaller"
                checked={formData.isAdminCaller}
                onChange={(e) => setFormData(prev => ({ ...prev, isAdminCaller: e.target.checked }))}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#2563eb',
                }}
              />
              <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                Admin Caller SIM
              </span>
            </label>
            <p style={{ margin: '4px 0 0 28px', fontSize: '12px', color: '#6b7280' }}>
              Mark this SIM as an admin caller. Only admin caller SIMs will appear in the Caller SIMs section on Call Automation.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>
              {loading ? 'Saving...' : (sim ? 'Update' : 'Add SIM')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// SIM List Modal Component
function SimListModal({ isOpen, onClose, title, sims }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const columns = [
    { key: 'mobileNumber', header: 'Contact Number', render: (row) => {
      const flagUrl = getFlagFromPhone(row.mobileNumber)
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {flagUrl && <img src={flagUrl} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} onError={(e) => { e.target.style.display = 'none' }} />}
          <span style={{ fontWeight: '500' }}>{row.mobileNumber}</span>
        </div>
      )
    }},
    {
      key: 'operator',
      header: 'Operator',
      render: (row) => <Badge variant="default">{row.operator}</Badge>
    },
    {
      key: 'circle',
      header: 'Circle',
      render: (row) => row.circle || '-'
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'inactive' ? 'danger' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'messaging',
      header: 'Messaging',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* [WHATSAPP/TELEGRAM TOGGLE SYNC] - Use derived active status */}
          {row.whatsappActiveStatus === true && <span style={{ fontSize: '12px', color: '#25d366' }}>WhatsApp</span>}
          {row.telegramActiveStatus === true && <span style={{ fontSize: '12px', color: '#0088cc' }}>Telegram</span>}
          {row.whatsappActiveStatus !== true && row.telegramActiveStatus !== true && <span style={{ fontSize: '12px', color: '#6b7280' }}>None</span>}
        </div>
      )
    },
    { key: 'assignedTo', header: 'Assigned To', render: (row) => row.assignedTo?.name || 'Unassigned' },
  ]

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
        maxWidth: '900px',
        maxHeight: '80vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          {sims.length > 0 ? (
            <Table columns={columns} data={sims} emptyMessage="No SIMs Found" />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <FiSmartphone style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
              <p>No SIMs in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Bulk Upload Modal Component
function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const { api } = useAuth()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState([])
  const [errors, setErrors] = useState([])
  const [uploading, setUploading] = useState(false)

  // [INTERNATIONAL OPERATORS] - Removed operator validation, accept any value
  const validStatuses = ['active', 'inactive']

  const downloadTemplate = () => {
    // [BULK UPLOAD FIX] Added Assigned User Name and Assigned User Phone columns
    // [INTERNATIONAL OPERATORS] - Updated template with example for international use
    const template = [
      { 'Country Code': '+91', 'Company Contact Number': '9876543210', 'Operator': 'Jio', 'Circle': 'Maharashtra', 'Status': 'active', 'User Email': 'user@example.com', 'User Name': 'John Doe', 'User Personal Contact Number': '+919876543210', 'Notes': 'Optional notes' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    // [BULK UPLOAD FIX] Set column widths for readability
    ws['!cols'] = [
      { wch: 14 },  // Country Code
      { wch: 16 },  // Contact Number
      { wch: 20 },  // Operator (increased for international names)
      { wch: 16 },  // Circle
      { wch: 10 },  // Status
      { wch: 26 },  // User Email
      { wch: 20 },  // User Name
      { wch: 22 },  // User Contact Number
      { wch: 25 },  // Notes
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SIM Import Template')
    XLSX.writeFile(wb, 'sim-import-template.xlsx')
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)

        const validationErrors = []
        const validatedData = jsonData.map((row, index) => {
          const countryCode = String(row['Country Code'] || row.countryCode || row.country_code || '+91').trim()
          const mobileNumber = String(row['Company Contact Number'] || row['Contact Number'] || row.mobileNumber || row.mobile_number || '').trim()
          const operator = String(row['Operator'] || row.operator || 'Other').trim()
          const circle = String(row['Circle'] || row.circle || '').trim()
          const status = String(row['Status'] || row.status || 'active').toLowerCase().trim()
          const assignedUserEmail = String(row['User Email'] || row['Assigned User Email'] || row.assignedUserEmail || row.assigned_user_email || '').trim().toLowerCase()
          // [BULK UPLOAD FIX] Parse User Name and Contact Number from Excel
          const assignedUserName = String(row['User Name'] || row['Assigned User Name'] || row.assignedUserName || row.assigned_user_name || '').trim()
          const assignedUserPhone = String(row['User Personal Contact Number'] || row['User Contact Number'] || row['Assigned User Phone'] || row.assignedUserPhone || row.assigned_user_phone || '').trim()
          const notes = String(row['Notes'] || row.notes || '').trim()

          const rowErrors = []

          if (!mobileNumber) {
            rowErrors.push('Missing Contact Number')
          } else if (!/^\d{10}$/.test(mobileNumber)) {
            rowErrors.push('Invalid 10-digit Contact Number')
          }

          // [INTERNATIONAL OPERATORS] - Removed operator validation, accept any value
          if (!operator || operator.length === 0) {
            rowErrors.push('Operator is required')
          }

          if (!validStatuses.includes(status)) {
            rowErrors.push(`Invalid Status. Must be one of: ${validStatuses.join(', ')}`)
          }

          // Validate email format if provided
          if (assignedUserEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignedUserEmail)) {
            rowErrors.push('Invalid email format for Assigned User')
          }

          // [BULK UPLOAD FIX] Name is required when email is provided (new user will be created)
          if (assignedUserEmail && !assignedUserName) {
            rowErrors.push('Assigned User Name is required when email is provided')
          }

          if (rowErrors.length > 0) {
            validationErrors.push({ row: index + 2, errors: rowErrors })
          }

          // [BULK UPLOAD FIX] Include assignedUserName and assignedUserPhone in parsed data
          return { countryCode, mobileNumber, operator, circle, status, assignedUserEmail, assignedUserName, assignedUserPhone, notes }
        })

        setParsedData(validatedData)
        setErrors(validationErrors)
      } catch (error) {
        setErrors([{ row: 0, errors: ['Failed to parse Excel file. Please check the format.'] }])
        setParsedData([])
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const handleUpload = async () => {
    if (errors.length > 0 || parsedData.length === 0) return

    // Check if user is authenticated
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Please log in to upload SIMs')
      onClose()
      return
    }

    setUploading(true)
    try {
      const response = await api.post('/sims/bulk', { sims: parsedData })
      const inserted = response.data.data?.inserted || response.data.inserted || parsedData.length
      const emailsFailed = response.data.data?.emailsFailed || response.data.emailsFailed || 0

      // [BULK UPLOAD EMAIL FIX] Show warning if some welcome emails failed
      if (emailsFailed > 0) {
        toast.success(`${inserted} SIMs uploaded. Note: ${emailsFailed} welcome emails could not be sent.`)
      } else {
        toast.success(`${inserted} SIMs uploaded successfully`)
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Bulk upload error:', error)

      // Handle validation errors with details
      // if (error.response?.data?.errors) {
      if (Array.isArray(error.response?.data?.errors)) {
        const errorDetails = error.response.data.errors
          .map(e => `Row ${e.row || e.index}: ${e.errors?.join(', ') || e.message || 'Invalid data'}`)
          .slice(0, 5)
          .join('\n')
        toast.error(`Validation errors:\n${errorDetails}${error.response.data.errors.length > 5 ? '\n...and more' : ''}`)
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      } else if (error.response?.status === 403) {
        toast.error('Subscription limit reached. Please upgrade your plan.')
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Invalid data format. Please check your file.')
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        toast.error('Network error. Please check if the server is running.')
      } else {
        toast.error(error.response?.data?.message || error.message || 'Bulk upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedData([])
    setErrors([])
    onClose()
  }

  if (!isOpen) return null

  const previewColumns = [
    { key: 'countryCode', header: 'Country Code' },
    { key: 'mobileNumber', header: 'Contact Number' },
    { key: 'operator', header: 'Operator' },
    { key: 'circle', header: 'Circle' },
    { key: 'status', header: 'Status' },
    { key: 'assignedUserEmail', header: 'User Email', render: (row) => row.assignedUserEmail || '-' },
    // [BULK UPLOAD FIX] Added User Name and Contact Number to preview
    { key: 'assignedUserName', header: 'User Name', render: (row) => row.assignedUserName || '-' },
    { key: 'assignedUserPhone', header: 'Personal Contact No.', render: (row) => row.assignedUserPhone || '-' },
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }} onClick={handleClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '700px',
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
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Bulk Upload SIMs</h2>
          <button onClick={handleClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Download Template Section */}
          <div style={{ marginBottom: '20px' }}>
            <Button variant="secondary" onClick={downloadTemplate}>
              Download Excel Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            onClick={() => document.getElementById('bulk-file-input').click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const droppedFile = e.dataTransfer.files[0]
              if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
                setFile(droppedFile)
                setErrors([])
                const reader = new FileReader()
                reader.onload = (event) => {
                  try {
                    const data = new Uint8Array(event.target.result)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const sheetName = workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(sheet)
                    const validationErrors = []
                    const validatedData = jsonData.map((row, index) => {
                      const countryCode = String(row['Country Code'] || row.countryCode || row.country_code || '+91').trim()
                      const mobileNumber = String(row['Company Contact Number'] || row['Contact Number'] || row.mobileNumber || row.mobile_number || '').trim()
                      const operator = String(row['Operator'] || row.operator || 'Other').trim()
                      const circle = String(row['Circle'] || row.circle || '').trim()
                      const status = String(row['Status'] || row.status || 'active').toLowerCase().trim()
                      const assignedUserEmail = String(row['User Email'] || row['Assigned User Email'] || row.assignedUserEmail || row.assigned_user_email || '').trim().toLowerCase()
                      const assignedUserName = String(row['User Name'] || row['Assigned User Name'] || row.assignedUserName || row.assigned_user_name || '').trim()
                      const assignedUserPhone = String(row['User Personal Contact Number'] || row['User Contact Number'] || row['Assigned User Phone'] || row.assignedUserPhone || row.assigned_user_phone || '').trim()
                      const notes = String(row['Notes'] || row.notes || '').trim()
                      const rowErrors = []
                      if (!mobileNumber) {
                        rowErrors.push('Missing Contact Number')
                      } else if (!/^\d{10}$/.test(mobileNumber)) {
                        rowErrors.push('Invalid 10-digit Contact Number')
                      }
                      if (!operator || operator.length === 0) {
                        rowErrors.push('Operator is required')
                      }
                      if (!validStatuses.includes(status)) {
                        rowErrors.push(`Invalid Status. Must be one of: ${validStatuses.join(', ')}`)
                      }
                      if (assignedUserEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignedUserEmail)) {
                        rowErrors.push('Invalid email format for Assigned User')
                      }
                      if (assignedUserEmail && !assignedUserName) {
                        rowErrors.push('Assigned User Name is required when email is provided')
                      }
                      if (rowErrors.length > 0) {
                        validationErrors.push({ row: index + 2, errors: rowErrors })
                      }
                      return { countryCode, mobileNumber, operator, circle, status, assignedUserEmail, assignedUserName, assignedUserPhone, notes }
                    })
                    setParsedData(validatedData)
                    setErrors(validationErrors)
                  } catch (error) {
                    setErrors([{ row: 0, errors: ['Failed to parse Excel file. Please check the format.'] }])
                    setParsedData([])
                  }
                }
                reader.readAsArrayBuffer(droppedFile)
              } else {
                toast.error('Please drop an Excel file (.xlsx or .xls)')
              }
            }}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '20px',
              backgroundColor: file ? '#f0fdf4' : '#f9fafb',
            }}
          >
           
            <p style={{ margin: 0, color: '#374151', fontWeight: '500' }}>
              {file ? file.name : 'Click to select or drag & drop Excel file (.xlsx, .xls)'}
            </p>
            <input
              id="bulk-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Record Count */}
          {parsedData.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#1e40af' }}>{parsedData.length} records found in file</span>
            </div>
          )}

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '14px' }}>Validation Errors:</h4>
              {errors.map((err, idx) => (
                <div key={idx} style={{ fontSize: '13px', color: '#dc2626', marginBottom: '4px' }}>
                  Row {err.row}: {err.errors.join(', ')}
                </div>
              ))}
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && errors.length === 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Preview (first 5 rows):</h4>
              <Table columns={previewColumns} data={parsedData.slice(0, 5)} emptyMessage="No data" showSerial />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={errors.length > 0 || parsedData.length === 0 || uploading}
              loading={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload All Records'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SIMs() {
  const { user, api } = useAuth()
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('') // Used to trigger search only on submit
  const [status, setStatus] = useState('')
  const [operator, setOperator] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const fetchIdRef = useRef(0)
  const [showModal, setShowModal] = useState(false)
  const [editingSim, setEditingSim] = useState(null)
  const [messagingStats, setMessagingStats] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [simListModal, setSimListModal] = useState({ open: false, title: '', sims: [] })
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, simId: null, simNumber: '' })

  const operators = ['Jio', 'Airtel', 'Vi', 'BSNL', 'MTNL', 'Other']

  // Fetch SIMs when pagination or filters change
  useEffect(() => {
    fetchSIMs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, status, operator, searchQuery])

  // Fetch messaging stats on mount
  useEffect(() => {
    fetchMessagingStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await api.get('/users/company')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch users')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchSIMs = async () => {
    const id = ++fetchIdRef.current
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
        ...(status && { status }),
        ...(operator && { operator }),
      })

      const response = await api.get(`/sims?${params}`)
      if (fetchIdRef.current !== id) return
      setSims(response.data.data || [])
      setPagination((prev) => ({ ...prev, total: response.data.pagination?.total || 0 }))
    } catch (error) {
      if (fetchIdRef.current !== id) return
      toast.error('Failed to fetch SIMs')
      setSims([])
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  const fetchMessagingStats = async () => {
    try {
      const response = await api.get('/sims/messaging-stats')
      setMessagingStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch messaging stats')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchQuery(search) // Update searchQuery to trigger fetch
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleReset = () => {
    setSearch('')
    setSearchQuery('')
    setStatus('')
    setOperator('')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(status && { status }),
        ...(operator && { operator }),
      })
      const response = await api.get(`/sims/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'sims-export.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export completed')
    } catch (error) {
      toast.error('This feature is available in higher plans. Upgrade your plan to access it.')
    }
  }

  const handleSaveSim = async (simId, data) => {
    try {
      if (simId) {
        await api.put(`/sims/${simId}`, data)
      } else {
        await api.post('/sims', data)
      }
      fetchSIMs()
          fetchMessagingStats() // ✅ ADD THIS LINE

    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.')
      }
      throw error
    }
  }

  const handleDelete = (id) => {
    const sim = sims.find(s => s._id === id)
    setDeleteConfirm({ show: true, simId: id, simNumber: sim?.mobileNumber || 'this SIM' })
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/sims/${deleteConfirm.simId}`)
      toast.success('SIM deleted successfully.')
      fetchSIMs()
    } catch (error) {
      toast.error('Failed to delete SIM')
    } finally {
      setDeleteConfirm({ show: false, simId: null, simNumber: '' })
    }
  }

  const openModal = (sim = null) => {
    setEditingSim(sim)
    setShowModal(true)
    fetchUsers()
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSim(null)
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: '#dcfce7', color: '#16a34a' },
      inactive: { bg: '#fef2f2', color: '#dc2626' },
    }
    return badges[status] || badges.inactive
  }

  const handleMessagingToggle = async (simId, platform, enabled) => {
    setTogglingId(simId + platform)
    try {
      await api.patch(`/sims/${simId}/messaging`, { platform, enabled: !enabled })
      setSims((prev) =>
        prev.map((sim) =>
          sim._id === simId
            ? { ...sim, [`${platform}Enabled`]: !enabled }
            : sim
        )
      )
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} ${!enabled ? 'enabled' : 'disabled'}`)
      fetchMessagingStats()
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleStatCardClick = async (type) => {
    try {
      // Fetch all SIMs (not just current page) for accurate filtering
      const allSims = []
      let page = 1
      let hasMore = true
      while (hasMore) {
        const response = await api.get(`/sims?limit=100&page=${page}`)
        const sims = response.data.data || []
        allSims.push(...sims)
        const total = response.data.pagination?.total || 0
        hasMore = allSims.length < total
        page++
      }

      let filteredSims = []
      let title = ''

      switch (type) {
        case 'whatsapp':
          filteredSims = allSims.filter(sim => sim.whatsappActiveStatus === true)
          title = 'WhatsApp Active SIMs'
          break
        case 'telegram':
          filteredSims = allSims.filter(sim => sim.telegramActiveStatus === true)
          title = 'Telegram Active SIMs'
          break
        case 'both':
          filteredSims = allSims.filter(sim => sim.whatsappActiveStatus === true && sim.telegramActiveStatus === true)
          title = 'Both WhatsApp & Telegram Active SIMs'
          break
        case 'none':
          filteredSims = allSims.filter(sim => sim.whatsappActiveStatus !== true && sim.telegramActiveStatus !== true)
          title = 'SIMs with No Messaging Active'
          break
        default:
          return
      }

      setSimListModal({ open: true, title, sims: filteredSims })
    } catch (error) {
      toast.error('Failed to load SIMs')
    }
  }

  const columns = [
    {
      key: 'mobileNumber',
      header: 'Contact Number',
      render: (row) => {
        const flagUrl = getFlagFromPhone(row.mobileNumber)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {flagUrl && <img src={flagUrl} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} onError={(e) => { e.target.style.display = 'none' }} />}
            <span style={{ fontWeight: '500' }}>{row.mobileNumber}</span>
          </div>
        )
      }
    },
    {
      key: 'operator',
      header: 'Operator',
      render: (row) => <Badge variant="default">{row.operator}</Badge>
    },
    {
      key: 'circle',
      header: 'Circle',
      render: (row) => row.circle || '-'
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badge = getStatusBadge(row.status)
        return <Badge variant={row.status === 'active' ? 'success' : row.status === 'inactive' ? 'danger' : 'warning'}>{row.status}</Badge>
      }
    },
    {
      key: 'whatsapp',
      header: 'WhatsApp',
      render: (row) => (
        <div style={{ textAlign: 'center' }}>
          <ToggleSwitch
            enabled={row.whatsappActiveStatus === true}
            loading={togglingId === row._id + 'whatsapp'}
            readOnly={true}
          />
        </div>
      )
    },
    {
      key: 'telegram',
      header: 'Telegram',
      render: (row) => (
        <div style={{ textAlign: 'center' }}>
          <ToggleSwitch
            enabled={row.telegramActiveStatus === true}
            loading={togglingId === row._id + 'telegram'}
            readOnly={true}
          />
        </div>
      )
    },
    {
      key: 'isAdminCaller',
      header: 'Caller',
      render: (row) => row.isAdminCaller
        ? <Badge variant="success" style={{ fontSize: '11px' }}>Admin</Badge>
        : <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (row) => row.assignedTo?.name || 'Unassigned'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => openModal(row)}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
            title="Edit"
          >
            <FiEdit style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#dc2626' }}
            title="Delete"
          >
            <FiTrash2 style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )
    },
  ]

  if (loading) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>

<div className="mb-6">

  {/* HEADER CONTAINER */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

    {/* LEFT: TITLE + DESCRIPTION */}
    <div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
        SIM Management
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">
        Manage your SIM cards and their details
      </p>
    </div>

    {/* RIGHT: ACTION BUTTONS */}
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">

      {/* EXPORT */}
      <button
        onClick={handleExport}
        className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-[11px] sm:text-xs md:text-sm font-medium"
      >
        <FiDownload className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Export</span>
      </button>

      {/* BULK UPLOAD */}
      <button
        onClick={() => setShowBulkModal(true)}
        className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-[11px] sm:text-xs md:text-sm font-medium"
      >
        <FiUpload className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Bulk Upload</span>
      </button>

      {/* ADD SIM */}
      <button
        onClick={() => openModal()}
        className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-blue-600 text-white text-[11px] sm:text-xs md:text-sm font-medium"
      >
        <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Add SIM</span>
      </button>

    </div>

  </div>
</div>
      {/* Messaging Stats */}
      {messagingStats && (
        <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
          <StatCard
            title="WhatsApp Enabled"
            value={`${messagingStats.whatsapp?.enabled || 0} / ${messagingStats.total || 0}`}
            icon={FiMessageCircle}
            iconColor="#25d366"
            iconBg="#25d36620"
            onClick={() => handleStatCardClick('whatsapp')}
          />
          <StatCard
            title="Telegram Enabled"
            value={`${messagingStats.telegram?.enabled || 0} / ${messagingStats.total || 0}`}
            icon={FiMessageCircle}
            iconColor="#0088cc"
            iconBg="#0088cc20"
            onClick={() => handleStatCardClick('telegram')}
          />
          <StatCard
            title="Both Enabled"
            value={messagingStats.both || 0}
            icon={FiSmartphone}
            iconColor="#2563eb"
            iconBg="#eff6ff"
            onClick={() => handleStatCardClick('both')}
          />
          <StatCard
            title="None Enabled"
            value={messagingStats.neither || 0}
            icon={FiSmartphone}
            iconColor="#dc2626"
            iconBg="#fef2f2"
            onClick={() => handleStatCardClick('none')}
          />
        </Grid>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value.replace(/[\t\n\r]+/g, '').trim())}
                placeholder="Search by Contact Number or user name..."
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
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
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
              <option value="">All Operators</option>
              {operators.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <Button type="submit">Search</Button>
            <Button type="button" variant="secondary" onClick={handleReset}>
              <FiRefreshCw style={{ width: '16px', height: '16px', marginRight: '6px' }} />
              Reset
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={sims}
            emptyMessage="No SIMs Found"
            showSerial
            serialOffset={(pagination.page - 1) * pagination.limit}
          />
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

      {/* Modal */}
      <SimModal
        isOpen={showModal}
        onClose={closeModal}
        sim={editingSim}
        onSave={handleSaveSim}
        users={users}
        loadingUsers={loadingUsers}
      />

      {/* SIM List Modal */}
      <SimListModal
        isOpen={simListModal.open}
        onClose={() => setSimListModal({ open: false, title: '', sims: [] })}
        title={simListModal.title}
        sims={simListModal.sims}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => { fetchSIMs(); fetchMessagingStats(); setShowBulkModal(false) }}
      />

      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, simId: null, simNumber: '' })}
        onConfirm={confirmDelete}
        title="Delete SIM"
        message={`Are you sure you want to delete SIM ${deleteConfirm.simNumber}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </PageContainer>
  )
}