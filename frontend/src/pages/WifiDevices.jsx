import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiWifi,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiX,
  FiCheck,
  FiSmartphone,
  FiRefreshCw,
  FiAlertCircle,
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
} from '../components/ui'

// Assign Device Modal
function AssignDeviceModal({ isOpen, onClose, device, wifiNetworks, onAssign }) {
  const [loading, setLoading] = useState(false)
  const [selectedWifi, setSelectedWifi] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (device && device.wifiId) {
      setSelectedWifi(device.wifiId._id || device.wifiId)
      setIsActive(device.isActive)
    } else {
      setSelectedWifi('')
      setIsActive(true)
    }
  }, [device])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedWifi) {
      toast.error('Please select a WiFi network')
      return
    }

    setLoading(true)
    try {
      await onAssign(device.deviceId, selectedWifi, isActive)
      toast.success('Device assigned successfully')
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign device')
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
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Assign Device to WiFi
          </h2>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <FiX style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              Device Name
            </label>
            <input
              type="text"
              value={device?.deviceName || ''}
              disabled
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
              WiFi Network *
            </label>
            <select
              value={selectedWifi}
              onChange={(e) => setSelectedWifi(e.target.value)}
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
            >
              <option value="">Select WiFi Network</option>
              {wifiNetworks.map((wifi) => (
                <option key={wifi._id} value={wifi._id}>
                  {wifi.wifiName} (Expected: {wifi.expectedSpeed} Mbps)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px' }}>Active (Device can send metrics)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={loading}>Assign</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main WifiDevices Page
export default function WifiDevices() {
  const { api, user } = useAuth()
  const [devices, setDevices] = useState([])
  const [wifiNetworks, setWifiNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [wifiFilter, setWifiFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)

  useEffect(() => {
    fetchDevices()
    fetchWifiNetworks()
  }, [pagination.page])

  useEffect(() => {
    if (pagination.page === 1) {
      fetchDevices()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [search, wifiFilter, statusFilter])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(wifiFilter && { wifiId: wifiFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      })

      const response = await api.get(`/wifi/devices?${params}`)
      setDevices(response.data.data || [])
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }))
    } catch (err) {
      console.error('Failed to fetch devices:', err)
      const message = err.response?.data?.message || err.message || 'Failed to fetch devices'
      setError(message)
      toast.error(message)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  const fetchWifiNetworks = async () => {
    try {
      const response = await api.get('/wifi/networks?limit=100')
      setWifiNetworks(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch WiFi networks:', err)
    }
  }

  const handleAssignDevice = async (deviceId, wifiId, isActive) => {
    await api.put('/wifi/assign-device', { deviceId, wifiId, isActive })
    fetchDevices()
  }

  const handleUnassignDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to unassign this device?')) return

    try {
      await api.put(`/wifi/unassign-device/${deviceId}`)
      toast.success('Device unassigned successfully')
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unassign device')
    }
  }

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return

    try {
      await api.delete(`/wifi/devices/${deviceId}`)
      toast.success('Device deleted successfully')
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete device')
    }
  }

  const openAssignModal = (device) => {
    setSelectedDevice(device)
    setShowAssignModal(true)
  }

  const closeAssignModal = () => {
    setShowAssignModal(false)
    setSelectedDevice(null)
  }

  const getStatusBadge = (device) => {
    if (!device.wifiId) return { variant: 'warning', label: 'Pending Approval' }
    if (!device.isActive) return { variant: 'secondary', label: 'Disabled' }

    // Check if online (last seen within 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    if (device.lastSeen && new Date(device.lastSeen) > tenMinutesAgo) {
      return { variant: 'success', label: 'Online' }
    }
    return { variant: 'default', label: 'Offline' }
  }

  const formatDate = (date) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
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

  if (loading && devices.length === 0) {
    return (
      <PageContainer>
        <Spinner size="lg" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="WiFi Devices"
        description="Manage devices for WiFi speed monitoring"
        icon={FiSmartphone}
      />

      {/* Error State */}
      {error && (
        <Card style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '24px' }}>
          <CardBody>
            <p style={{ color: '#dc2626' }}>{error}</p>
            <Button variant="danger" size="sm" style={{ marginTop: '8px' }} onClick={fetchDevices}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={(e) => { e.preventDefault(); fetchDevices(); }} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search devices..."
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
              value={wifiFilter}
              onChange={(e) => setWifiFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '160px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All WiFi Networks</option>
              <option value="unassigned">Unassigned</option>
              {wifiNetworks.map((wifi) => (
                <option key={wifi._id} value={wifi._id}>{wifi.wifiName}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button type="submit">Search</Button>
          </form>
        </CardBody>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {devices.length > 0 ? (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Device Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Device ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Assigned WiFi</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Last Seen</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => {
                    const status = getStatusBadge(device)
                    return (
                      <tr key={device._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiSmartphone style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                            <div>
                              <div style={{ fontWeight: '500' }}>{device.deviceName}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                          {device.deviceId.substring(0, 12)}...
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {device.wifiId ? (
                            <div>
                              <div style={{ fontWeight: '500' }}>{device.wifiId.wifiName}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Threshold: {device.wifiId.alertThreshold} Mbps
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not assigned</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {formatDate(device.lastSeen)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {device.wifiId ? (
                              <>
                                <button
                                  onClick={() => openAssignModal(device)}
                                  style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                  title="Change WiFi Assignment"
                                >
                                  <FiEdit style={{ width: '16px', height: '16px' }} />
                                </button>
                                <button
                                  onClick={() => handleUnassignDevice(device.deviceId)}
                                  style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                  title="Unassign Device"
                                >
                                  <FiX style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                                </button>
                              </>
                            ) : (
                              <Button size="sm" onClick={() => openAssignModal(device)}>
                                Assign WiFi
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteDevice(device.deviceId)}
                              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Delete Device"
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
              <FiSmartphone style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Devices Found</h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Devices will appear here when they register from the mobile app
              </p>
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

      {/* Assign Modal */}
      <AssignDeviceModal
        isOpen={showAssignModal}
        onClose={closeAssignModal}
        device={selectedDevice}
        wifiNetworks={wifiNetworks}
        onAssign={handleAssignDevice}
      />
    </PageContainer>
  )
}