import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, formatDate } from '../utils/dateFormat'
import {
  FiFileText,
  FiSmartphone,
  FiCreditCard,
  FiPhone,
  FiBriefcase,
  FiDownload,
  FiCalendar,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  StatCard,
  Grid,
  Badge,
  Button,
  Spinner,
  Pagination,
} from '../components/ui'

export default function Reports() {
  const { user, api } = useAuth()
  const [activeReport, setActiveReport] = useState('sims')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    operator: '',
    callType: '',
    uniqueOnly: false,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  const isSuperAdmin = user?.role === 'super_admin'
  const fetchIdRef = useRef(0)

  const reportTypes = [
    { id: 'sims', name: 'SIM Report', icon: FiSmartphone, description: 'Export SIM card data with status and details' },
    { id: 'recharges', name: 'Recharge Report', icon: FiCreditCard, description: 'Export recharge history and statistics' },
    { id: 'callLogs', name: 'Call Log Report', icon: FiPhone, description: 'Export call history and analytics' },
    ...(isSuperAdmin ? [{ id: 'companies', name: 'Company Report', icon: FiBriefcase, description: 'Export company data and stats (Admin only)' }] : []),
  ]

  const statusOptions = ['active', 'inactive']
  const operatorOptions = ['Jio', 'Airtel', 'Vi', 'BSNL', 'MTNL', 'Other']
  const callTypeOptions = [
    { value: 'incoming', label: 'Incoming' },
    { value: 'outgoing', label: 'Outgoing' },
    { value: 'missed', label: 'Missed' },
  ]

  // Use a ref to store filters for the fetch function
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchReport = async (overrideFilters = null) => {
    const id = ++fetchIdRef.current
    try {
      setLoading(true)
      const params = new URLSearchParams()
      const currentFilters = overrideFilters || filtersRef.current

      // Pagination params
      params.append('page', pagination.page)
      params.append('limit', pagination.limit)

      // Filter params
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate)
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate)
      if (currentFilters.status && activeReport === 'sims') params.append('status', currentFilters.status)
      if (currentFilters.operator && activeReport === 'sims') params.append('operator', currentFilters.operator)
      if (currentFilters.callType && activeReport === 'callLogs') params.append('callType', currentFilters.callType)
      if (currentFilters.uniqueOnly && activeReport === 'callLogs') params.append('uniqueOnly', 'true')

      const response = await api.get(`/reports/${activeReport}?${params}`)
      if (fetchIdRef.current !== id) return
      setReportData(response.data)
      setPagination((prev) => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
      }))
    } catch (error) {
      if (fetchIdRef.current !== id) return
      toast.error('Failed to fetch report')
      setReportData(null)
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  // Single unified fetch effect — fires on page, limit, filter, or report type changes
  useEffect(() => {
    if (activeReport) {
      fetchReport()
    }
  }, [pagination.page, pagination.limit, filters.startDate, filters.endDate, filters.status, filters.operator, filters.callType, filters.uniqueOnly, activeReport])

  const handleExport = async (format) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.status && activeReport === 'sims') params.append('status', filters.status)
      if (filters.operator && activeReport === 'sims') params.append('operator', filters.operator)
      if (filters.callType && activeReport === 'callLogs') params.append('callType', filters.callType)
      if (filters.uniqueOnly && activeReport === 'callLogs') params.append('uniqueOnly', 'true')

      params.append('format', format)
      params.append('download', 'true')

      const response = await api.get(`/reports/${activeReport}?${params}`, {
        responseType: 'blob',
      })

      const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const extension = format === 'csv' ? 'csv' : 'xlsx'

      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${activeReport}-report.${extension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(`Report exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('This feature is available in higher plans. Upgrade your plan to access it.')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    const clearedFilters = {
      startDate: '',
      endDate: '',
      status: '',
      operator: '',
      callType: '',
      uniqueOnly: false,
    }
    setFilters(clearedFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const renderSummary = () => {
    if (!reportData?.summary) return null

    const summary = reportData.summary

    return (
      <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>

        {activeReport === 'sims' && (
          <StatCard
            title="Total Records"
            value={summary.total || 0}
          />
        )}

        {activeReport === 'sims' && (
          <>
            <StatCard
              title="Active"
              value={summary.byStatus?.active || 0}
              valueColor="#16a34a"
            />
            <StatCard
              title="WhatsApp Enabled"
              value={summary.whatsappEnabled || 0}
              icon={FiSmartphone}
              iconColor="#25d366"
              iconBg="#25d36620"
            />
            <StatCard
              title="Telegram Enabled"
              value={summary.telegramEnabled || 0}
              icon={FiSmartphone}
              iconColor="#0088cc"
              iconBg="#0088cc20"
            />
          </>
        )}

        {/* {activeReport === 'recharges' && (
          <>
            <StatCard
              title="Total Amount"
              value={`₹${(summary.totalAmount || 0).toLocaleString()}`}
            />
            <StatCard
              title="Average"
              value={`₹${Math.round(summary.avgAmount || 0)}`}
            />
            <StatCard
              title="Payment Methods"
              value={Object.entries(summary.byPaymentMethod || {}).map(([method, count]) => `${method}: ${count}`).join(' • ') || 'N/A'}
            />
          </>
        )} */}

        {activeReport === 'recharges' && (
          <>
            <StatCard
              title="Total Records"
              value={summary.total || 0}
            />
            <StatCard
              title="Total Amounts"
              value={`₹${(summary.totalAmount || 0).toLocaleString()}`}
            />
            <StatCard
              title="Average Amount"
              value={`₹${Math.round(summary.avgAmount || 0)}`}
            />
            {/* <StatCard
              title="Payment Methods"
              value={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  {Object.entries(summary.byPaymentMethod || {}).length > 0
                    ? Object.entries(summary.byPaymentMethod).map(([method, count]) => (
                      <div
                        key={method}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                      >
                        <span style={{ fontSize: '14px', color: '#6b7280', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                          {method}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
                          {count}
                        </span>
                      </div>
                    ))
                    : <span style={{ fontSize: '13px', color: '#9ca3af' }}>N/A</span>
                  }
                </div>
              }
            /> */}

  <StatCard
  title="Payment Methods"
  value={
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
      {Object.entries(summary.byPaymentMethod || {}).length > 0
        ? Object.entries(summary.byPaymentMethod).map(([method, count]) => (
          <div
            key={method}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '6px 8px',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
              {count}
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {method.toUpperCase()}
            </span>
          </div>
        ))
        : <span style={{ fontSize: '13px', color: '#9ca3af', gridColumn: 'span 2' }}>N/A</span>
      }
    </div>
  }
/>

          </>
        )}

        {activeReport === 'callLogs' && (
          <>
            <StatCard
              title={filters.callType === 'missed' ? 'Missed Calls' : 'Total Records'}
              value={summary.total || 0}
            />
            {filters.callType !== 'missed' && (
              <>
                <StatCard
                  title="Total Duration"
                  value={`${Math.round((summary.totalDuration || 0) / 60)}m`}
                />
                <StatCard
                  title="Avg Duration"
                  value={`${Math.round(summary.avgDuration || 0)}s`}
                />
              </>
            )}
            <StatCard
              title="Unique Numbers"
              value={summary.uniqueNumbers || 0}
            />
          </>
        )}

        {activeReport === 'companies' && (
          <>
            <StatCard
              title="Total Records"
              value={summary.total || 0}
            />
            <StatCard
              title="Active Companies"
              value={summary.active || 0}
              valueColor="#16a34a"
            />
            <StatCard
              title="Total SIMs"
              value={summary.totalSims || 0}
            />
            <StatCard
              title="Total Revenue"
              value={`₹${(summary.totalRevenue || 0).toLocaleString()}`}
            />
          </>
        )}
      </Grid>
    )
  }

  const renderTable = () => {
    if (!reportData?.data || reportData.data.length === 0) {
      return (
        <div style={{ padding: '48px', textAlign: 'center' }}>
         
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Data Available</h3>
          <p style={{ color: '#6b7280' }}>Adjust filters and try again</p>
        </div>
      )
    }

    // Data is already paginated from server
    const data = reportData.data

    const renderRow = (item, index) => {
      const sno = (pagination.page - 1) * pagination.limit + index + 1
      switch (activeReport) {
        case 'sims':
          return (
            <tr key={item._id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{sno}</td>
              <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.mobileNumber}</td>

              <td style={{ padding: '12px 16px' }}>{item.operator}</td>
              <td style={{ padding: '12px 16px' }}>
                <Badge variant={item.status === 'active' ? 'success' : 'danger'}>
                  {item.status}
                </Badge>
              </td>
              <td style={{ padding: '12px 16px' }}>{item.whatsappEnabled ? '✓' : '-'}</td>
              <td style={{ padding: '12px 16px' }}>{item.telegramEnabled ? '✓' : '-'}</td>
              <td style={{ padding: '12px 16px' }}>{item.assignedTo?.name || 'Unassigned'}</td>
              <td style={{ padding: '12px 16px' }}>{formatDateTime(item.createdAt)}</td>
            </tr>
          )
        case 'recharges':
          return (
            <tr key={item._id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{sno}</td>
              <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.simId?.mobileNumber || 'N/A'}</td>
              <td style={{ padding: '12px 16px' }}>{item.simId?.operator || 'N/A'}</td>
              <td style={{ padding: '12px 16px', fontWeight: '600' }}>₹{item.amount}</td>
              <td style={{ padding: '12px 16px' }}>{item.validity} days</td>
              <td style={{ padding: '12px 16px' }}>{item.plan?.name || 'N/A'}</td>
              <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{item.paymentMethod}</td>
              <td style={{ padding: '12px 16px' }}>{formatDate(item.rechargeDate)}</td>
              <td style={{ padding: '12px 16px' }}>{item.nextRechargeDate ? formatDate(item.nextRechargeDate) : '-'}</td>
            </tr>
          )
        case 'callLogs':
          return (
            <tr key={item._id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{sno}</td>
              <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.phoneNumber}</td>
              <td style={{ padding: '12px 16px' }}>
                <Badge variant={item.callType === 'incoming' ? 'success' : item.callType === 'outgoing' ? 'primary' : 'danger'}>
                  {item.callType === 'incoming' ? 'Incoming' : item.callType === 'outgoing' ? 'Outgoing' : 'Missed'}
                </Badge>
              </td>
              {filters.callType !== 'missed' && <td style={{ padding: '12px 16px' }}>{item.callType === 'missed' ? '0s' : `${item.duration}s`}</td>}
              <td style={{ padding: '12px 16px' }}>{item.simId?.mobileNumber || 'N/A'}</td>
              <td style={{ padding: '12px 16px' }}>{item.contactName || '-'}</td>
              <td style={{ padding: '12px 16px' }}>{formatDateTime(item.timestamp)}</td>
            </tr>
          )
        case 'companies':
          return (
            <tr key={item._id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{sno}</td>
              <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.name}</td>
              <td style={{ padding: '12px 16px' }}>{item.email}</td>
              <td style={{ padding: '12px 16px' }}>
                <Badge variant={item.isActive ? 'success' : 'danger'}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td style={{ padding: '12px 16px' }}>{item.subscriptionId?.name || 'N/A'}</td>
              <td style={{ padding: '12px 16px' }}>{item.stats?.totalSims || 0}</td>
              <td style={{ padding: '12px 16px' }}>₹{(item.stats?.totalRechargeAmount || 0).toLocaleString()}</td>
              <td style={{ padding: '12px 16px' }}>{formatDateTime(item.createdAt)}</td>
            </tr>
          )
        default:
          return null
      }
    }

    const getHeaders = () => {
      switch (activeReport) {
        case 'sims':
          return ['S.No.', 'Contact Number', 'Operator', 'Status', 'WhatsApp', 'Telegram', 'Assigned To', 'Date & Time']
        case 'recharges':
          return ['S.No.', 'Contact Number', 'Operator', 'Amount', 'Validity', 'Plan Name', 'Payment Methods', 'Recharge Date', 'Next Recharge']
        case 'callLogs':
          return filters.callType === 'missed'
            ? ['S.No.', 'Contact Number', 'All Type', 'SIM', 'Contact', 'Date']
            : ['S.No.', 'Contact Number', 'All Type', 'Duration', 'SIM', 'Contact', 'Date']
        case 'companies':
          return ['S.No.', 'Company', 'Email', 'Status', 'Subscription', 'SIMs', 'Revenue', 'Created']
        default:
          return []
      }
    }

    return (
      <>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {getHeaders().map((header, index) => (
                  <th key={index} style={{ padding: '12px 16px', textAlign: header === 'S.No.' ? 'center' : 'left', fontWeight: '600', color: '#6b7280', fontSize: '13px', width: header === 'S.No.' ? '50px' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => renderRow(item, index))}
            </tbody>
          </table>
        </div>
        {pagination.total > 0 && (
          <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
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
      </>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Generate and export reports"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* <Button variant="secondary" icon={FiDownload} onClick={() => handleExport('csv')} loading={loading}>
              CSV
            </Button>    */}
            <Button icon={FiDownload} onClick={() => handleExport('excel')} loading={loading}>
              Export
            </Button>
          </div>
        }
      />

      {/* Report Type Selection */}
      <Grid cols={4} gap={16} style={{ marginBottom: '24px' }}>
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setActiveReport(report.id)
              setReportData(null)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            style={{
              padding: '16px',
              border: activeReport === report.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '12px',
              backgroundColor: activeReport === report.id ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <report.icon style={{ width: '24px', height: '24px', color: '#2563eb', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{report.name}</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{report.description}</p>
          </button>
        ))}
      </Grid>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiFilter style={{ width: '16px', height: '16px' }} />
              <span style={{ fontWeight: '500' }}>Filters</span>
            </div>
            {showFilters ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          {showFilters && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <FiCalendar style={{ color: '#6b7280' }} />
                <input
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate || new Date().toISOString().split('T')[0]}
                  onKeyDown={(e) => e.preventDefault()}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ color: '#6b7280' }}>to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  onKeyDown={(e) => e.preventDefault()}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {activeReport === 'sims' && (
                <>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="">All Status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select
                    value={filters.operator}
                    onChange={(e) => handleFilterChange('operator', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="">All Operators</option>
                    {operatorOptions.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </>
              )}

              {activeReport === 'callLogs' && (
                <>
                <select
                  value={filters.callType}
                  onChange={(e) => handleFilterChange('callType', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">All Types</option>
                  {callTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  whiteSpace: 'nowrap',
                }}>
                  <input
                    type="checkbox"
                    checked={filters.uniqueOnly}
                    onChange={(e) => handleFilterChange('uniqueOnly', e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Unique Numbers Only
                </label>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={clearFilters}>Clear</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Loading State */}
      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          {/* Summary */}
          {reportData && renderSummary()}

          {/* Data Table */}
          <Card>
            <CardBody style={{ padding: 0 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {reportTypes.find(r => r.id === activeReport)?.name} Data
                </h3>
                {activeReport === 'callLogs' && filters.uniqueOnly && (
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    whiteSpace: 'nowrap',
                  }}>
                    Unique Numbers Only
                  </span>
                )}
              </div>
              {reportData && renderTable()}
            </CardBody>
          </Card>
        </>
      )}
    </PageContainer>
  )
}