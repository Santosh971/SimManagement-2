import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiWifi,
  FiPlus,
  FiAlertCircle,
  FiEdit,
  FiBarChart2,
  FiSmartphone,
  FiX,
  FiTrash2,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiUsers,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiMapPin,
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
  Pagination,
  ConfirmModal,
} from '../components/ui'
import {  FiInfo } from 'react-icons/fi'
import { formatDateTime, formatDate, formatTime } from '../utils/dateFormat'
// Add WiFi Modal (Updated with SSID, BSSID, and SIM Assignment)
function AddWifiModal({ isOpen, onClose, wifi, onSave, existingNetworks }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [eligibleSims, setEligibleSims] = useState([])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])
  const [simSearch, setSimSearch] = useState('')
  const [showSimDropdown, setShowSimDropdown] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    wifiName: '',
    ssid: '',
    bssid: '',
    location: '',
    expectedSpeed: '',
    alertThreshold: '',
    emailAlertEnabled: true,
    assignedSims: [],
  })

  // Fetch eligible SIMs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEligibleSims()
    }
  }, [isOpen])

  // Reset form when wifi prop changes
  useEffect(() => {
    if (wifi) {
      setFormData({
        wifiName: wifi.wifiName || '',
        ssid: wifi.ssid || '',
        bssid: wifi.bssid || '',
        location: wifi.location || '',
        expectedSpeed: wifi.expectedSpeed || '',
        alertThreshold: wifi.alertThreshold || '',
        emailAlertEnabled: wifi.emailAlertEnabled ?? true,
        assignedSims: wifi.assignedSims?.map(s => s._id || s) || [],
      })
    } else {
      setFormData({
        wifiName: '',
        ssid: '',
        bssid: '',
        location: '',
        expectedSpeed: '',
        alertThreshold: '',
        emailAlertEnabled: true,
        assignedSims: [],
      })
    }
    setErrors({})
  }, [wifi])

  const fetchEligibleSims = async () => {
    try {
      const response = await api.get('/wifi/eligible-sims')
      setEligibleSims(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch eligible SIMs:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    clearFieldError(name)
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    const newErrors = { ...errors }

    if (name === 'wifiName') {
      if (!value.trim()) newErrors.wifiName = 'WiFi name is required'
      else delete newErrors.wifiName
    }
    if (name === 'location') {
      if (!value.trim()) newErrors.location = 'WiFi location is required'
      else delete newErrors.location
    }
    if (name === 'ssid') {
      if (!value.trim()) newErrors.ssid = 'SSID (Network Name) is required'
      else delete newErrors.ssid
    }
    if (name === 'bssid') {
      if (!value.trim()) newErrors.bssid = 'BSSID (Router MAC) is required'
      else if (!BSSID_REGEX.test(value)) newErrors.bssid = 'Invalid BSSID format. Use XX:XX:XX:XX:XX:XX (hex 0-9, A-F only)'
      else {
        const duplicate = (existingNetworks || []).find(n => n.bssid?.toLowerCase() === value.trim().toLowerCase() && n._id !== wifi?._id)
        if (duplicate) newErrors.bssid = `BSSID already registered to "${duplicate.wifiName}". Each network must have a unique BSSID.`
        else delete newErrors.bssid
      }
    }
    if (name === 'expectedSpeed') {
      if (!value) newErrors.expectedSpeed = 'Expected speed is required'
      else if (parseFloat(value) <= 0) newErrors.expectedSpeed = 'Expected speed must be greater than 0'
      else delete newErrors.expectedSpeed
    }
    if (name === 'alertThreshold') {
      if (!value) newErrors.alertThreshold = 'Alert threshold is required'
      else if (parseFloat(value) <= 0) newErrors.alertThreshold = 'Alert threshold must be greater than 0'
      else if (formData.expectedSpeed && parseFloat(value) >= parseFloat(formData.expectedSpeed)) newErrors.alertThreshold = 'Alert threshold must be less than expected speed'
      else delete newErrors.alertThreshold
    }

    setErrors(newErrors)
  }

  const handleSimToggle = (simId) => {
    setFormData((prev) => {
      const isAssigned = prev.assignedSims.includes(simId)
      if (isAssigned) {
        return {
          ...prev,
          assignedSims: prev.assignedSims.filter(id => id !== simId)
        }
      } else {
        return {
          ...prev,
          assignedSims: [...prev.assignedSims, simId]
        }
      }
    })
  }

  const handleSelectAllSims = () => {
    if (formData.assignedSims.length === eligibleSims.length) {
      // Deselect all
      setFormData(prev => ({ ...prev, assignedSims: [] }))
    } else {
      // Select all
      setFormData(prev => ({ ...prev, assignedSims: eligibleSims.map(s => s._id) }))
    }
  }

  const BSSID_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/

  const validate = () => {
    const newErrors = {}
    if (!formData.wifiName.trim()) newErrors.wifiName = 'WiFi name is required'
    if (!formData.location.trim()) newErrors.location = 'WiFi location is required'
    if (!formData.ssid.trim()) newErrors.ssid = 'SSID (Network Name) is required'
    if (!formData.bssid.trim()) {
      newErrors.bssid = 'BSSID (Router MAC) is required'
    } else if (!BSSID_REGEX.test(formData.bssid)) {
      newErrors.bssid = 'Invalid BSSID format. Use XX:XX:XX:XX:XX:XX (hex characters 0-9, A-F only)'
    } else {
      const duplicate = (existingNetworks || []).find(n => n.bssid?.toLowerCase() === formData.bssid.trim().toLowerCase() && n._id !== wifi?._id)
      if (duplicate) newErrors.bssid = `BSSID already registered to "${duplicate.wifiName}". Each network must have a unique BSSID.`
    }
    if (!formData.expectedSpeed) newErrors.expectedSpeed = 'Expected speed is required'
    else if (parseFloat(formData.expectedSpeed) <= 0) newErrors.expectedSpeed = 'Expected speed must be greater than 0'
    if (!formData.alertThreshold) newErrors.alertThreshold = 'Alert threshold is required'
    else if (parseFloat(formData.alertThreshold) <= 0) newErrors.alertThreshold = 'Alert threshold must be greater than 0'
    else if (parseFloat(formData.alertThreshold) >= parseFloat(formData.expectedSpeed)) newErrors.alertThreshold = 'Alert threshold must be less than expected speed'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleBssidChange = (e) => {
    let value = e.target.value
    // Strip non-hex characters (allow colons, both upper and lower case)
    value = value.replace(/[^0-9A-Fa-f:]/g, '')
    // Auto-insert colons every 2 hex characters
    const raw = value.replace(/:/g, '')
    if (raw.length > 12) return // max 12 hex chars
    if (raw.length > 0) {
      const formatted = raw.match(/.{1,2}/g).join(':')
      value = formatted
    }
    setFormData((prev) => ({ ...prev, bssid: value }))
    clearFieldError('bssid')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const data = {
        wifiName: formData.wifiName,
        ssid: formData.ssid,
        bssid: formData.bssid,
        location: formData.location,
        expectedSpeed: parseFloat(formData.expectedSpeed),
        alertThreshold: parseFloat(formData.alertThreshold),
        emailAlertEnabled: formData.emailAlertEnabled,
        assignedSims: formData.assignedSims,
      }

      if (wifi) {
        await onSave(wifi._id, data)
        toast.success('WiFi network updated successfully')
      } else {
        await onSave(null, data)
        toast.success('WiFi network created successfully')
      }
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  // Filter SIMs based on search
  const filteredSims = eligibleSims.filter(sim => {
    if (!simSearch) return true
    const search = simSearch.toLowerCase()
    return (
      sim.mobileNumber?.toLowerCase().includes(search) ||
      sim.operator?.toLowerCase().includes(search)
    )
  })

  // Get assigned SIM details
  const getAssignedSimDetails = (simId) => {
    return eligibleSims.find(s => s._id === simId)
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
        maxWidth: '550px',
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          backgroundColor: '#fff',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {wifi ? 'Edit WiFi Network' : 'Add WiFi Network'}
          </h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate autoComplete="off" style={{ padding: '24px' }}>
          {/* WiFi Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              WiFi Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              name="wifiName"
              value={formData.wifiName}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={25}
              placeholder="e.g.,Mumbai Office Main WiFi"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${errors.wifiName ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {errors.wifiName ? <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{errors.wifiName}</p> : <span />}
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formData.wifiName.length}/25</span>
            </div>
          </div>

          {/* WiFi Location */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              <FiMapPin style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              WiFi Location <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={25}
              placeholder="e.g., 3rd Floor - East Wing, Reception Area"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${errors.location ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {errors.location ? <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{errors.location}</p> : <span />}
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formData.location.length}/25</span>
            </div>
          </div>

          {/* SSID and BSSID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                SSID (Network Name) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="ssid"
                value={formData.ssid}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={25}
                autoComplete="off"
                placeholder="e.g., MumbaiOffice_5G"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.ssid ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {errors.ssid ? <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{errors.ssid}</p> : <span style={{ fontSize: '11px', color: '#9ca3af' }}>The actual network name devices connect to</span>}
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formData.ssid.length}/25</span>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                BSSID (Router MAC) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="bssid"
                value={formData.bssid}
                onChange={handleBssidChange}
                onBlur={handleBlur}
                autoComplete="off"
                placeholder="e.g., aa:bb:cc:dd:ee:ff"
                maxLength={17}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.bssid ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.bssid && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.bssid}</p>}
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                MAC address format: XX:XX:XX:XX:XX:XX (hex characters 0-9, A-F, a-f)
              </p>
            </div>
          </div>

          {/* Expected Speed and Alert Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Expected Speed (Mbps) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                name="expectedSpeed"
                value={formData.expectedSpeed}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., 100 , 100.5"
                min="0"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.expectedSpeed ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.expectedSpeed && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.expectedSpeed}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Alert Threshold (Mbps) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                name="alertThreshold"
                value={formData.alertThreshold}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., 50, 50.5"
                min="0"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.alertThreshold ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.alertThreshold && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{errors.alertThreshold}</p>}
            </div>
          </div>

          {/* Email Alert Toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="emailAlertEnabled"
                checked={formData.emailAlertEnabled}
                onChange={handleChange}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px' }}>Send email alerts when speed drops below threshold</span>
            </label>
          </div>

          {/* SIM Assignment Section */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUsers style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <label style={{ fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                  Assign SIMs to this WiFi
                </label>
              </div>
              <button
                type="button"
                onClick={handleSelectAllSims}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {formData.assignedSims.length === eligibleSims.length ? 'Clear All' : 'Select All'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              Only assigned SIMs can submit metrics for this WiFi. Leave empty to allow all SIMs.
            </p>

            {/* SIM Search */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search SIMs..."
                value={simSearch}
                onChange={(e) => setSimSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* SIM List */}
            <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              {filteredSims.length > 0 ? (
                filteredSims.map((sim) => {
                  const isSelected = formData.assignedSims.includes(sim._id)
                  return (
                    <div
                      key={sim._id}
                      onClick={() => handleSimToggle(sim._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#eff6ff' : '#fff',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { }} // Handled by parent div click
                          style={{ width: '14px', height: '14px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '13px' }}>
                            {sim.mobileNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {sim.operator} • {sim.status}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="success" style={{ fontSize: '10px' }}>Selected</Badge>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  {simSearch ? 'No SIMs match your search' : 'No active SIMs available'}
                </div>
              )}
            </div>

            {/* Selected SIMs Summary */}
            {formData.assignedSims.length > 0 && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#059669' }}>
                {formData.assignedSims.length} SIM{formData.assignedSims.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button loading={loading}>{wifi ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// WiFi Details Modal (Updated to show SSID, BSSID, and Assigned SIMs)
function WifiDetailsModal({ isOpen, onClose, wifi, stats }) {
  const { api } = useAuth()
  const [hourlyData, setHourlyData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && wifi) {
      fetchHourlyData()
    }
  }, [isOpen, wifi])

  const fetchHourlyData = async () => {
    if (!wifi) return
    try {
      setLoading(true)
      const response = await api.get(`/wifi/hourly-metrics/${wifi._id}?hours=24`)
      setHourlyData(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch hourly data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !wifi) return null

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
        maxHeight: '90vh',
        overflow: 'auto',
        margin: '0 16px',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          backgroundColor: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiWifi style={{ width: '24px', height: '24px', color: '#2563eb' }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{wifi.wifiName}</h2>
              {wifi.location && (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{wifi.location}</p>
              )}
              {!wifi.location && wifi.ssid && wifi.ssid !== wifi.wifiName && (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>SSID: {wifi.ssid}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Expected Speed</div>
              <div className="text-xl sm:text-2xl font-semibold">{wifi.expectedSpeed} Mbps</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Alert Threshold</div>
              <div className="text-xl sm:text-2xl font-semibold">{wifi.alertThreshold} Mbps</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Current Speed</div>
              <div className="text-xl sm:text-2xl font-semibold" style={{ color: stats?.currentSpeed && parseFloat(stats.currentSpeed) < wifi.alertThreshold ? '#dc2626' : '#16a34a' }}>
                {stats?.currentSpeed ? parseFloat(stats.currentSpeed).toFixed(2) : '0'} Mbps
              </div>
              {stats?.lastMetricTime && (
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  Last measured: {formatDateTime(stats.lastMetricTime)}
                </div>
              )}
            </div>
          </div>

          {/* Network Info (SSID, BSSID) */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Network Identifiers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>SSID</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{wifi.ssid || wifi.wifiName || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>BSSID (Router MAC)</div>
                <div style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>{wifi.bssid || 'Not set'}</div>
              </div>
            </div>
          </div>

          {/* Assigned SIMs Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             
              Assigned SIMs ({wifi.assignedSims?.length || 0})
            </h3>
            {wifi.assignedSims && wifi.assignedSims.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wifi.assignedSims.map((sim) => (
                  <div key={sim._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiSmartphone style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{sim.mobileNumber}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{sim.operator}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{sim.assignedTo?.email || '-'}</div>
                      </div>
                    </div>
                    <Badge variant={sim.status === 'active' ? 'success' : 'default'}>
                      {sim.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
               
                <p style={{ color: '#6b7280', fontSize: '14px' }}>All SIMs can submit metrics (no restrictions)</p>
              </div>
            )}
          </div>

          {/* Speed Chart (Simple visualization) */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Speed Over Last 24 Hours</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner />
              </div>
            ) : hourlyData.length > 0 ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '2px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                {hourlyData.map((d, i) => {
                  const speed = parseFloat(d.downloadSpeed) || 0
                  const maxSpeed = wifi.expectedSpeed
                  const height = Math.min((speed / maxSpeed) * 100, 100)
                  const color = speed < wifi.alertThreshold ? '#dc2626' : '#16a34a'
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${height}%`,
                          backgroundColor: color,
                          borderRadius: '2px',
                          minHeight: '4px'
                        }} />
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{d.time}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ color: '#6b7280' }}>No data available for the last 24 hours</p>
              </div>
            )}
          </div>

          {/* Devices List */}
          {/* <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Connected Devices</h3>
            {wifi.devices && wifi.devices.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wifi.devices.map((device) => (
                  <div key={device._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiSmartphone style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                      <div>
                        <div style={{ fontWeight: '500' }}>{device.deviceName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Last seen: {device.lastSeen ? formatDateTime(device.lastSeen) : 'Never'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={device.isActive ? 'success' : 'default'}>
                      {device.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ color: '#6b7280' }}>No devices assigned to this WiFi network</p>
              </div>
            )}
          </div> */}
        </div>
      </div>
    </div>
  )
}

// Main WifiMonitor Page
export default function WifiMonitor() {
  const { api, user } = useAuth()
  const [stats, setStats] = useState(null)
  const [networks, setNetworks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedWifi, setSelectedWifi] = useState(null)
  const [editingWifi, setEditingWifi] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, networksRes, alertsRes] = await Promise.all([
        api.get('/wifi/dashboard/stats'),
        api.get('/wifi/networks?limit=100'),
        api.get('/wifi/alerts?limit=5&status=active'),
      ])

      setStats(statsRes.data.data)
      setNetworks(networksRes.data.data || [])
      setAlerts(alertsRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
      const message = err.response?.data?.message || err.message || 'Failed to fetch data'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWifi = async (wifiId, data) => {
    if (wifiId) {
      await api.put(`/wifi/networks/${wifiId}`, data)
    } else {
      await api.post('/wifi/networks', data)
    }
    fetchData()
  }

  const handleDeleteWifi = (wifiId) => {
    setDeleteTarget(wifiId)
  }

  const confirmDeleteWifi = async () => {
    try {
      setDeleting(true)
      await api.delete(`/wifi/networks/${deleteTarget}`)
      toast.success('WiFi network deleted successfully.')
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete WiFi network')
    } finally {
      setDeleting(false)
    }
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await api.put(`/wifi/alerts/${alertId}/resolve`)
      toast.success('Alert resolved successfully')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resolve alert')
    }
  }

  const openAddModal = () => {
    setEditingWifi(null)
    setShowAddModal(true)
  }

  const openEditModal = (wifi) => {
    setEditingWifi(wifi)
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    setEditingWifi(null)
  }

  const openDetailsModal = (wifi) => {
    setSelectedWifi(wifi)
    setShowDetailsModal(true)
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedWifi(null)
  }

  // Search filter
  const filteredNetworks = searchQuery.trim()
    ? networks.filter((n) => {
        const q = searchQuery.toLowerCase().trim()
        return (
          (n.wifiName || '').toLowerCase().includes(q) ||
          (n.ssid || '').toLowerCase().includes(q) ||
          (n.bssid || '').toLowerCase().includes(q) ||
          (n.location || '').toLowerCase().includes(q) ||
          (n.currentSpeed != null && String(n.currentSpeed).includes(q)) ||
          (n.expectedSpeed != null && String(n.expectedSpeed).includes(q)) ||
          (n.alertThreshold != null && String(n.alertThreshold).includes(q))
        )
      })
    : networks

  // Sort handler
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
    setPage(1)
  }

  // Sorted data
  const sortedNetworks = [...filteredNetworks].sort((a, b) => {
    if (!sortConfig.key) return 0
    const dir = sortConfig.direction === 'asc' ? 1 : -1

    let valA, valB
    switch (sortConfig.key) {
      case 'wifiName':
        valA = (a.wifiName || '').toLowerCase()
        valB = (b.wifiName || '').toLowerCase()
        break
      case 'ssid':
        valA = (a.ssid || '').toLowerCase()
        valB = (b.ssid || '').toLowerCase()
        break
      case 'expectedSpeed':
        valA = a.expectedSpeed || 0
        valB = b.expectedSpeed || 0
        break
      case 'alertThreshold':
        valA = a.alertThreshold || 0
        valB = b.alertThreshold || 0
        break
      case 'currentSpeed':
        valA = a.currentSpeed != null ? parseFloat(a.currentSpeed) : -1
        valB = b.currentSpeed != null ? parseFloat(b.currentSpeed) : -1
        break
      default:
        return 0
    }

    if (valA < valB) return -1 * dir
    if (valA > valB) return 1 * dir
    return 0
  })

  const getSortIcon = (key) => {
    const active = sortConfig.key === key
    const color = active ? '#2563eb' : '#c0c5cc'
    const size = '12px'
    if (active && sortConfig.direction === 'asc') {
      return <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '4px', lineHeight: 1 }}><FiArrowUp style={{ width: size, height: size, color }} /></span>
    }
    if (active && sortConfig.direction === 'desc') {
      return <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '4px', lineHeight: 1 }}><FiArrowDown style={{ width: size, height: size, color }} /></span>
    }
    // Inactive column: show both arrows dimmed
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '4px', lineHeight: 1, gap: '0px' }}>
        <FiArrowUp style={{ width: size, height: size, color }} />
        <FiArrowDown style={{ width: size, height: size, color, marginTop: '-4px' }} />
      </span>
    )
  }

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  // Paginated networks for display
  const totalPages = Math.max(1, Math.ceil(sortedNetworks.length / limit))
  const safePage = Math.min(page, totalPages)
  const paginatedNetworks = sortedNetworks.slice((safePage - 1) * limit, safePage * limit)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return { variant: 'success', label: 'Healthy' }
      case 'alert':
        return { variant: 'danger', label: 'Alert' }
      default:
        return { variant: 'default', label: 'Unknown' }
    }
  }

  // Find the most recently measured speed across all networks
  const latestSpeedInfo = networks.length > 0
    ? networks.reduce((latest, network) => {
        if (network.lastMetricTime && (!latest || new Date(network.lastMetricTime) > new Date(latest.lastMetricTime))) {
          return {
            currentSpeed: network.currentSpeed,
            currentUploadSpeed: network.currentUploadSpeed,
            currentLatency: network.currentLatency,
            lastMetricTime: network.lastMetricTime,
            wifiName: network.wifiName,
            expectedSpeed: network.expectedSpeed,
            alertThreshold: network.alertThreshold,
          }
        }
        return latest
      }, null)
    : null

  // Check if user is admin
  if (user && user.role === 'user') {
    return (
      <PageContainer>
        <Card>
          <CardBody>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Access Denied</h2>
              <p style={{ color: '#6b7280' }}>You need Admin privileges to access this page.</p>
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
        title="WiFi Monitor"
        description="Monitor WiFi network speeds and performance"
        icon={FiWifi}
        action={
          <Button icon={FiPlus} onClick={openAddModal}>
            Add WiFi Network
          </Button>
        }
      />

      {/* Search Bar */}
      {networks.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by WiFi name, SSID, BSSID, location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '24px' }}>
          <CardBody>
            <p style={{ color: '#dc2626' }}>{error}</p>
            <Button variant="danger" size="sm" style={{ marginTop: '8px' }} onClick={fetchData}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Stats Cards */}
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">

  {/* TOTAL NETWORKS */}
  <Card className="w-full">
    <CardBody>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 mb-1">
            Total Networks
          </p>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800">
            {stats?.totalNetworks || 0}
          </h3>
        </div>

        <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
          <FiWifi className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
      </div>
    </CardBody>
  </Card>

  {/* CURRENT SPEED */}

  {/* AVG SPEED */}
  
  <Card className="w-full">
    <CardBody>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 mb-1">
            Avg Speed
          </p>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800">
            {stats?.avgSpeed || "0"} Mbps
          </h3>
        </div>

        <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg">
          <FiBarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
        </div>
      </div>
    </CardBody>
  </Card>

  {/* ACTIVE ALERTS */}
  <Card className="w-full">
    <CardBody>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 mb-1">
            Active Alerts
          </p>
          <h3
            className={`text-xl sm:text-2xl md:text-3xl font-semibold ${
              stats?.activeAlerts > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {stats?.activeAlerts || 0}
          </h3>
        </div>

        <div
          className={`p-2 sm:p-3 rounded-lg ${
            stats?.activeAlerts > 0 ? "bg-red-50" : "bg-green-50"
          }`}
        >
          <FiAlertCircle
            className={`w-5 h-5 sm:w-6 sm:h-6 ${
              stats?.activeAlerts > 0 ? "text-red-600" : "text-green-600"
            }`}
          />
        </div>
      </div>
    </CardBody>
  </Card>

     </div>

{/* ── Setup hint ── */}
<div className="flex items-start gap-2 sm:gap-3 bg-blue-50 border border-blue-100 rounded-xl px-3 sm:px-4 py-3 mb-6">
  <FiInfo className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 shrink-0" />
  <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
    <span className="font-semibold">After adding or registering a WiFi network,</span>{" "}
    go to the mobile app and navigate to{" "}
    <span className="font-medium">More → Settings → WiFi Speed Monitoring</span>{" "}
    section, then tap the{" "}
    <span className="inline-flex items-center gap-1 font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md text-xs">
      Initialize
    </span>{" "}
    button to activate monitoring on your device.
  </p>
</div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card style={{ marginBottom: '24px', border: '1px solid #fecaca' }}>
          <CardBody>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiAlertCircle style={{ color: '#dc2626' }} />
              Active Alerts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map((alert) => {
                const alertType = alert.alertType || 'low_speed';
                const alertConfig = {
                  low_speed: { icon: '⚠️', bgColor: '#fef2f2', borderColor: '#fecaca', label: 'Low Speed' },
                  wifi_off: { icon: '📡', bgColor: '#f3e8ff', borderColor: '#c4b5fd', label: 'WiFi Offline' },
                  wifi_disconnected: { icon: '📱', bgColor: '#fff7ed', borderColor: '#fed7aa', label: 'WiFi Disconnected' },
                  device_offline: { icon: '📵', bgColor: '#fef2f2', borderColor: '#fecaca', label: 'Device Offline' },
                }[alertType] || { icon: '⚠️', bgColor: '#fef2f2', borderColor: '#fecaca', label: 'Alert' };

                return (
                  <div key={alert._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg" style={{ backgroundColor: alertConfig.bgColor, borderLeft: `4px solid ${alertConfig.borderColor}` }}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div style={{ fontSize: '24px' }} className="shrink-0">{alertConfig.icon}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span style={{ fontWeight: '500' }}>{alert.wifiId?.wifiName || 'Unknown WiFi'}</span>
                          <Badge variant={alertType.includes('offline') || alertType.includes('off') ? 'danger' : 'warning'} style={{ fontSize: '10px' }}>
                            {alertConfig.label}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '13px', color: '#374151' }} className="break-words">{alert.message}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                          {formatDateTime(alert.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleResolveAlert(alert._id)} className="shrink-0 self-start sm:self-center">
                      Resolve
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* WiFi Networks — Mobile Cards */}
      {sortedNetworks.length > 0 && (
        <div className="block lg:hidden space-y-4 mb-6">
          {paginatedNetworks.map((network) => {
            const isSlow = network.currentSpeed != null && parseFloat(network.currentSpeed) < network.alertThreshold
            const speedPercent = network.currentSpeed != null
              ? Math.min((parseFloat(network.currentSpeed) / network.expectedSpeed) * 100, 100)
              : 0
            return (
              <div
                key={network._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer"
                onClick={() => openDetailsModal(network)}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiWifi className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-sm text-gray-800 truncate">{network.wifiName}</span>
                    {network.location && (
                      <span className="text-xs text-gray-500 truncate">· {network.location}</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEditModal(network)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit">
                      <FiEdit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => handleDeleteWifi(network._id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Delete">
                      <FiTrash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Speed — most prominent */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Current Speed</p>
                      <p className={`text-2xl font-bold ${isSlow ? 'text-red-600' : 'text-green-600'}`}>
                        {network.currentSpeed != null ? parseFloat(network.currentSpeed).toFixed(1) : '0'}
                        <span className="text-sm font-normal text-gray-500 ml-0.5">Mbps</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Expected</p>
                      <p className="text-sm font-semibold text-gray-700">{network.expectedSpeed} Mbps</p>
                    </div>
                  </div>
                  {/* Speed progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${isSlow ? 'bg-red-500' : speedPercent >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${speedPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>↓ {parseFloat(network.currentSpeed || 0).toFixed(1)} / ↑ {parseFloat(network.currentUploadSpeed || 0).toFixed(1)} Mbps</span>
                    <span>Latency: {parseFloat(network.currentLatency || 0).toFixed(0)}ms</span>
                  </div>
                </div>

                {/* Info grid */}
                <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-500">SSID</span>
                    <p className="font-medium text-gray-700 truncate">{network.ssid || network.wifiName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Threshold</span>
                    <p className="font-medium text-gray-700">{network.alertThreshold} Mbps</p>
                  </div>
                  {network.bssid && (
                    <div className="col-span-2">
                      <span className="text-gray-500">BSSID</span>
                      <p className="font-mono text-gray-600">{network.bssid}</p>
                    </div>
                  )}
                  {network.lastMetricTime && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Last measured</span>
                      <p className="text-gray-600">
                        {formatDateTime(network.lastMetricTime)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* WiFi Networks — Desktop Table */}
      <Card className="hidden lg:block">
        <CardBody style={{ padding: 0 }}>
          {sortedNetworks.length > 0 ? (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#6b7280', fontSize: '13px', width: '50px' }}>S.No.</th>
                    <th onClick={() => handleSort('wifiName')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: sortConfig.key === 'wifiName' ? '#2563eb' : '#6b7280', fontSize: '13px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      WiFi Name {getSortIcon('wifiName')}
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' }}>Location</th>
                    <th onClick={() => handleSort('ssid')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: sortConfig.key === 'ssid' ? '#2563eb' : '#6b7280', fontSize: '13px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      SSID / BSSID {getSortIcon('ssid')}
                    </th>
                    <th onClick={() => handleSort('expectedSpeed')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: sortConfig.key === 'expectedSpeed' ? '#2563eb' : '#6b7280', fontSize: '13px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      Expected Speed {getSortIcon('expectedSpeed')}
                    </th>
                    <th onClick={() => handleSort('alertThreshold')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: sortConfig.key === 'alertThreshold' ? '#2563eb' : '#6b7280', fontSize: '13px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      Alert Threshold {getSortIcon('alertThreshold')}
                    </th>
                    <th onClick={() => handleSort('currentSpeed')} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: sortConfig.key === 'currentSpeed' ? '#2563eb' : '#6b7280', fontSize: '13px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      Current Speed {getSortIcon('currentSpeed')}
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNetworks.map((network, index) => {
                    const isSlow = network.currentSpeed != null && parseFloat(network.currentSpeed) < network.alertThreshold
                    const speedPercent = network.currentSpeed != null
                      ? Math.min((parseFloat(network.currentSpeed) / network.expectedSpeed) * 100, 100)
                      : 0
                    return (
                      <tr key={network._id} style={{ borderTop: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => openDetailsModal(network)}>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{(safePage - 1) * limit + index + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiWifi style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                            <div style={{ fontWeight: '500' }}>{network.wifiName}</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {network.location || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '13px' }}>
                            <div style={{ fontWeight: '500' }}>{network.ssid || network.wifiName}</div>
                            {network.bssid && (
                              <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                                {network.bssid}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{network.expectedSpeed} Mbps</td>
                        <td style={{ padding: '12px 16px' }}>{network.alertThreshold} Mbps</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>
                            <span style={{ fontWeight: '600', color: isSlow ? '#dc2626' : '#16a34a', fontSize: '14px' }}>
                              {network.currentSpeed != null ? parseFloat(network.currentSpeed).toFixed(2) : '0'} Mbps
                            </span>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                              <span>↓ {parseFloat(network.currentSpeed || 0).toFixed(1)}</span>
                              <span>↑ {parseFloat(network.currentUploadSpeed || 0).toFixed(1)}</span>
                              <span>{parseFloat(network.currentLatency || 0).toFixed(0)}ms</span>
                            </div>
                            {/* Speed progress bar */}
                            <div style={{ marginTop: '6px', width: '100%', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px' }}>
                              <div style={{
                                width: `${speedPercent}%`,
                                height: '4px',
                                borderRadius: '2px',
                                backgroundColor: isSlow ? '#dc2626' : speedPercent >= 80 ? '#16a34a' : '#eab308',
                                transition: 'width 0.5s ease',
                              }} />
                            </div>
                            {network.lastMetricTime && (
                              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                {formatDateTime(network.lastMetricTime)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openEditModal(network)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Edit"
                            >
                              <FiEdit style={{ width: '16px', height: '16px' }} />
                            </button>
                            <button
                              onClick={() => handleDeleteWifi(network._id)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Delete"
                            >
                              <FiTrash2 style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiSearch style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                {searchQuery ? 'No matching networks' : 'No WiFi Networks'}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                {searchQuery ? `No results for "${searchQuery}"` : 'Add your first WiFi network to start monitoring'}
              </p>
              {searchQuery ? (
                <Button variant="secondary" onClick={() => setSearchQuery('')}>Clear Search</Button>
              ) : (
                <Button onClick={openAddModal}>Add WiFi Network</Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {sortedNetworks.length > 0 && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value))
                  setPage(1)
                }}
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
                  currentPage={safePage}
                  totalPages={totalPages}
                  total={sortedNetworks.length}
                  limit={limit}
                  onPageChange={setPage}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for mobile (when no networks or no search results) */}
      {sortedNetworks.length === 0 && networks.length > 0 && (
        <Card className="block lg:hidden">
          <CardBody>
            <div className="text-center py-8">
              <FiSearch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No matching networks</h3>
              <p className="text-gray-500 mb-4">No results for "{searchQuery}"</p>
              <Button variant="secondary" onClick={() => setSearchQuery('')}>Clear Search</Button>
            </div>
          </CardBody>
        </Card>
      )}
      {networks.length === 0 && (
        <Card className="block lg:hidden">
          <CardBody>
            <div className="text-center py-8">
             
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No WiFi Networks</h3>
              <p className="text-gray-500 mb-4">Add your first WiFi network to start monitoring</p>
              <Button onClick={openAddModal}>Add WiFi Network</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AddWifiModal
        isOpen={showAddModal}
        onClose={closeAddModal}
        wifi={editingWifi}
        onSave={handleSaveWifi}
        existingNetworks={networks}
      />

      {/* Details Modal */}
      <WifiDetailsModal
        isOpen={showDetailsModal}
        onClose={closeDetailsModal}
        wifi={selectedWifi}
        stats={selectedWifi ? stats?.networkStats?.find(n => n._id === selectedWifi._id) : null}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteWifi}
        title="Delete WiFi Network"
        message="Are you sure you want to delete this WiFi network? All devices will be unassigned. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}