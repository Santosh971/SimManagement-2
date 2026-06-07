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

  if (callers.length === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fde68a',
        borderRadius: '6px',
        textAlign: 'center',
      }}>
        <FiAlertCircle style={{ color: '#d97706', marginBottom: '4px' }} />
        <p style={{ fontSize: '12px', color: '#92400e', margin: '4px 0 0 0' }}>
          No caller SIMs. Mark SIMs as "Admin Caller" in SIMs page.
        </p>
      </div>
    )
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

      {/* Selected count */}
      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
        {selectedCallers.length} of {callers.length} caller{callers.length !== 1 ? 's' : ''} selected
      </div>

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
                    {sim.operator} • {sim.assignedTo?.name || 'Unassigned'}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
            {search ? 'No callers match your search' : 'No callers available'}
          </div>
        )}
      </div>
    </div>
  )
}

// Target selector with multi-select support
function TargetSelector({ targets, selectedTargetIds, onChange, disabled }) {
  const [search, setSearch] = useState('')

  const filteredTargets = targets.filter(sim => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      sim.mobileNumber?.toLowerCase().includes(searchLower) ||
      sim.operator?.toLowerCase().includes(searchLower) ||
      sim.assignedTo?.name?.toLowerCase().includes(searchLower)
    )
  })

  const toggleTarget = (simId) => {
    if (disabled) return
    if (selectedTargetIds.includes(simId)) {
      onChange(selectedTargetIds.filter(id => id !== simId))
    } else {
      onChange([...selectedTargetIds, simId])
    }
  }

  const selectAll = () => {
    if (disabled) return
    onChange(filteredTargets.map(t => t._id))
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  if (targets.length === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        textAlign: 'center',
      }}>
        <FiSmartphone style={{ color: '#9ca3af', marginBottom: '4px' }} />
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
          No target SIMs available.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search target SIMs..."
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

      {/* Selection info and quick actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          {selectedTargetIds.length} of {targets.length} target{targets.length !== 1 ? 's' : ''} selected
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={selectAll}
            disabled={disabled}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: disabled ? '#f3f4f6' : '#fff',
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            disabled={disabled}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: disabled ? '#f3f4f6' : '#fff',
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Target list with checkboxes */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        maxHeight: '200px',
        overflow: 'auto',
        backgroundColor: '#fff',
      }}>
        {filteredTargets.length > 0 ? (
          filteredTargets.map((sim) => {
            const isSelected = selectedTargetIds.includes(sim._id)
            return (
              <div
                key={sim._id}
                onClick={() => toggleTarget(sim._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: disabled ? 'default' : 'pointer',
                  backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  border: `2px solid ${isSelected ? '#16a34a' : '#d1d5db'}`,
                  backgroundColor: isSelected ? '#16a34a' : '#fff',
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
                    {sim.operator} • {sim.assignedTo?.name || 'Unassigned'}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
            {search ? 'No targets match your search' : 'No targets available'}
          </div>
        )}
      </div>
    </div>
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
  const [hourlyShiftStartTime, setHourlyShiftStartTime] = useState('08:00')
  const [hourlyShiftEndTime, setHourlyShiftEndTime] = useState('20:00')
  const [isActive, setIsActive] = useState(true)

  // Add target modal state
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [newTargetIds, setNewTargetIds] = useState([])
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
          return { data: { data: [] } }
        }),
        api.get('/call-automation/config').catch(err => {
          console.error('Failed to fetch config:', err)
          return { data: { data: null } }
        })
      ])

      const simsData = simsRes.data.data || {}

      console.log('[CALL AUTOMATION] Sims data received:', simsData)

      // Handle both old and new API response formats
      if (simsData.callers && Array.isArray(simsData.callers)) {
        // New format: { callers: [...], potentialTargets: [...], all: [...] }
        const callerSimsFromApi = simsData.callers || []
        const allSims = simsData.all || simsData.potentialTargets || []

        // Backend returns:
        // - callers: SIMs with isAdminCaller = true (can make calls)
        // - potentialTargets: ALL SIMs (can receive calls)
        // - all: ALL SIMs

        // For the UI, we need:
        // - Callers dropdown: SIMs marked as isAdminCaller = true
        // - Targets dropdown: ALL SIMs (but a SIM can't be both caller AND target)

        // Get all caller IDs for filtering
        const callerIds = callerSimsFromApi.map(s => s._id)

        // Callers = SIMs with isAdminCaller = true
        // Targets = ALL SIMs that are NOT callers (to enforce mutual exclusivity)
        const targetSims = allSims.filter(s => !callerIds.includes(s._id))

        console.log('[CALL AUTOMATION] Total SIMs:', allSims.length)
        console.log('[CALL AUTOMATION] Callers (isAdminCaller=true):', callerSimsFromApi.length)
        console.log('[CALL AUTOMATION] Targets (non-callers):', targetSims.length)

        setCallers(callerSimsFromApi)
        setPotentialTargets(targetSims)
      } else if (Array.isArray(simsRes.data.data)) {
        // Old format: returns flat array of sims
        const allSims = simsRes.data.data
        console.log('[CALL AUTOMATION] Using old format - total sims:', allSims.length)

        // Log sample SIM to debug the isAdminCaller field
        if (allSims.length > 0) {
          console.log('[CALL AUTOMATION] Sample SIM data:', {
            mobileNumber: allSims[0].mobileNumber,
            isAdminCaller: allSims[0].isAdminCaller,
            hasIsAdminCaller: 'isAdminCaller' in allSims[0]
          })
        }

        // Based on original logic:
        // - Callers: SIMs with isAdminCaller = true
        // - Targets: ALL SIMs that are NOT callers (enforce mutual exclusivity)
        const callerSims = allSims.filter(s => s.isAdminCaller === true)
        const callerIds = callerSims.map(s => s._id)
        const targetSims = allSims.filter(s => !callerIds.includes(s._id))

        console.log('[CALL AUTOMATION] Callers (isAdminCaller===true):', callerSims.length)
        console.log('[CALL AUTOMATION] Targets (non-callers):', targetSims.length)

        setCallers(callerSims)
        setPotentialTargets(targetSims)
      } else {
        // Fallback: empty arrays
        console.log('[CALL AUTOMATION] Unknown format, using empty arrays')
        setCallers([])
        setPotentialTargets([])
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
        setHourlyShiftStartTime(existingConfig.hourlyShiftStartTime || '08:00')
        setHourlyShiftEndTime(existingConfig.hourlyShiftEndTime || '20:00')
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

  const handleAddTargets = (keepOpen = false) => {
    if (newTargetIds.length === 0) {
      toast.error('Please select at least one target SIM')
      return
    }
    if (newCallerIds.length === 0) {
      toast.error('Please select at least one caller SIM')
      return
    }

    // Check for overlap - targets cannot be in callers
    const overlapping = newTargetIds.filter(id => newCallerIds.includes(id))
    if (overlapping.length > 0) {
      toast.error('Target SIMs cannot also be callers')
      return
    }

    // Check if any targets already exist
    const existingTargets = newTargetIds.filter(id => usedTargetIds.includes(id))
    if (existingTargets.length > 0) {
      toast.error('Some target SIMs are already added')
      return
    }

    // Add all selected targets with the same callers
    const newMappings = newTargetIds.map(targetId => ({
      targetSimId: targetId,
      callerSimIds: [...newCallerIds],
      callDuration: callDuration
    }))

    setTargetCallerMappings([
      ...targetCallerMappings,
      ...newMappings
    ])

    if (keepOpen) {
      // Reset targets but keep callers selected for convenience
      setNewTargetIds([])
      toast.success(`${newTargetIds.length} target${newTargetIds.length > 1 ? 's' : ''} added successfully`)
    } else {
      // Close form and reset everything
      setShowAddTarget(false)
      setNewTargetIds([])
      setNewCallerIds([])
      toast.success(`${newTargetIds.length} target${newTargetIds.length > 1 ? 's' : ''} added successfully`)
    }
  }

  const handleAddTargetAndClose = () => {
    handleAddTargets(false)
  }

  const handleAddTargetAndContinue = () => {
    handleAddTargets(true)
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

    // Validate hourly shift times
    if (frequency === 'hourly') {
      if (hourlyShiftStartTime === hourlyShiftEndTime) {
        toast.error('Shift start time and end time cannot be the same')
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
        hourlyShiftStartTime: frequency === 'hourly' ? hourlyShiftStartTime : undefined,
        hourlyShiftEndTime: frequency === 'hourly' ? hourlyShiftEndTime : undefined,
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
                    ? `${targetCallerMappings.length} target SIMs configured • ${frequency === 'hourly' ? `Hourly (${hourlyShiftStartTime}–${hourlyShiftEndTime})` : frequency === 'daily' ? `Daily at ${scheduledTime}` : `Every ${scheduledDay} at ${scheduledTime}`}`
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
              <strong>How it works:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li><strong>Caller SIMs</strong> = SIMs marked as "Admin Caller" in SIMs page → Can only MAKE calls</li>
                <li><strong>Target SIMs</strong> = All other SIMs → Can only RECEIVE calls</li>
                <li>Each Target can have multiple Callers assigned to it</li>
                <li>A SIM cannot be both Caller and Target at the same time</li>
              </ul>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <FiAlertCircle style={{ width: '20px', height: '20px', color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                  No Caller SIMs Available
                </div>
                <div style={{ fontSize: '13px', color: '#78350f', marginBottom: '12px' }}>
                  Caller SIMs are marked as "Admin Caller" in the SIMs page. These SIMs will make outgoing calls.
                </div>
                <div style={{ fontSize: '12px', color: '#92400e', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  <strong>How to fix:</strong> Go to <strong>SIMs</strong> page → Select a SIM → Edit → Enable <strong>"Is Admin Caller"</strong> → Save
                </div>
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
                {targetCallerMappings.length > 0 && (
                  <Badge variant="primary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                    {targetCallerMappings.length} target{targetCallerMappings.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                {targetCallerMappings.length === 0
                  ? 'Add target SIMs and assign caller SIMs to each'
                  : 'Click on a target to expand and manage its callers'}
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
                  Add Target SIMs
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
                      Select Target SIMs (can select multiple)
                    </label>
                    <TargetSelector
                      targets={availableTargets}
                      selectedTargetIds={newTargetIds}
                      onChange={setNewTargetIds}
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
                      Select Callers for All Selected Targets
                    </label>
                    {callers.length === 0 ? (
                      <div style={{
                        padding: '20px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}>
                        <FiAlertCircle style={{ color: '#d97706', marginBottom: '8px' }} />
                        <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                          No caller SIMs available.
                        </p>
                        <p style={{ fontSize: '11px', color: '#78350f', margin: '4px 0 0 0' }}>
                          Go to SIMs page and mark some SIMs as "Admin Caller SIM".
                        </p>
                      </div>
                    ) : (
                      <>
                        <CallerSelector
                          callers={callers}
                          selectedCallers={newCallerIds}
                          onChange={setNewCallerIds}
                          disabled={!isActive}
                        />
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                          {callers.length} caller SIM{callers.length !== 1 ? 's' : ''} available • {newCallerIds.length} selected
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Selection summary */}
                {newTargetIds.length > 0 && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '8px 12px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#166534'
                  }}>
                    <FiCheck style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {newTargetIds.length} target{newTargetIds.length > 1 ? 's' : ''} selected • Will be called by {newCallerIds.length || 0} caller{newCallerIds.length !== 1 ? 's' : ''}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowAddTarget(false)
                      setNewTargetIds([])
                      setNewCallerIds([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddTargetAndClose}
                    disabled={newTargetIds.length === 0 || newCallerIds.length === 0 || callers.length === 0}
                  >
                    Add Targets ({newTargetIds.length})
                  </Button>
                  {availableTargets.length > newTargetIds.length && newTargetIds.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddTargetAndContinue}
                      disabled={newTargetIds.length === 0 || newCallerIds.length === 0 || callers.length === 0}
                    >
                      Add & Continue
                    </Button>
                  )}
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
                  ? 'First, mark some SIMs as "Admin Caller" in the SIMs page. These will be your Caller SIMs.'
                  : potentialTargets.length === 0
                    ? 'All SIMs are marked as Callers. You need non-Admin SIMs to be targets.'
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

          {potentialTargets.length === 0 && callers.length > 0 && targetCallerMappings.length === 0 && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e',
            }}>
              <FiAlertCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              All your SIMs are marked as "Admin Caller". Target SIMs should be regular SIMs (not marked as Admin Caller).
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
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: frequency === 'hourly' ? '1fr 1fr 1fr' : frequency === 'weekly' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '24px' }}>
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

            {/* Hourly Shift Window — only visible when frequency is 'hourly' */}
            {frequency === 'hourly' && (
              <>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    value={hourlyShiftStartTime}
                    onChange={(e) => setHourlyShiftStartTime(e.target.value)}
                    disabled={!isActive}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: hourlyShiftStartTime === hourlyShiftEndTime ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: isActive ? '#fff' : '#f3f4f6',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Calls will start from this time each day
                  </div>
                  {hourlyShiftStartTime === hourlyShiftEndTime && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      Start and end times cannot be the same
                    </div>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    value={hourlyShiftEndTime}
                    onChange={(e) => setHourlyShiftEndTime(e.target.value)}
                    disabled={!isActive}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: hourlyShiftStartTime === hourlyShiftEndTime ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: isActive ? '#fff' : '#f3f4f6',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Calls will stop after this time. Supports overnight shifts (e.g., 22:00–06:00).
                  </div>
                </div>
              </>
            )}

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
                {frequency === 'hourly' && `Every hour during shift (${hourlyShiftStartTime} – ${hourlyShiftEndTime})`}
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