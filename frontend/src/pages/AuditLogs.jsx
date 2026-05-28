

import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiActivity,
  FiFilter,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiUser,
  FiClock,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import { Pagination, Button } from '../components/ui'
import { formatDateTime, formatDateTimeShort } from '../utils/dateFormat'

const AuditLogs = () => {
  const { api, user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  // Filters
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [activeStartDate, setActiveStartDate] = useState(null)
  const [activeEndDate, setActiveEndDate] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Available options
  // Available options — synced with backend auditLog.service.js getModuleActions()
  const modules = [
    'AUTH', 'SIM', 'RECHARGE', 'USER', 'REPORT', 'COMPANY',
    'SUBSCRIPTION', 'PAYMENT', 'CALL_LOG', 'NOTIFICATION',
    'DASHBOARD', 'SETTINGS', 'WHATSAPP', 'TELEGRAM',
    'WIFI', 'CALL_AUTOMATION', 'SMS',
  ]
  const actions = {
    AUTH: ['USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'REGISTRATION', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'OTP_SEND', 'OTP_VERIFY', 'OTP_RESEND', 'FORGOT_PASSWORD_OTP_REQUEST', 'FORGOT_PASSWORD_OTP_VERIFIED', 'PASSWORD_RESET_VIA_OTP', 'EMAIL_CHANGE_REQUESTED', 'EMAIL_CHANGE_OLD_VERIFIED', 'EMAIL_CHANGE_COMPLETED'],
    SIM: ['SIM_CREATE', 'SIM_UPDATE', 'SIM_DELETE', 'SIM_ASSIGN', 'SIM_UNASSIGN', 'SIM_STATUS_CHANGE', 'SIM_BULK_CREATE', 'SIM_BULK_IMPORT', 'SIM_EXPORT', 'SIM_MESSAGING_UPDATE'],
    RECHARGE: ['RECHARGE_ADD', 'RECHARGE_UPDATE', 'RECHARGE_DELETE', 'RECHARGE_EXPIRE', 'RECHARGE_REMINDER_SENT'],
    USER: ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_PASSWORD_RESET', 'USER_STATUS_CHANGE'],
    REPORT: ['REPORT_EXPORT', 'REPORT_IMPORT', 'REPORT_DOWNLOAD', 'REPORT_GENERATE'],
    COMPANY: ['COMPANY_CREATE', 'COMPANY_UPDATE', 'COMPANY_DELETE', 'COMPANY_ADMIN_CREATE', 'COMPANY_ADMIN_UPDATE', 'COMPANY_ADMIN_DELETE', 'COMPANY_SUBSCRIPTION_RENEW', 'COMPANY_PROFILE_UPDATE', 'COMPANY_EMAIL_CHANGE_REQUEST', 'COMPANY_EMAIL_CHANGE_COMPLETE', 'COMPANY_EMAIL_CHANGE_CANCEL', 'COMPANY_TRIAL_EXTEND'],
    SUBSCRIPTION: ['SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_DELETE', 'SUBSCRIPTION_TOGGLE'],
    PAYMENT: ['PAYMENT_INITIATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REFUND'],
    CALL_LOG: ['CALL_LOG_SYNC', 'CALL_LOG_EXPORT', 'CALL_LOG_FLAG'],
    NOTIFICATION: ['NOTIFICATION_CREATE', 'NOTIFICATION_READ', 'NOTIFICATION_DELETE', 'NOTIFICATION_BULK_READ'],
    DASHBOARD: ['DASHBOARD_VIEW'],
    SETTINGS: ['SETTINGS_UPDATE', 'PREFERENCES_UPDATE', 'CONTENT_UPDATE', 'CONTENT_CREATE'],
    WHATSAPP: ['WHATSAPP_MESSAGE_SEND', 'WHATSAPP_MESSAGE_SEND_BULK', 'WHATSAPP_WEBHOOK_REPLY', 'WHATSAPP_SIM_ACTIVE', 'WHATSAPP_SIM_INACTIVE'],
    TELEGRAM: ['TELEGRAM_MESSAGE_SEND', 'TELEGRAM_MESSAGE_SEND_BULK', 'TELEGRAM_LINK_SEND', 'TELEGRAM_LINK_SEND_BULK', 'TELEGRAM_LINK_GENERATED', 'TELEGRAM_SIM_LINK_INITIATED', 'TELEGRAM_SIM_UNLINK', 'TELEGRAM_PHONE_VERIFICATION_FAILED', 'TELEGRAM_PHONE_VERIFIED', 'TELEGRAM_SIM_ACTIVE', 'TELEGRAM_SIM_INACTIVE'],
    WIFI: ['WIFI_NETWORK_CREATE', 'WIFI_NETWORK_UPDATE', 'WIFI_NETWORK_DELETE', 'WIFI_DEVICE_ASSIGN', 'WIFI_DEVICE_UNASSIGN', 'WIFI_DEVICE_UPDATE', 'WIFI_DEVICE_DELETE', 'WIFI_ALERT_RESOLVE'],
    CALL_AUTOMATION: ['CALL_AUTOMATION_CONFIG_SAVE', 'CALL_AUTOMATION_TOGGLE'],
    SMS: ['SMS_SYNC', 'SMS_EXPORT'],
 
  }

  const availableActions = module ? actions[module] || [] : []

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('page', pagination.page)
      params.append('limit', pagination.limit)
      if (module) params.append('module', module)
      if (action) params.append('action', action)
      if (search) params.append('search', search)
      if (activeStartDate) params.append('startDate', activeStartDate.toISOString())
      if (activeEndDate) params.append('endDate', activeEndDate.toISOString())

      const response = await api.get(`/audit-logs?${params.toString()}`)
      const data = response.data

      setLogs(data.data || [])
      const paginationData = data.pagination || {}
      setPagination((prev) => ({ ...prev, total: paginationData.total || 0 }))
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError('Failed to load audit logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, module, action, activeStartDate, activeEndDate])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchLogs()
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleModuleChange = (e) => {
    setModule(e.target.value)
    setAction('')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleActionChange = (e) => {
    setAction(e.target.value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearchChange = (e) => setSearch(e.target.value)

  const handleStartDateChange = (date) => {
    setStartDate(date)
  }

  const handleEndDateChange = (date) => {
    setEndDate(date)
  }

  const applyDateFilters = () => {
    setActiveStartDate(startDate)
    setActiveEndDate(endDate)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setModule('')
    setAction('')
    setSearch('')
    setStartDate(null)
    setEndDate(null)
    setActiveStartDate(null)
    setActiveEndDate(null)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (module) params.append('module', module)
      if (action) params.append('action', action)
      if (activeStartDate) params.append('startDate', activeStartDate.toISOString())
      if (activeEndDate) params.append('endDate', activeEndDate.toISOString())

      const response = await api.get(`/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export audit logs:', err)
      setError('Failed to export logs. Please try again.')
    }
  }

  const formatDate = formatDateTime

  // Shorter format for mobile
  const formatDateMobile = formatDateTimeShort

  const getActionColor = (action) => {
    if (action?.includes('CREATE') || action?.includes('ADD')) return 'bg-green-100 text-green-700'
    if (action?.includes('UPDATE')) return 'bg-blue-100 text-blue-700'
    if (action?.includes('DELETE')) return 'bg-red-100 text-red-700'
    if (action?.includes('LOGIN') || action?.includes('LOGOUT')) return 'bg-purple-100 text-purple-700'
    if (action?.includes('EXPORT') || action?.includes('GENERATE')) return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getModuleColor = (module) => {
    const colors = {
      AUTH: 'bg-purple-100 text-purple-700',
      SIM: 'bg-blue-100 text-blue-700',
      RECHARGE: 'bg-green-100 text-green-700',
      USER: 'bg-indigo-100 text-indigo-700',
      REPORT: 'bg-orange-100 text-orange-700',
      COMPANY: 'bg-pink-100 text-pink-700',
      SUBSCRIPTION: 'bg-cyan-100 text-cyan-700',
      PAYMENT: 'bg-yellow-100 text-yellow-700',
      CALL_LOG: 'bg-teal-100 text-teal-700',
      NOTIFICATION: 'bg-amber-100 text-amber-700',
      DASHBOARD: 'bg-slate-100 text-slate-700',
      SETTINGS: 'bg-gray-100 text-gray-700',
      WHATSAPP: 'bg-emerald-100 text-emerald-700',
      TELEGRAM: 'bg-sky-100 text-sky-700',
    }
    return colors[module] || 'bg-gray-100 text-gray-700'
  }

  const hasActiveFilters = module || action || search || startDate || endDate

  // Count active filters for badge
  const activeFilterCount = [module, action, search, startDate, endDate].filter(Boolean).length

  return (
    <div className="min-h-screen bg-secondary-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 flex items-center gap-2">
               
                Audit Logs
              </h1>
              <p className="text-secondary-500 mt-0.5 text-sm sm:text-base">
                Track all user actions and system events
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="secondary"
                icon={FiRefreshCw}
                onClick={() => fetchLogs()}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'company_admin') && (
                <Button
                  icon={FiDownload}
                  onClick={handleExport}
                >
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Filters Panel ── */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-3 sm:p-4 mb-4 sm:mb-6">

          {/* Filter header row — always visible */}
          <div className="flex items-center justify-between gap-2">
            {/* Toggle button (mobile) / Label (desktop) */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-secondary-700 hover:text-primary-600 transition-colors"
            >
              <FiFilter className="shrink-0" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
                  {activeFilterCount}
                </span>
              )}

            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs sm:text-sm text-secondary-500 hover:text-red-500 transition-colors"
              >
                <FiX className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Clear all</span>
                <span className="sm:hidden">Clear</span>
              </button>
            )}
          </div>

          {/* Filter fields — collapsible on mobile, always visible on desktop (md+) */}
          
          <div className={`mt-3 ${showFilters ? 'block' : 'block lg:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Module */}
              <div>
                <select
                  value={module}
                  onChange={handleModuleChange}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">All Modules</option>
                  {modules.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div>
                <select
                  value={action}
                  onChange={handleActionChange}
                  disabled={!module}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{module ? 'All Actions' : 'Select Module First'}</option>
                  {availableActions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="w-full">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>From:</span>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  max={endDate ? endDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  onKeyDown={(e) => e.preventDefault()}
                  onChange={(e) => handleStartDateChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                  onBlur={applyDateFilters}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                </div>
              </div>

              {/* End Date */}
              <div className="w-full">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>To:</span>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  min={startDate ? startDate.toISOString().split('T')[0] : ''}
                  max={new Date().toISOString().split('T')[0]}
                  onKeyDown={(e) => e.preventDefault()}
                  onChange={(e) => handleEndDateChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                  onBlur={applyDateFilters}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* ── Results summary ── */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs sm:text-sm text-secondary-500">
            Showing <span className="font-medium">{logs.length}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> logs
          </p>
        </div>

        {/* ── Main content ── */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-secondary-500 px-4 text-center">
              <FiActivity className="w-12 h-12 mb-4 text-secondary-300" />
              <p className="text-base sm:text-lg font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* ─── Desktop table (md+) ─── */}
              {/* <div className="hidden md:block overflow-x-auto"> */}
              {/* <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50 border-b border-secondary-200">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider whitespace-nowrap">
                        Date / Time
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Module
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-secondary-600">
                            <FiClock className="text-secondary-400 shrink-0" />
                            {formatDate(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getModuleColor(log.module)}`}>
                            {log.module}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                              <FiUser className="text-primary-600 w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-secondary-900 truncate max-w-[140px]">
                                {log.performedBy?.name || log.metadata?.mobileNumber || 'System'}
                              </p>
                              <p className="text-xs text-secondary-500 truncate max-w-[140px]">
                                {log.performedBy?.email && !log.performedBy.email.includes('@mobile.user')
                                  ? log.performedBy.email
                                  : log.performedBy?.mobileNumber || log.performedBy?.phone || (log.metadata?.mobileNumber ? 'Mobile User' : '')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-secondary-600 max-w-xs lg:max-w-md truncate" title={log.description}>
                            {log.description}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div> */}
<div className="w-full overflow-x-auto">
  <table className="w-full min-w-[900px]">

    {/* HEADER */}
    <thead className="bg-secondary-50 border-b border-secondary-200">
      <tr>
       <th className="px-3 sm:px-5 py-3 text-center text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase w-[50px]">
  S.No.
</th>
       <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase min-w-[140px] sm:min-w-[180px]">
  Date & Time
</th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          Action
        </th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          Module
        </th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          User
        </th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          Description
        </th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          Role
        </th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          Company
        </th>
        <th className="px-3 sm:px-5 py-3 text-left text-[10px] sm:text-xs font-semibold text-secondary-600 uppercase">
          Email
        </th>
      </tr>
    </thead>

    {/* BODY */}
    <tbody className="divide-y divide-secondary-100">
      {logs.map((log, index) => (
        <tr key={log._id} className="hover:bg-secondary-50">

          {/* S.No. */}
          <td className="px-3 sm:px-5 py-3 text-center text-xs sm:text-sm text-secondary-400">
            {(pagination.page - 1) * pagination.limit + index + 1}
          </td>

          {/* DATE */}
        <td className="px-3 sm:px-5 py-3 align-top min-w-[140px] sm:min-w-[180px]">
  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-secondary-600">
    <FiClock className="text-secondary-400 shrink-0" />
    
    <div className="leading-tight">
      {/* Date */}
      <div className="font-medium">
        {new Date(log.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </div>

      {/* Time */}
      <div className="text-[10px] sm:text-xs text-secondary-400">
        {new Date(log.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  </div>
</td>

          {/* ACTION */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getActionColor(log.action)}`}>
              {log.action}
            </span>
          </td>

          {/* MODULE */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getModuleColor(log.module)}`}>
              {log.module}
            </span>
          </td>

          {/* USER */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                <FiUser className="text-primary-600 w-3 h-3 sm:w-4 sm:h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-secondary-900 break-words">
                  {log.performedBy?.name || log.metadata?.mobileNumber || 'System'}
                </p>

                <p className="text-[10px] sm:text-xs text-secondary-500 break-words">
                  {log.performedBy?.email &&
                  !log.performedBy.email.includes('@mobile.user')
                    ? log.performedBy.email
                    : ''}
                </p>
              </div>
            </div>
          </td>

          {/* DESCRIPTION */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <p className="text-xs sm:text-sm text-secondary-600 break-words">
              {log.description}
            </p>
          </td>

          {/* ROLE */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
              {log.role || '-'}
            </span>
          </td>

          {/* COMPANY */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <p className="text-xs sm:text-sm text-secondary-600">
              {log.companyId?.name || '-'}
            </p>
          </td>

          {/* EMAIL */}
          <td className="px-3 sm:px-5 py-3 align-top">
            <p className="text-xs sm:text-sm text-secondary-600 break-words">
              {log.performedBy?.email && !log.performedBy.email.includes('@mobile.user')
                ? log.performedBy.email
                : (log.metadata?.mobileNumber ? 'Mobile User' : '-')}
            </p>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
              {/* ─── Mobile cards (< md) ─── */}
              {/* <div className="md:hidden divide-y divide-secondary-100"> */}
            
            </>
          )}

          {/* ── Pagination ── */}
          {/* {!loading && pagination.total > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-secondary-200">
              <Pagination
                currentPage={pagination.page}
                totalPages={Math.ceil(pagination.total / pagination.limit)}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              />
            </div>
          )} */}

          {/* ── Pagination ── */}
{/* ── Pagination ── */}
{!loading && pagination.total > 0 && (
  <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white">

    <div className="flex flex-col gap-3">

      {/* INFO TEXT */}
      {/*  */}

      {/* PAGINATION WRAPPER (FIXED) */}
      <div className="w-full overflow-x-auto">
        <div className="flex justify-center sm:justify-end min-w-max">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
          />
        </div>
      </div>

    </div>
  </div>
)}
        </div>
      </div>
    </div>
  )
}

export default AuditLogs