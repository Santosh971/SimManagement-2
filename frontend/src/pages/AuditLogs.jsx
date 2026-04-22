import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  FiActivity,
  FiCalendar,
  FiFilter,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiUser,
  FiClock,
  FiX,
} from 'react-icons/fi'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  PageContainer,
  Pagination,
} from '../components/ui'

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
  const [showFilters, setShowFilters] = useState(false)

  // Available options
  const modules = ['AUTH', 'SIM', 'RECHARGE', 'USER', 'REPORT', 'COMPANY', 'SUBSCRIPTION', 'PAYMENT', 'CALL_LOG', 'NOTIFICATION', 'DASHBOARD', 'SETTINGS']
  const actions = {
    AUTH: ['USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET'],
    SIM: ['SIM_CREATE', 'SIM_UPDATE', 'SIM_DELETE', 'SIM_ASSIGN', 'SIM_UNASSIGN', 'SIM_STATUS_CHANGE', 'SIM_BULK_CREATE', 'SIM_BULK_IMPORT', 'SIM_EXPORT'],
    RECHARGE: ['RECHARGE_ADD', 'RECHARGE_UPDATE', 'RECHARGE_DELETE'],
    USER: ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_PASSWORD_RESET'],
    REPORT: ['REPORT_GENERATE', 'REPORT_EXPORT'],
    COMPANY: ['COMPANY_CREATE', 'COMPANY_UPDATE', 'COMPANY_DELETE', 'COMPANY_ADMIN_CREATE', 'COMPANY_SUBSCRIPTION_RENEW'],
    SUBSCRIPTION: ['SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_DELETE', 'SUBSCRIPTION_TOGGLE'],
    PAYMENT: ['PAYMENT_INITIATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'],
    CALL_LOG: ['CALL_LOG_SYNC', 'CALL_LOG_EXPORT'],
    NOTIFICATION: ['NOTIFICATION_CREATE', 'NOTIFICATION_READ'],
    DASHBOARD: ['DASHBOARD_VIEW'],
    SETTINGS: ['SETTINGS_UPDATE'],
  }

  // Get available actions based on selected module
  const availableActions = module ? actions[module] || [] : []

  // Fetch audit logs
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
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      const response = await api.get(`/audit-logs?${params.toString()}`)
      const data = response.data

      setLogs(data.data || [])

      // Handle pagination data from API response
      const paginationData = data.pagination || {}
      setPagination((prev) => ({
        ...prev,
        total: paginationData.total || 0,
      }))
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError('Failed to load audit logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, module, action, startDate, endDate])

  // Debounced search - reset to page 1 when search changes
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

  // Handle filter changes
  const handleModuleChange = (e) => {
    setModule(e.target.value)
    setAction('') // Reset action when module changes
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleActionChange = (e) => {
    setAction(e.target.value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
  }

  const handleStartDateChange = (date) => {
    setStartDate(date)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleEndDateChange = (date) => {
    setEndDate(date)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Clear all filters
  const clearFilters = () => {
    setModule('')
    setAction('')
    setSearch('')
    setStartDate(null)
    setEndDate(null)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Export logs
  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (module) params.append('module', module)
      if (action) params.append('action', action)
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

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

  // Format date/time
  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get action badge color
  const getActionColor = (action) => {
    if (action?.includes('CREATE') || action?.includes('ADD')) return 'bg-green-100 text-green-700'
    if (action?.includes('UPDATE')) return 'bg-blue-100 text-blue-700'
    if (action?.includes('DELETE')) return 'bg-red-100 text-red-700'
    if (action?.includes('LOGIN') || action?.includes('LOGOUT')) return 'bg-purple-100 text-purple-700'
    if (action?.includes('EXPORT') || action?.includes('GENERATE')) return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-700'
  }

  // Get module color
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
    }
    return colors[module] || 'bg-gray-100 text-gray-700'
  }

  // Check if any filters are active
  const hasActiveFilters = module || action || search || startDate || endDate

  return (
    <div className="min-h-screen bg-secondary-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
                <FiActivity className="text-primary-600" />
                Audit Logs
              </h1>
              <p className="text-secondary-500 mt-1">
                Track all user actions and system events
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchLogs()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary-200 rounded-lg text-secondary-600 hover:bg-secondary-50 transition-colors"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <FiDownload />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-secondary-600 hover:text-primary-600 transition-colors md:hidden"
            >
              <FiFilter />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-secondary-500 hover:text-danger-500 transition-colors"
              >
                <FiX className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search description..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Module Filter */}
              <select
                value={module}
                onChange={handleModuleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">All Modules</option>
                {modules.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                value={action}
                onChange={handleActionChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                disabled={!module}
              >
                <option value="">All Actions</option>
                {availableActions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Start Date */}
              <div className="relative">
                <ReactDatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  placeholderText="Start Date"
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  dateFormat="dd MMM yyyy"
                  isClearable
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <ReactDatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  placeholderText="End Date"
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  dateFormat="dd MMM yyyy"
                  isClearable
                  minDate={startDate}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-secondary-500">
            Showing {logs.length} of {pagination.total} logs
          </p>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-secondary-500">
              <FiActivity className="w-12 h-12 mb-4 text-secondary-300" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-secondary-600">
                          <FiClock className="text-secondary-400" />
                          {formatDateTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getModuleColor(log.module)}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <FiUser className="text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-secondary-900">
                              {log.performedBy?.name || log.metadata?.mobileNumber || 'System'}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {/* Show real email if not auto-generated, otherwise show mobile number */}
                              {log.performedBy?.email && !log.performedBy.email.includes('@mobile.user')
                                ? log.performedBy.email
                                : log.performedBy?.mobileNumber || log.performedBy?.phone || (log.metadata?.mobileNumber ? 'Mobile User' : '')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-secondary-600 max-w-md truncate" title={log.description}>
                          {log.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.total > 0 && (
            <div className="px-6 py-4 border-t border-secondary-200">
              <Pagination
                currentPage={pagination.page}
                totalPages={Math.ceil(pagination.total / pagination.limit)}
                total={pagination.total}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditLogs