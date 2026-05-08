


import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiPhone,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiDownload,
  FiSearch,
  FiFlag,
  FiX,
  FiClock,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiPause,
  FiPlay,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  StatCard,
  Grid,
  Button,
  Spinner,
} from '../components/ui'

const STYLES = `
  /* ── Table ── */
  .cl-table { width: 100%; border-collapse: collapse; min-width: 640px; }
  .cl-table th {
    padding: 10px 14px; text-align: left;
    background: #f9fafb; font-size: 11px; font-weight: 600;
    color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 2px solid #e5e7eb; white-space: nowrap;
  }
  .cl-table td { padding: 11px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  .cl-table tr:last-child td { border-bottom: none; }
  .cl-table tr:hover td { background: #fafafa; }

  /* columns hidden at breakpoints */
  .cl-col-sim     { }
  .cl-col-contact { }
  @media (max-width: 900px)  { .cl-col-sim     { display: none; } }
  @media (max-width: 640px)  { .cl-col-contact { display: none; } }

  /* ── Mobile card list (replaces table on tiny screens) ── */
  .cl-desktop { display: block; }
  .cl-mobile  { display: none;  }
  @media (max-width: 480px) {
    .cl-desktop { display: none;  }
    .cl-mobile  { display: block; }
  }

  /* ── Filters ── */
  .cl-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .cl-search-wrap { position: relative; grid-column: span 2; }
  @media (max-width: 600px) { .cl-search-wrap { grid-column: span 1; } }

  /* ── Pagination ── */
  .cl-pag {
    display: flex; align-items: center;
    justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
  }
  .cl-pag-pages { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  @media (max-width: 540px) {
    .cl-pag { flex-direction: column; align-items: stretch; }
    .cl-pag-pages { justify-content: center; }
    .cl-pag-info  { text-align: center; }
  }
  /* hide page number buttons on very small screens, keep prev/next only */
  .cl-pag-num { }
  @media (max-width: 360px) { .cl-pag-num { display: none; } }
`

export default function CallLogs() {
  const { api } = useAuth()
  const [callLogs, setCallLogs] = useState([])
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [callType, setCallType] = useState('')
  const [simId, setSimId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [stats, setStats] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true) // Auto-refresh toggle

  useEffect(() => { fetchCallLogs(); fetchStats(); fetchSims() }, [pagination.page])

  useEffect(() => {
    if (pagination.page === 1) fetchCallLogs()
    else setPagination(p => ({ ...p, page: 1 }))
  }, [callType, simId, phoneNumber, dateRange.start, dateRange.end])

  // Auto-refresh polling (every 20 seconds)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Silent refresh - don't show loading spinner
      fetchCallLogs(true)
      fetchStats()
    }, 20000) // 20 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, pagination.page, callType, simId, phoneNumber, dateRange.start, dateRange.end])

  const fetchSims = async () => {
    try {
      const r = await api.get('/sims?limit=100')
      setSims(r.data.data || [])
    } catch { }
  }

  const fetchCallLogs = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const params = new URLSearchParams({
        page: pagination.page, limit: pagination.limit,
        ...(callType && { callType }),
        ...(simId && { simId }),
        ...(phoneNumber && { phoneNumber }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      })
      const r = await api.get(`/call-logs?${params}`)
      setCallLogs(r.data.data || [])
      setPagination(p => ({ ...p, total: r.data.pagination?.total || 0 }))
    } catch {
      // Only show toast error for manual refresh, not polling
      if (!silent) {
        toast.error('Failed to fetch call logs')
      }
      setCallLogs([])
    }
    finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const fetchStats = async () => {
    try { const r = await api.get('/call-logs/stats'); setStats(r.data.data) } catch { }
  }

  const handleSearch = (e) => { e.preventDefault(); fetchCallLogs() }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(callType && { callType }),
        ...(simId && { simId }),
        ...(phoneNumber && { phoneNumber }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      })
      const r = await api.get(`/call-logs/export?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'call-logs-export.xlsx')
      document.body.appendChild(link); link.click(); link.remove()
      toast.success('Export completed')
    } catch { toast.error('This feature is available in higher plans. Upgrade your plan to access it.') }
  }

  const handleFlag = async (id, flagged, reason = '') => {
    try {
      await api.patch(`/call-logs/${id}/flag`, { flagged, reason })
      setCallLogs(prev => prev.map(l => l._id === id ? { ...l, isFlagged: flagged, flaggedReason: reason } : l))
      toast.success(flagged ? 'Call log flagged' : 'Flag removed')
    } catch { toast.error('Failed to update flag') }
  }

  const getIcon = (type) => ({ incoming: FiPhoneIncoming, outgoing: FiPhoneOutgoing, missed: FiPhoneMissed }[type] || FiPhone)
  const getColor = (type) => ({ incoming: { bg: '#dcfce7', text: '#16a34a' }, outgoing: { bg: '#eff6ff', text: '#2563eb' }, missed: { bg: '#fef2f2', text: '#dc2626' } }[type] || { bg: '#f3f4f6', text: '#374151' })

  const formatDuration = (s) => {
    if (!s) return '0s'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const formatDT = (ts) => {
    if (!ts) return { date: '-', time: '-' }
    const d = new Date(ts)
    return {
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    }
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  // ── shared mini styles ──
  const inputBase = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none',
    boxSizing: 'border-box', backgroundColor: '#fff', color: '#111827',
  }
  const flagBtn = (danger) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
    border: danger ? '1px solid #fecaca' : '1px solid #e5e7eb',
    backgroundColor: danger ? '#fef2f2' : '#f9fafb',
    color: danger ? '#dc2626' : '#374151',
  })
  const pagBtn = (disabled) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '7px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
    backgroundColor: '#fff', color: '#374151',
    fontSize: '13px', fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  })

  if (loading && callLogs.length === 0) {
    return <PageContainer><Spinner size="lg" /></PageContainer>
  }
  const today = new Date().toISOString().split('T')[0];


  return (
    <PageContainer>
      <style>{STYLES}</style>

      <PageHeader
        title="Call Logs"
        description="View and analyze call history from mobile devices"
        action={<Button variant="secondary" icon={FiDownload} onClick={handleExport}>Export</Button>}
      />

      {/* ── Stats ── */}
      {stats && (
        <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
          <StatCard title="Total Calls" value={stats.totalCalls?.toLocaleString() || 0} icon={FiPhone} iconColor="#2563eb" iconBg="#eff6ff" />
          <StatCard title="Incoming" value={stats.byType?.find(t => t._id === 'incoming')?.count || 0} icon={FiPhoneIncoming} iconColor="#16a34a" iconBg="#dcfce7" />
          <StatCard title="Outgoing" value={stats.byType?.find(t => t._id === 'outgoing')?.count || 0} icon={FiPhoneOutgoing} iconColor="#2563eb" iconBg="#eff6ff" />
          <StatCard title="Missed" value={stats.byType?.find(t => t._id === 'missed')?.count || 0} icon={FiPhoneMissed} iconColor="#dc2626" iconBg="#fef2f2" />
        </Grid>
      )}

      {/* ── Filters ── */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <form onSubmit={handleSearch}>
            <div className="cl-filters">
              {/* Phone search spans 2 cols on wider, 1 on narrow */}
              <div className="cl-search-wrap">
                <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: '14px', height: '14px' }} />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[\t\n\r]+/g, '').trim())}
                  placeholder="Search phone number..."
                  style={{ ...inputBase, paddingLeft: '32px' }}
                />
              </div>

              <select value={callType} onChange={(e) => setCallType(e.target.value)} style={inputBase}>
                <option value="">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
                <option value="missed">Missed</option>
              </select>

              <select value={simId} onChange={(e) => setSimId(e.target.value)} style={inputBase}>
                <option value="">All SIMs</option>
                {sims.map(s => <option key={s._id} value={s._id}>{s.mobileNumber} ({s.operator})</option>)}
              </select>

              <input
                type="date"
                value={dateRange.start}
                max={today} // ✅ restrict future dates
                onKeyDown={(e) => e.preventDefault()}
                onChange={(e) =>
                  setDateRange(p => ({ ...p, start: e.target.value }))
                }
                style={{ ...inputBase, cursor: 'pointer' }}
              />
              <input
                type="date" value={dateRange.end}
                onKeyDown={(e) => e.preventDefault()}
                onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                style={{ ...inputBase, cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
              <Button type="submit" style={{ fontSize: '13px', padding: '8px 20px' }}>Search</Button>
              {/* Auto-refresh toggle */}
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  border: `1px solid ${autoRefresh ? '#16a34a' : '#d1d5db'}`,
                  borderRadius: '8px',
                  background: autoRefresh ? '#dcfce7' : '#fff',
                  color: autoRefresh ? '#16a34a' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                {autoRefresh ? (
                  <>
                    <FiPlay style={{ width: '14px', height: '14px' }} />
                    Auto-refresh ON
                  </>
                ) : (
                  <>
                    <FiPause style={{ width: '14px', height: '14px' }} />
                    Auto-refresh OFF
                  </>
                )}
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── Table / Cards ── */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner /></div>
          ) : callLogs.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
              <FiPhone style={{ width: '36px', height: '36px', color: '#d1d5db', marginBottom: '12px' }} />
              <p style={{ marginBottom: '16px', fontSize: '14px' }}>No Call Logs Found</p>

            </div>
          ) : (
            <>
              {/* ── Desktop / Tablet table ── */}
              <div className="cl-desktop" style={{ overflowX: 'auto' }}>
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Type</th>
                      <th style={{ minWidth: '130px' }}>Phone</th>
                      <th className="cl-col-contact" style={{ minWidth: '110px' }}>Contact</th>
                      <th className="cl-col-sim" style={{ minWidth: '130px' }}>SIM</th>
                      <th style={{ width: '80px' }}>Duration</th>
                      <th style={{ minWidth: '150px' }}>Date & Time</th>
                      <th style={{ width: '90px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.map((log) => {
                      const Icon = getIcon(log.callType)
                      const color = getColor(log.callType)
                      const dt = formatDT(log.timestamp)
                      return (
                        <tr key={log._id}>
                          {/* Type */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon style={{ width: '14px', height: '14px', color: color.text, flexShrink: 0 }} />
                              <span style={{ padding: '2px 7px', borderRadius: '99px', fontSize: '11px', fontWeight: '500', backgroundColor: color.bg, color: color.text, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                {log.callType}
                              </span>
                              {log.isFlagged && <FiFlag style={{ width: '12px', height: '12px', color: '#dc2626', flexShrink: 0 }} />}
                            </div>
                          </td>

                          {/* Phone */}
                          <td>
                            <div style={{ fontWeight: '500', fontSize: '13px', color: '#111827' }}>{log.phoneNumber || '-'}</div>
                          </td>

                          {/* Contact */}
                          <td className="cl-col-contact">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiUser style={{ width: '13px', height: '13px', color: '#9ca3af', flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', color: '#374151' }}>{log.contactName || '-'}</span>
                            </div>
                          </td>

                          {/* SIM */}
                          <td className="cl-col-sim">
                            <div style={{ fontSize: '13px', color: '#111827' }}>{log.simId?.mobileNumber || 'N/A'}</div>
                            {log.simId?.operator && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{log.simId.operator}</div>}
                          </td>

                          {/* Duration */}
                          <td style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
                            {formatDuration(log.duration)}
                          </td>

                          {/* Date & Time */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <FiClock style={{ width: '13px', height: '13px', color: '#9ca3af', marginTop: '2px', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: '13px', color: '#111827', whiteSpace: 'nowrap' }}>{dt.date}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap' }}>{dt.time}</div>
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td>
                            {log.isFlagged ? (
                              <button onClick={() => handleFlag(log._id, false)} style={flagBtn(true)}>
                                <FiX style={{ width: '12px', height: '12px' }} /> Unflag
                              </button>
                            ) : (
                              <button onClick={() => handleFlag(log._id, true, 'Flagged for review')} style={flagBtn(false)}>
                                <FiFlag style={{ width: '12px', height: '12px' }} /> Flag
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile card list (≤480px) ── */}
              <div className="cl-mobile">
                {callLogs.map((log) => {
                  const Icon = getIcon(log.callType)
                  const color = getColor(log.callType)
                  const dt = formatDT(log.timestamp)
                  return (
                    <div key={log._id} style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}>

                      {/* ── Row 1: Type badge + Flag indicator + Date/Time ── */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>

                        {/* Left: icon + type badge + flagged dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            backgroundColor: color.bg, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon style={{ width: '14px', height: '14px', color: color.text }} />
                          </div>
                          <span style={{
                            padding: '3px 9px', borderRadius: '99px',
                            fontSize: '11px', fontWeight: '600',
                            backgroundColor: color.bg, color: color.text,
                            textTransform: 'capitalize', whiteSpace: 'nowrap',
                          }}>
                            {log.callType}
                          </span>
                          {log.isFlagged && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '3px 7px', borderRadius: '99px',
                              backgroundColor: '#fef2f2', fontSize: '11px',
                              fontWeight: '500', color: '#dc2626', whiteSpace: 'nowrap',
                            }}>
                              <FiFlag style={{ width: '10px', height: '10px' }} /> Flagged
                            </span>
                          )}
                        </div>

                        {/* Right: Date stacked above Time */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827', whiteSpace: 'nowrap' }}>
                            {dt.date}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {dt.time}
                          </div>
                        </div>
                      </div>

                      {/* ── Row 2: Phone + Duration side by side ── */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '12px',
                        alignItems: 'start',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        padding: '10px 12px',
                      }}>
                        <div>
                          <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</p>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0, wordBreak: 'break-all' }}>
                            {log.phoneNumber || '-'}
                          </p>
                          {log.contactName && (
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <FiUser style={{ width: '10px', height: '10px', flexShrink: 0 }} />
                              {log.contactName}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duration</p>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0, whiteSpace: 'nowrap' }}>
                            {formatDuration(log.duration)}
                          </p>
                        </div>
                      </div>

                      {/* ── Row 3: SIM info + Action button ── */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SIM</p>
                          <p style={{ fontSize: '12px', color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.simId?.mobileNumber || 'N/A'}
                            {log.simId?.operator && (
                              <span style={{ color: '#9ca3af', marginLeft: '4px' }}>· {log.simId.operator}</span>
                            )}
                          </p>
                        </div>

                        {/* Flag / Unflag button */}
                        {log.isFlagged ? (
                          <button
                            onClick={() => handleFlag(log._id, false)}
                            style={{
                              flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '6px 12px', borderRadius: '7px', cursor: 'pointer',
                              fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2', color: '#dc2626',
                            }}
                          >
                            <FiX style={{ width: '12px', height: '12px' }} /> Unflag
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFlag(log._id, true, 'Flagged for review')}
                            style={{
                              flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '6px 12px', borderRadius: '7px', cursor: 'pointer',
                              fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#f9fafb', color: '#374151',
                            }}
                          >
                            <FiFlag style={{ width: '12px', height: '12px' }} /> Flag
                          </button>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* ── Pagination ── */}
      {pagination.total > 0 && (
        <Card style={{ marginTop: '16px' }}>
          <CardBody style={{ padding: '12px 14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              width: '100%',
              boxSizing: 'border-box',
            }}>

              {/* Info text */}
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                whiteSpace: 'nowrap',
                flexShrink: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                Showing{' '}
                <strong style={{ color: '#374151' }}>{(pagination.page - 1) * pagination.limit + 1}</strong>
                {' – '}
                <strong style={{ color: '#374151' }}>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong>
                {' of '}
                <strong style={{ color: '#374151' }}>{pagination.total}</strong>
              </div>

              {/* Prev + page indicator + Next */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}>

                {/* Prev */}
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                    opacity: pagination.page === 1 ? 0.45 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <FiChevronLeft style={{ width: '13px', height: '13px' }} />
                  Prev
                </button>

                {/* Page indicator pill */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#2563eb',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {pagination.page} / {totalPages}
                </div>

                {/* Next */}
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= totalPages}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: pagination.page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: pagination.page >= totalPages ? 0.45 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Next
                  <FiChevronRight style={{ width: '13px', height: '13px' }} />
                </button>

              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  )
}