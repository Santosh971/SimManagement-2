import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiWifi,
  FiPlus,
  FiAlertCircle,
  FiActivity,
  FiSmartphone,
  FiX,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiUsers,
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
} from '../components/ui'

// Add WiFi Modal (Updated with SSID, BSSID, and SIM Assignment)
function AddWifiModal({ isOpen, onClose, wifi, onSave }) {
  const { api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [eligibleSims, setEligibleSims] = useState([])
  const [simSearch, setSimSearch] = useState('')
  const [showSimDropdown, setShowSimDropdown] = useState(false)
  const [formData, setFormData] = useState({
    wifiName: '',
    ssid: '',
    bssid: '',
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
        expectedSpeed: '',
        alertThreshold: '',
        emailAlertEnabled: true,
        assignedSims: [],
      })
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.wifiName || !formData.expectedSpeed || !formData.alertThreshold) {
      toast.error('Please fill all required fields')
      return
    }

    setLoading(true)
    try {
      const data = {
        wifiName: formData.wifiName,
        ssid: formData.ssid || formData.wifiName, // Default SSID to WiFi name if not provided
        bssid: formData.bssid,
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

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* WiFi Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              WiFi Name *
            </label>
            <input
              type="text"
              name="wifiName"
              value={formData.wifiName}
              onChange={handleChange}
              placeholder="e.g., Office Main WiFi"
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

          {/* SSID and BSSID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                SSID (Network Name)
              </label>
              <input
                type="text"
                name="ssid"
                value={formData.ssid}
                onChange={handleChange}
                placeholder="e.g., Office_WiFi_5G"
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
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                The actual network name devices connect to
              </p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                BSSID (Router MAC)
              </label>
              <input
                type="text"
                name="bssid"
                value={formData.bssid}
                onChange={handleChange}
                placeholder="e.g., AA:BB:CC:DD:EE:FF"
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
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                MAC address of the router (for security)
              </p>
            </div>
          </div>

          {/* Expected Speed and Alert Threshold */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                Expected Speed (Mbps) *
              </label>
              <input
                type="number"
                name="expectedSpeed"
                value={formData.expectedSpeed}
                onChange={handleChange}
                placeholder="e.g., 100"
                min="0"
                step="0.1"
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
                Alert Threshold (Mbps) *
              </label>
              <input
                type="number"
                name="alertThreshold"
                value={formData.alertThreshold}
                onChange={handleChange}
                placeholder="e.g., 50"
                min="0"
                step="0.1"
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
                          onChange={() => {}} // Handled by parent div click
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
              {wifi.ssid && wifi.ssid !== wifi.wifiName && (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>SSID: {wifi.ssid}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Expected Speed</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{wifi.expectedSpeed} Mbps</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Alert Threshold</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{wifi.alertThreshold} Mbps</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Current Avg Speed</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: stats?.avgSpeed && parseFloat(stats.avgSpeed) < wifi.alertThreshold ? '#dc2626' : '#16a34a' }}>
                {stats?.avgSpeed || '0'} Mbps
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Devices</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats?.deviceCount || 0}</div>
            </div>
          </div>

          {/* Network Info (SSID, BSSID) */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Network Identifiers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              <FiUsers style={{ width: '16px', height: '16px' }} />
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
                <FiUsers style={{ width: '24px', height: '24px', color: '#9ca3af', marginBottom: '8px' }} />
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
          <div>
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
                          Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
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
          </div>
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

  const handleDeleteWifi = async (wifiId) => {
    if (!window.confirm('Are you sure you want to delete this WiFi network? All devices will be unassigned.')) return

    try {
      await api.delete(`/wifi/networks/${wifiId}`)
      toast.success('WiFi network deleted successfully')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete WiFi network')
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Networks</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats?.totalNetworks || 0}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                <FiWifi style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Active Devices</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats?.activeDevices || 0}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <FiSmartphone style={{ width: '24px', height: '24px', color: '#16a34a' }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Avg Speed</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{stats?.avgSpeed || '0'} Mbps</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '8px' }}>
                <FiActivity style={{ width: '24px', height: '24px', color: '#ca8a04' }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Active Alerts</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: stats?.activeAlerts > 0 ? '#dc2626' : '#16a34a' }}>
                  {stats?.activeAlerts || 0}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: stats?.activeAlerts > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px' }}>
                <FiAlertCircle style={{ width: '24px', height: '24px', color: stats?.activeAlerts > 0 ? '#dc2626' : '#16a34a' }} />
              </div>
            </div>
          </CardBody>
        </Card>
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
              {alerts.map((alert) => (
                <div key={alert._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{alert.wifiId?.wifiName || 'Unknown WiFi'}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{alert.message}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(alert.createdAt).toLocaleString()}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleResolveAlert(alert._id)}>
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* WiFi Networks Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {networks.length > 0 ? (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>WiFi Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>SSID / BSSID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Expected Speed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Alert Threshold</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Current Speed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Devices</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>SIMs</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {networks.map((network) => {
                    const status = getStatusBadge(network.status)
                    return (
                      <tr key={network._id} style={{ borderTop: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => openDetailsModal(network)}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiWifi style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                            <div style={{ fontWeight: '500' }}>{network.wifiName}</div>
                          </div>
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
                          <span style={{ color: network.currentAvgSpeed && parseFloat(network.currentAvgSpeed) < network.alertThreshold ? '#dc2626' : '#16a34a' }}>
                            {network.currentAvgSpeed || '0'} Mbps
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{network.deviceCount || 0}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiUsers style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                            <span style={{
                              fontSize: '13px',
                              color: network.assignedSims?.length > 0 ? '#2563eb' : '#6b7280',
                              fontWeight: network.assignedSims?.length > 0 ? '500' : '400'
                            }}>
                              {network.assignedSims?.length || 0}
                            </span>
                            {network.assignedSims?.length === 0 && (
                              <span style={{ fontSize: '10px', color: '#9ca3af' }}>(all)</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openEditModal(network)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Edit"
                            >
                              <FiActivity style={{ width: '16px', height: '16px' }} />
                            </button>
                            <button
                              onClick={() => handleDeleteWifi(network._id)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Delete"
                            >
                              <FiX style={{ width: '16px', height: '16px', color: '#dc2626' }} />
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
              <FiWifi style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No WiFi Networks</h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Add your first WiFi network to start monitoring</p>
              <Button onClick={openAddModal}>Add WiFi Network</Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <AddWifiModal
        isOpen={showAddModal}
        onClose={closeAddModal}
        wifi={editingWifi}
        onSave={handleSaveWifi}
      />

      {/* Details Modal */}
      <WifiDetailsModal
        isOpen={showDetailsModal}
        onClose={closeDetailsModal}
        wifi={selectedWifi}
        stats={selectedWifi ? stats?.networkStats?.find(n => n._id === selectedWifi._id) : null}
      />
    </PageContainer>
  )
}