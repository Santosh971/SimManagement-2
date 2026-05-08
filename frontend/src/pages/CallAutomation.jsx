/**
 * Call Automation Configuration Page
 *
 * Admin page for configuring automated SIM call verification.
 * Allows selection of caller SIMs, target SIMs, call duration, and frequency.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPhone,
  FiPhoneOutgoing,
  FiPhoneIncoming,
  FiPlay,
  FiPause,
  FiSave,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiInfo,
  FiSmartphone,
} from 'react-icons/fi'
import {  FiSettings } from 'react-icons/fi'
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

// Multi-select SIM component
function SimMultiSelect({ label, sims, selected, onChange, placeholder, disabled }) {
  const [search, setSearch] = useState('')

  const filteredSims = sims.filter(sim => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      sim.mobileNumber?.toLowerCase().includes(searchLower) ||
      sim.operator?.toLowerCase().includes(searchLower) ||
      sim.assignedTo?.name?.toLowerCase().includes(searchLower)
    )
  })

  const toggleSim = (simId) => {
    if (disabled) return
    if (selected.includes(simId)) {
      onChange(selected.filter(id => id !== simId))
    } else {
      onChange([...selected, simId])
    }
  }

  const selectAll = () => {
    if (disabled) return
    onChange(filteredSims.map(s => s._id))
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#374151'
      }}>
        {label}
      </label>

      {/* Search and actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            backgroundColor: disabled ? '#f3f4f6' : '#fff',
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={selectAll}
          disabled={disabled}
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={disabled}
        >
          Clear
        </Button>
      </div>

      {/* Selected count */}
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '8px'
      }}>
        {selected.length} SIM{selected.length !== 1 ? 's' : ''} selected
      </div>

      {/* SIM list */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        maxHeight: '200px',
        overflow: 'auto',
        backgroundColor: '#fff',
      }}>
        {filteredSims.length > 0 ? (
          filteredSims.map((sim) => {
            const isSelected = selected.includes(sim._id)
            return (
              <div
                key={sim._id}
                onClick={() => toggleSim(sim._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: disabled ? 'default' : 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  transition: 'background-color 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                    backgroundColor: isSelected ? '#2563eb' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isSelected && (
                      <FiCheck style={{ width: '12px', height: '12px', color: '#fff' }} />
                    )}
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
                <Badge
                  variant={sim.status === 'active' ? 'success' : 'default'}
                  style={{ fontSize: '10px' }}
                >
                  {sim.status}
                </Badge>
              </div>
            )
          })
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            {search ? 'No SIMs match your search' : 'No active SIMs available'}
          </div>
        )}
      </div>
    </div>
  )
}

// Main Call Automation Page
export default function CallAutomation() {
  const { api, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sims, setSims] = useState([])
  const [config, setConfig] = useState(null)

  // Form state
  const [callerSimIds, setCallerSimIds] = useState([])
  const [targetSimIds, setTargetSimIds] = useState([])
  const [callDuration, setCallDuration] = useState(10)
  const [frequency, setFrequency] = useState('daily')
  const [scheduledTime, setScheduledTime] = useState('09:00') // Time in HH:MM format
  const [scheduledDay, setScheduledDay] = useState('monday') // Day of week for weekly
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch eligible SIMs and existing config in parallel
      const [simsRes, configRes] = await Promise.all([
        api.get('/call-automation/eligible-sims'),
        api.get('/call-automation/config')
      ])

      setSims(simsRes.data.data || [])

      if (configRes.data.data) {
        const existingConfig = configRes.data.data
        setConfig(existingConfig)
        setCallerSimIds(existingConfig.callerSimIds?.map(s => s._id || s) || [])
        setTargetSimIds(existingConfig.targetSimIds?.map(s => s._id || s) || [])
        setCallDuration(existingConfig.callDuration || 10)
        setFrequency(existingConfig.frequency || 'daily')
        setScheduledTime(existingConfig.scheduledTime || '09:00')
        setScheduledDay(existingConfig.scheduledDay || 'monday')
        setIsActive(existingConfig.isActive ?? true)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error(error.response?.data?.message || 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validation
    if (callerSimIds.length === 0) {
      toast.error('Please select at least one caller SIM')
      return
    }

    if (targetSimIds.length === 0) {
      toast.error('Please select at least one target SIM')
      return
    }

    if (callDuration < 10 || callDuration > 60) {
      toast.error('Call duration must be between 10 and 60 seconds')
      return
    }

    setSaving(true)

    try {
      const data = {
        callerSimIds,
        targetSimIds,
        callDuration: parseInt(callDuration),
        frequency,
        scheduledTime,
        scheduledDay,
        isActive
      }

      await api.post('/call-automation/config', data)
      toast.success('Configuration saved successfully')
      fetchData()
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error(error.response?.data?.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    try {
      const newIsActive = !isActive
      await api.put('/call-automation/toggle', { isActive: newIsActive })
      setIsActive(newIsActive)
      toast.success(`Call automation ${newIsActive ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Failed to toggle:', error)
      toast.error(error.response?.data?.message || 'Failed to toggle')
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
        title="Call Automation"
        description="Configure automated SIM call verification to keep SIMs active"
        icon={FiPhone}
        action={
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="secondary"
              icon={FiRefreshCw}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant={isActive ? 'danger' : 'success'}
              icon={isActive ? FiPause : FiPlay}
              onClick={handleToggle}
            >
              {isActive ? 'Disable' : 'Enable'}
            </Button>
          </div>
        }
      />

      {/* Status Banner */}
      <Card style={{
        marginBottom: '24px',
        backgroundColor: isActive ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isActive ? '#86efac' : '#fecaca'}`
      }}>
        <CardBody>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isActive ? (
                <FiPlay style={{ width: '24px', height: '24px', color: '#16a34a' }} />
              ) : (
                <FiPause style={{ width: '24px', height: '24px', color: '#dc2626' }} />
              )}
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  Call Automation is {isActive ? 'Active' : 'Paused'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {isActive
                    ? frequency === 'hourly'
                      ? `Calls every hour with ${callDuration}s duration`
                      : frequency === 'daily'
                        ? `Calls daily at ${scheduledTime} with ${callDuration}s duration`
                        : `Calls every ${scheduledDay} at ${scheduledTime} with ${callDuration}s duration`
                    : 'Enable to start automated calls'}
                </div>
              </div>
            </div>
            <Badge variant={isActive ? 'success' : 'danger'} style={{ fontSize: '14px' }}>
              {isActive ? 'ENABLED' : 'DISABLED'}
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* Info Banner */}
      <Card style={{
        marginBottom: '24px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe'
      }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '12px' }}>
            <FiInfo style={{ width: '20px', height: '20px', color: '#2563eb', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#1e40af' }}>
              <strong>How it works:</strong> Caller SIMs will make outgoing calls to Target SIMs at the configured frequency.
              This keeps your SIMs active and prevents deactivation due to inactivity.
              <br /><br />
              <strong>Note:</strong> This feature is for enterprise use only. Ensure you have proper permissions before enabling automated calls.
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardBody>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPhoneOutgoing style={{ color: '#2563eb' }} />
            Caller SIMs (will make outgoing calls)
          </h3>

          <SimMultiSelect
            label=""
            sims={sims}
            selected={callerSimIds}
            onChange={setCallerSimIds}
            placeholder="Search caller SIMs..."
            disabled={!isActive}
          />

          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiPhoneIncoming style={{ color: '#16a34a' }} />
              Target SIMs (will receive calls)
            </h3>

            <SimMultiSelect
              label=""
              sims={sims}
              selected={targetSimIds}
              onChange={setTargetSimIds}
              placeholder="Search target SIMs..."
              disabled={!isActive}
            />
          </div>

          {/* Call Settings */}
          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#374151'
              }}>
                Call Duration (seconds)
              </label>
              <input
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                min={10}
                max={60}
                disabled={!isActive}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: isActive ? '#fff' : '#f3f4f6',
                }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Min: 10 seconds, Max: 60 seconds
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#374151'
              }}>
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                disabled={!isActive}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: isActive ? '#fff' : '#f3f4f6',
                }}
              >
                <option value="hourly">Every Hour</option>
                <option value="daily">Once Daily</option>
                <option value="weekly">Once Weekly</option>
              </select>
            </div>
          </div>

          {/* Scheduled Time Settings */}
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: frequency === 'weekly' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#374151'
              }}>
                Scheduled Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={!isActive || frequency === 'hourly'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: (!isActive || frequency === 'hourly') ? '#f3f4f6' : '#fff',
                }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {frequency === 'hourly' ? 'Not applicable for hourly frequency' : 'Time when calls will be made'}
              </div>
            </div>

            {frequency === 'weekly' && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Day of Week
                </label>
                <select
                  value={scheduledDay}
                  onChange={(e) => setScheduledDay(e.target.value)}
                  disabled={!isActive}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: isActive ? '#fff' : '#f3f4f6',
                  }}
                >
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </select>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Day when weekly calls will be made
                </div>
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#374151'
              }}>
                Schedule Preview
              </label>
              <div style={{
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: '#374151'
              }}>
                {frequency === 'hourly' && 'Every hour (24 times per day)'}
                {frequency === 'daily' && `Daily at ${scheduledTime}`}
                {frequency === 'weekly' && `Every ${scheduledDay.charAt(0).toUpperCase() + scheduledDay.slice(1)} at ${scheduledTime}`}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (config) {
                  setCallerSimIds(config.callerSimIds?.map(s => s._id || s) || [])
                  setTargetSimIds(config.targetSimIds?.map(s => s._id || s) || [])
                  setCallDuration(config.callDuration || 10)
                  setFrequency(config.frequency || 'daily')
                  setScheduledTime(config.scheduledTime || '09:00')
                  setScheduledDay(config.scheduledDay || 'monday')
                  setIsActive(config.isActive ?? true)
                }
              }}
            >
              Reset
            </Button>
            <Button
              icon={FiSave}
              onClick={handleSave}
              loading={saving}
              disabled={!isActive && callerSimIds.length === 0}
            >
              Save Configuration
            </Button>
          </div>

    {/* ── Mobile App Sync Note ── */}
    <div style={{
      marginTop: '20px',
      padding: '14px 16px',
      backgroundColor: '#fffbeb',
      border: '1px solid #fde68a',
      borderLeft: '4px solid #f59e0b',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      {/* Warning icon */}
      <div style={{ flexShrink: 0, marginTop: '1px' }}>
        <FiInfo style={{ width: '18px', height: '18px', color: '#d97706' }} />
      </div>

      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#92400e',
          margin: '0 0 6px 0',
        }}>
          Important: Sync Required on Mobile App
        </p>
        <p style={{
          fontSize: '13px',
          color: '#78350f',
          margin: '0 0 10px 0',
          lineHeight: '1.6',
        }}>
          After saving or scheduling the automation, you must refresh the schedule on the mobile app for changes to take effect.
        </p>

        {/* Steps */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
        }}>
          {/* Step 1 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#92400e',
            whiteSpace: 'nowrap',
          }}>
            <FiSmartphone style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            "More" Tab
          </div>

          <span style={{ color: '#d97706', fontSize: '13px', fontWeight: '600' }}>→</span>

          {/* Step 2 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#92400e',
            whiteSpace: 'nowrap',
          }}>
            <FiSettings style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            "Settings"
          </div>

          <span style={{ color: '#d97706', fontSize: '13px', fontWeight: '600' }}>→</span>

          {/* Step 3 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#92400e',
            whiteSpace: 'nowrap',
          }}>
            "Call Automation" section
          </div>

          <span style={{ color: '#d97706', fontSize: '13px', fontWeight: '600' }}>→</span>

          {/* Step 4 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            backgroundColor: '#d97706',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#fff',
            whiteSpace: 'nowrap',
          }}>
            <FiRefreshCw style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            Tap "Refresh"
          </div>
        </div>
      </div>
    </div>


        </CardBody>
      </Card>
    </PageContainer>
  )
}