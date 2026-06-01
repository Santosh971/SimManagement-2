/**
 * Call Automation Configuration Page
 *
 * Admin page for configuring automated SIM call verification.
 * UPDATED: Now supports per-target caller assignment where each target SIM
 * can have its own set of caller SIMs.
 *
 * BACKWARD COMPATIBLE: Works with both old format (callerSimIds/targetSimIds)
 * and new format (targetCallerMappings) from the backend.
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
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiSettings,
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

// Caller SIM selector component for a target
function CallerSelector({ callers, selectedCallers, onChange, disabled }) {
  const [search, setSearch] = useState('')

  const filteredCallers = callers.filter(sim => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      sim.mobileNumber?.toLowerCase().includes(searchLower) ||
      sim.operator?.toLowerCase().includes(searchLower) ||
      sim.assignedTo?.name?.toLowerCase().includes(searchLower)
    )
  })

  const toggleCaller = (simId) => {
    if (disabled) return
    if (selectedCallers.includes(simId)) {
      onChange(selectedCallers.filter(id => id !== simId))
    } else {
      onChange([...selectedCallers, simId])
    }
  }

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search caller SIMs..."
        disabled={disabled}
        style={{
          width: '100%',
          padding: '6px 10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '12px',
          marginBottom: '8px',
          outline: 'none',
          backgroundColor: disabled ? '#f3f4f6' : '#fff',
        }}
      />

      {/* Caller list */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        maxHeight: '150px',
        overflow: 'auto',
        backgroundColor: '#fff',
      }}>
        {filteredCallers.length > 0 ? (
          filteredCallers.map((sim) => {
            const isSelected = selectedCallers.includes(sim._id)
            return (
              <div
                key={sim._id}
                onClick={() => toggleCaller(sim._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: disabled ? 'default' : 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                  backgroundColor: isSelected ? '#2563eb' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px',
                }}>
                  {isSelected && (
                    <FiCheck style={{ width: '10px', height: '10px', color: '#fff' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '12px' }}>
                    {sim.mobileNumber}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>
                    {sim.operator}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
            {search ? 'No callers match' : 'No callers available'}
          </div>
        )}
      </div>
    </div>
  )
}

// Target selector dropdown
function TargetSelector({ targets, selectedTargetId, onChange, disabled }) {
  return (
    <select
      value={selectedTargetId || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        outline: 'none',
        backgroundColor: disabled ? '#f3f4f6' : '#fff',
      }}
    >
      <option value="">Select a target SIM...</option>
      {targets.map((sim) => (
        <option key={sim._id} value={sim._id}>
          {sim.mobileNumber} ({sim.operator}) - {sim.assignedTo?.name || 'Unassigned'}
        </option>
      ))}
    </select>
  )
}

// Target-Caller Mapping Card
function TargetMappingCard({ mapping, callers, allTargets, onRemove, onUpdateCallers, onUpdateDuration, disabled, globalDuration }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const target = allTargets.find(t => t._id === mapping.targetSimId)

  if (!target) return null

  const selectedCallers = mapping.callerSimIds || []

  return (
    <Card style={{
      marginBottom: '16px',
      border: '1px solid #e5e7eb',
      boxShadow: 'none',
    }}>
      <CardBody style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FiPhoneIncoming style={{ color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                {target.mobileNumber}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {target.operator} • {target.assignedTo?.name || 'Unassigned'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="success" style={{ fontSize: '11px' }}>
              {selectedCallers.length} caller{selectedCallers.length !== 1 ? 's' : ''}
            </Badge>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
              style={{
                padding: '4px 8px',
                border: 'none',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            <button
              onClick={() => onRemove(mapping.targetSimId)}
              disabled={disabled}
              style={{
                padding: '4px 8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                borderRadius: '4px',
                cursor: disabled ? 'default' : 'pointer',
                color: '#dc2626',
              }}
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '600',
                fontSize: '12px',
                color: '#374151'
              }}>
                Caller SIMs (will call this target)
              </label>
              <CallerSelector
                callers={callers}
                selectedCallers={selectedCallers}
                onChange={(ids) => onUpdateCallers(mapping.targetSimId, ids)}
                disabled={disabled}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: '600',
                  fontSize: '12px',
                  color: '#374151'
                }}>
                  Call Duration (seconds)
                </label>
                <input
                  type="number"
                  value={mapping.callDuration || globalDuration}
                  onChange={(e) => onUpdateDuration(mapping.targetSimId, parseInt(e.target.value) || globalDuration)}
                  min={10}
                  max={60}
                  disabled={disabled}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: disabled ? '#f3f4f6' : '#fff',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Global: {globalDuration}s
              </div>
            </div>
          </div>
        )}

        {/* Collapsed caller preview */}
        {!isExpanded && selectedCallers.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
            Called by: {callers
              .filter(c => selectedCallers.includes(c._id))
              .map(c => c.mobileNumber)
              .join(', ')}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// Main Call Automation Page
export default function CallAutomation() {
  const { api, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [callers, setCallers] = useState([]) // SIMs marked as isAdminCaller
  const [potentialTargets, setPotentialTargets] = useState([]) // All active SIMs
  const [config, setConfig] = useState(null)

  // Form state
  const [targetCallerMappings, setTargetCallerMappings] = useState([])
  const [callDuration, setCallDuration] = useState(10)
  const [frequency, setFrequency] = useState('daily')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [scheduledDay, setScheduledDay] = useState('monday')
  const [isActive, setIsActive] = useState(true)

  // Add target modal state
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [newTargetId, setNewTargetId] = useState('')
  const [newCallerIds, setNewCallerIds] = useState([])

  // Compute available targets (not yet in mappings)
  const usedTargetIds = targetCallerMappings.map(m => m.targetSimId)
  const availableTargets = potentialTargets.filter(t => !usedTargetIds.includes(t._id))

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch eligible SIMs and existing config in parallel
      const [simsRes, configRes] = await Promise.all([
        api.get('/call-automation/eligible-sims').catch(err => {
          console.error('Failed to fetch eligible SIMs:', err)
          return { data: { data: { callers: [], potentialTargets: [], all: [] } } }
        }),
        api.get('/call-automation/config').catch(err => {
          console.error('Failed to fetch config:', err)
          return { data: { data: null } }
        })
      ])

      const simsData = simsRes.data.data || {}

      // Handle both old and new API response formats
      if (simsData.callers) {
        setCallers(simsData.callers || [])
        setPotentialTargets(simsData.potentialTargets || simsData.all || [])
      } else if (Array.isArray(simsRes.data.data)) {
        // Old format: returns flat array of sims
        const allSims = simsRes.data.data
        setCallers(allSims.filter(s => s.isAdminCaller === true))
        setPotentialTargets(allSims)
      }

      if (configRes.data.data) {
        const existingConfig = configRes.data.data
        setConfig(existingConfig)

        // Handle new format (targetCallerMappings)
        if (existingConfig.targetCallerMappings && existingConfig.targetCallerMappings.length > 0) {
          const mappings = existingConfig.targetCallerMappings.map(m => ({
            targetSimId: m.targetSimId?._id || m.targetSimId,
            callerSimIds: (m.callerSimIds || []).map(c => c._id || c),
            callDuration: m.callDuration || existingConfig.callDuration || 10
          }))
          setTargetCallerMappings(mappings)
        }
        // Handle old format (callerSimIds + targetSimIds) - convert to new format
        else if (existingConfig.callerSimIds?.length > 0 && existingConfig.targetSimIds?.length > 0) {
          const oldCallers = existingConfig.callerSimIds.map(c => c._id || c)
          const mappings = existingConfig.targetSimIds.map(t => ({
            targetSimId: t._id || t,
            callerSimIds: oldCallers,
            callDuration: existingConfig.callDuration || 10
          }))
          setTargetCallerMappings(mappings)
        }

        setCallDuration(existingConfig.callDuration || 10)
        setFrequency(existingConfig.frequency || 'daily')
        setScheduledTime(existingConfig.scheduledTime || '09:00')
        setScheduledDay(existingConfig.scheduledDay || 'monday')
        setIsActive(existingConfig.isActive ?? true)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load configuration'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTarget = () => {
    if (!newTargetId) {
      toast.error('Please select a target SIM')
      return
    }
    if (newCallerIds.length === 0) {
      toast.error('Please select at least one caller SIM')
      return
    }

    // Check if target already exists
    if (usedTargetIds.includes(newTargetId)) {
      toast.error('This target SIM is already added')
      return
    }

    // Check overlap - target cannot be in callers
    if (newCallerIds.includes(newTargetId)) {
      toast.error('Target SIM cannot also be a caller')
      return
    }

    setTargetCallerMappings([
      ...targetCallerMappings,
      {
        targetSimId: newTargetId,
        callerSimIds: newCallerIds,
        callDuration: callDuration
      }
    ])

    // Reset form
    setNewTargetId('')
    setNewCallerIds([])
    setShowAddTarget(false)
    toast.success('Target SIM added')
  }

  const handleRemoveTarget = (targetSimId) => {
    setTargetCallerMappings(targetCallerMappings.filter(m => m.targetSimId !== targetSimId))
  }

  const handleUpdateCallers = (targetSimId, callerIds) => {
    setTargetCallerMappings(targetCallerMappings.map(m =>
      m.targetSimId === targetSimId ? { ...m, callerSimIds: callerIds } : m
    ))
  }

  const handleUpdateDuration = (targetSimId, duration) => {
    const validDuration = Math.min(60, Math.max(10, duration))
    setTargetCallerMappings(targetCallerMappings.map(m =>
      m.targetSimId === targetSimId ? { ...m, callDuration: validDuration } : m
    ))
  }

  const handleSave = async () => {
    // Validation
    if (targetCallerMappings.length === 0) {
      toast.error('Please add at least one target SIM')
      return
    }

    // Validate each mapping
    for (const mapping of targetCallerMappings) {
      if (!mapping.callerSimIds || mapping.callerSimIds.length === 0) {
        const target = potentialTargets.find(t => t._id === mapping.targetSimId)
        toast.error(`Target ${target?.mobileNumber || mapping.targetSimId} needs at least one caller SIM`)
        return
      }
    }

    // Check for overlap
    for (const mapping of targetCallerMappings) {
      if (mapping.callerSimIds.includes(mapping.targetSimId)) {
        toast.error('A SIM cannot be both caller and target')
        return
      }
    }

    setSaving(true)

    try {
      const data = {
        targetCallerMappings,
        callDuration: parseInt(callDuration),
        frequency,
        scheduledTime,
        scheduledDay,
        isActive
      }

      await api.post('/call-automation/config', data)
      toast.success('Configuration saved successfully')
      fetchData()
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error(err.response?.data?.message || 'Failed to save configuration')
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
    } catch (err) {
      console.error('Failed to toggle:', err)
      toast.error(err.response?.data?.message || 'Failed to toggle')
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

  // Show error state
  if (error && !config) {
    return (
      <PageContainer>
        <Card>
          <CardBody>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiAlertCircle style={{ width: '48px', height: '48px', color: '#ef4444', marginBottom: '16px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
                Unable to Load Configuration
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {error}
              </p>
              <Button variant="secondary" icon={FiRefreshCw} onClick={fetchData}>
                Try Again
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Call Automation"
        description="Configure automated SIM call verification with per-target caller assignment"
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
                    ? `${targetCallerMappings.length} target SIMs configured • ${frequency === 'hourly' ? 'Every hour' : frequency === 'daily' ? `Daily at ${scheduledTime}` : `Every ${scheduledDay} at ${scheduledTime}`}`
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
              <strong>How it works:</strong> Each target SIM can have its own set of caller SIMs.
              When a caller SIM makes a call, it will call only the targets it's assigned to.
              <br /><br />
              <strong>Example:</strong> Caller A can call Target 1 and Target 2, while Caller B can call only Target 3.
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Warning if no caller SIMs */}
      {callers.length === 0 && (
        <Card style={{
          marginBottom: '24px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a'
        }}>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiAlertCircle style={{ width: '20px', height: '20px', color: '#d97706' }} />
              <div style={{ fontSize: '13px', color: '#92400e' }}>
                <strong>No Caller SIMs available.</strong> Go to the SIMs page and mark some SIMs as "Admin Caller SIM" to enable them as callers.
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Target-Caller Mappings */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                Target SIMs & Their Callers
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                Configure which caller SIMs will call each target SIM
              </p>
            </div>
            {potentialTargets.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={FiPlus}
                onClick={() => setShowAddTarget(!showAddTarget)}
                disabled={!isActive || callers.length === 0}
              >
                Add Target
              </Button>
            )}
          </div>

          {/* Add Target Form */}
          {showAddTarget && (
            <Card style={{
              marginBottom: '20px',
              backgroundColor: '#f9fafb',
              border: '2px dashed #d1d5db',
            }}>
              <CardBody style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  Add New Target
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: '600',
                      fontSize: '12px',
                      color: '#374151'
                    }}>
                      Select Target SIM
                    </label>
                    <TargetSelector
                      targets={availableTargets}
                      selectedTargetId={newTargetId}
                      onChange={setNewTargetId}
                      disabled={!isActive}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: '600',
                      fontSize: '12px',
                      color: '#374151'
                    }}>
                      Select Callers for this Target
                    </label>
                    <CallerSelector
                      callers={callers}
                      selectedCallers={newCallerIds}
                      onChange={setNewCallerIds}
                      disabled={!isActive}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowAddTarget(false)
                      setNewTargetId('')
                      setNewCallerIds([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddTarget}
                    disabled={!newTargetId || newCallerIds.length === 0}
                  >
                    Add Target
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Existing Mappings */}
          {targetCallerMappings.length > 0 ? (
            targetCallerMappings.map((mapping) => (
              <TargetMappingCard
                key={mapping.targetSimId}
                mapping={mapping}
                callers={callers}
                allTargets={potentialTargets}
                onRemove={handleRemoveTarget}
                onUpdateCallers={handleUpdateCallers}
                onUpdateDuration={handleUpdateDuration}
                disabled={!isActive}
                globalDuration={callDuration}
              />
            ))
          ) : (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '2px dashed #e5e7eb',
            }}>
              <FiPhoneIncoming style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                No Target SIMs Configured
              </h4>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                {callers.length === 0
                  ? 'Mark some SIMs as "Admin Caller SIM" in the SIMs page first, then add targets here.'
                  : 'Click "Add Target" above to add target SIMs and assign caller SIMs to them'}
              </p>
              {potentialTargets.length > 0 && callers.length > 0 && (
                <Button
                  variant="secondary"
                  icon={FiPlus}
                  onClick={() => setShowAddTarget(true)}
                >
                  Add First Target
                </Button>
              )}
            </div>
          )}

          {potentialTargets.length === 0 && targetCallerMappings.length === 0 && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e',
            }}>
              <FiAlertCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              No active SIMs available. Please add SIMs in the SIMs page first.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Global Settings */}
      <Card>
        <CardBody>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
            Global Settings
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#374151'
              }}>
                Default Call Duration (seconds)
              </label>
              <input
                type="number"
                value={callDuration}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= 10 && val <= 60) {
                    setCallDuration(val)
                  }
                }}
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
                Default duration (10-60 seconds). Can be overridden per target.
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
                {frequency === 'hourly' ? 'Not applicable for hourly frequency' : 'Time for calls'}
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

          {/* Warning about SIM overlap */}
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <FiAlertCircle style={{ flexShrink: 0 }} />
            A SIM cannot be both a Caller and a Target at the same time.
          </div>

          {/* Save Button */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              variant="secondary"
              onClick={() => fetchData()}
            >
              Reset
            </Button>
            <Button
              icon={FiSave}
              onClick={handleSave}
              loading={saving}
              disabled={!isActive && targetCallerMappings.length === 0}
            >
              Save Configuration
            </Button>
          </div>

          {/* Mobile App Sync Note */}
          <div style={{
            marginTop: '24px',
            padding: '14px 16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <FiInfo style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', margin: '0 0 6px 0' }}>
                  Important: Sync Required on Mobile App
                </p>
                <p style={{ fontSize: '12px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>
                  After saving, open the mobile app → More → Settings → Call Automation → Tap "Refresh" for changes to take effect.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  )
}