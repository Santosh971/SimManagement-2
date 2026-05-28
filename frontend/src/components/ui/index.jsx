

import { useState, useEffect, useRef } from 'react'
import { animations } from '../../styles/common'

export { default as PhoneInput } from './PhoneInput'
export { default as CountryCodeSelect } from './CountryCodeSelect'

const globalStyles = `
  ${animations?.fadeIn || ''}
  ${animations?.spin || ''}
  ${animations?.slideUp || ''}

  /* PageContainer */
  .page-container { padding: 24px; min-height: calc(100vh - 64px); background-color: #f9fafb; }
  @media (max-width: 640px) { .page-container { padding: 16px; } }

  /* PageHeader */
  .page-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .page-header-action { flex-shrink: 0; }

  /* CardBody */
  .card-body-inner { padding: 24px; }
  @media (max-width: 640px) { .card-body-inner { padding: 14px; } }

  /* Spinner animation */
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`

// ── inject styles once ──────────────────────────────────────────────────────
let stylesInjected = false
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const tag = document.createElement('style')
  tag.id = 'ui-global-styles'
  tag.textContent = globalStyles
  document.head.appendChild(tag)
}

// ── PageContainer ───────────────────────────────────────────────────────────
export function PageContainer({ children, style }) {
  ensureStyles()
  return (
    <div className="page-container" style={{ ...style }}>
      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {children}
      </div>
    </div>
  )
}

// ── PageHeader ──────────────────────────────────────────────────────────────
export function PageHeader({ title, description, action }) {
  ensureStyles()
  return (
    <div className="page-header">
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '600',
          color: '#111827',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            color: '#6b7280',
            fontSize: '13px',
            marginTop: '3px',
            marginBottom: 0,
          }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="page-header-action">
          {action}
        </div>
      )}
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style, className, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── CardHeader ──────────────────────────────────────────────────────────────
export function CardHeader({ title, subtitle, action, style }) {
  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      ...style,
    }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── CardBody ────────────────────────────────────────────────────────────────
export function CardBody({ children, style }) {
  ensureStyles()
  return (
    <div style={{ ...style }}>
      <div className="card-body-inner">
        {children}
      </div>
    </div>
  )
}

// ── StatCard ────────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend, trendValue, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '18px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
          {title}
        </p>
        <p style={{
          fontSize: '26px', fontWeight: '600', color: '#111827',
          margin: '6px 0 4px 0', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{subtitle}</p>
        )}
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: trend === 'up' ? '#16a34a' : '#dc2626' }}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          </div>
        )}
      </div>
      {Icon && (
        <div style={{
          padding: '10px', borderRadius: '10px',
          backgroundColor: iconBg || '#eff6ff', flexShrink: 0,
        }}>
          <Icon style={{ width: '20px', height: '20px', color: iconColor || '#2563eb' }} />
        </div>
      )}
    </div>
  )
}

// ── Grid ────────────────────────────────────────────────────────────────────
export function Grid({ children, cols = 4, gap = 16, style, className }) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getColumns = () => {
    if (windowWidth <= 480) return 1
    if (windowWidth <= 768) return Math.min(cols, 2)
    if (windowWidth <= 1024) return Math.min(cols, 3)
    return cols
  }

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getColumns()}, minmax(0, 1fr))`,
        gap: `${gap}px`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: { bg: '#f3f4f6', text: '#374151' },
    primary:  { bg: '#eff6ff', text: '#2563eb' },
    success:  { bg: '#dcfce7', text: '#16a34a' },
    warning:  { bg: '#fffbeb', text: '#d97706' },
    danger:   { bg: '#fef2f2', text: '#dc2626' },
    info:     { bg: '#eff6ff', text: '#2563eb' },
  }
  const sizes = {
    sm: { padding: '2px 8px',  fontSize: '11px' },
    md: { padding: '4px 10px', fontSize: '12px' },
    lg: { padding: '6px 12px', fontSize: '13px' },
  }
  const v = variants[variant] || variants.default
  const s = sizes[size] || sizes.sm
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: '9999px', fontWeight: '500',
      textTransform: 'capitalize',
      backgroundColor: v.bg, color: v.text, ...s,
    }}>
      {children}
    </span>
  )
}

// ── Button ──────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', icon: Icon, loading, disabled, style, ...props }) {
  const variants = {
    primary:   { backgroundColor: '#2563eb', color: '#fff',     border: 'none' },
    secondary: { backgroundColor: '#ffffff', color: '#374151',  border: '1px solid #d1d5db' },
    danger:    { backgroundColor: '#dc2626', color: '#fff',     border: 'none' },
    success:   { backgroundColor: '#16a34a', color: '#fff',     border: 'none' },
    ghost:     { backgroundColor: 'transparent', color: '#374151', border: 'none' },
  }
  const sizes = {
    sm: { padding: '6px 12px',  fontSize: '13px' },
    md: { padding: '10px 16px', fontSize: '14px' },
    lg: { padding: '12px 20px', fontSize: '15px' },
  }
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px',
        borderRadius: '8px', fontWeight: '500',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s',
        backgroundColor: v.backgroundColor, color: v.color, border: v.border,
        ...s, ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <span style={{
            width: '14px', height: '14px',
            border: '2px solid currentColor', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon style={{ width: '16px', height: '16px' }} />}
          {children}
        </>
      )}
    </button>
  )
}

// ── Input ───────────────────────────────────────────────────────────────────
export function Input({ label, error, icon: Icon, style, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
        )}
        <input
          style={{
            width: '100%',
            padding: Icon ? '10px 12px 10px 38px' : '10px 14px',
            border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px', fontSize: '14px', outline: 'none',
            transition: 'all 0.2s', boxSizing: 'border-box', ...style,
          }}
          {...props}
        />
      </div>
      {error && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', marginBottom: 0 }}>{error}</p>}
    </div>
  )
}

// ── Select ──────────────────────────────────────────────────────────────────
export function Select({ label, options, placeholder, error, style, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          {label}
        </label>
      )}
      <select
        style={{
          width: '100%', padding: '10px 14px',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '8px', fontSize: '14px',
          backgroundColor: '#ffffff', cursor: 'pointer', outline: 'none', ...style,
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', marginBottom: 0 }}>{error}</p>}
    </div>
  )
}

// ── Table ───────────────────────────────────────────────────────────────────
export function Table({ columns, data, loading, emptyMessage, emptyAction, onRowClick, showSerial, serialOffset = 0 }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : data && data.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {showSerial && (
                <th key="_serial" style={{
                  padding: '11px 14px', textAlign: 'center',
                  fontWeight: '600', color: '#6b7280', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap', width: '50px',
                }}>
                  S.No.
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{
                  padding: '11px 14px', textAlign: col.align || 'left',
                  fontWeight: '600', color: '#6b7280', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap',
                }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row._id || row.id || index}
                style={{ borderBottom: '1px solid #f3f4f6', cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.15s' }}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {showSerial && (
                  <td key="_serial" style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                    {serialOffset + index + 1}
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '12px 14px', fontSize: '13px', color: '#1f2937' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
          <p style={{ marginBottom: emptyAction ? '16px' : 0, fontSize: '14px' }}>{emptyMessage || 'No data available'}</p>
          {emptyAction}
        </div>
      )}
    </div>
  )
}

// ── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      {Icon && <Icon style={{ width: '44px', height: '44px', color: '#9ca3af', marginBottom: '16px' }} />}
      <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>{title}</h3>
      {description && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null
  const sizes = { sm: '400px', md: '500px', lg: '700px', xl: '900px' }
  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: sizes[size] || sizes.md, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1, flexShrink: 0 }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#111827' }}>{title}</h2>
            <button onClick={onClose} style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '18px', height: '18px', color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div style={{ padding: '20px', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: '16px', md: '32px', lg: '48px' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
      <div style={{ width: sizes[size], height: sizes[size], border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )
}

// ── ConfirmModal ────────────────────────────────────────────────────────────
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger', loading }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null
  const variantStyles = {
    danger: { backgroundColor: '#dc2626', color: '#fff', border: 'none' },
    warning: { backgroundColor: '#d97706', color: '#fff', border: 'none' },
    primary: { backgroundColor: '#2563eb', color: '#fff', border: 'none' },
  }
  const v = variantStyles[variant] || variantStyles.danger
  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: variant === 'danger' ? '#fef2f2' : variant === 'warning' ? '#fffbeb' : '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg style={{ width: '24px', height: '24px', color: variant === 'danger' ? '#dc2626' : variant === 'warning' ? '#d97706' : '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>{title}</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>{message}</p>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '14px', border: 'none', backgroundColor: '#fff',
              color: '#374151', fontSize: '14px', fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              borderRight: '1px solid #e5e7eb',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '14px', fontSize: '14px', fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              ...v,
            }}
          >
            {loading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tooltip ────────────────────────────────────────────────────────────────
export function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    }
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {show && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1f2937',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            border: '4px solid transparent',
            borderTopColor: '#1f2937',
          }} />
        </div>
      )}
    </>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ currentPage, totalPages, onPageChange, total, limit = 10 }) {
  const start = (currentPage - 1) * limit + 1
  const end   = Math.min(currentPage * limit, total)

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginTop: '16px',
      padding: '12px 14px',
      boxSizing: 'border-box',
      width: '100%',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        width: '100%',
        boxSizing: 'border-box',
      }}>

        {/* Info */}
        <div style={{
          fontSize: '12px', color: '#6b7280',
          flexShrink: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Showing{' '}
          <strong style={{ color: '#374151' }}>{start}</strong>
          {' – '}
          <strong style={{ color: '#374151' }}>{end}</strong>
          {' of '}
          <strong style={{ color: '#374151' }}>{total}</strong>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

          {/* Prev */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '6px 10px', borderRadius: '8px',
              border: '1px solid #d1d5db', backgroundColor: '#fff',
              color: '#374151', fontSize: '12px', fontWeight: '500',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.45 : 1,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>

          {/* Page pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '6px 10px', borderRadius: '8px',
            border: '1px solid #bfdbfe', backgroundColor: '#eff6ff',
            fontSize: '12px', fontWeight: '600', color: '#2563eb',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {currentPage} / {totalPages}
          </div>

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '6px 10px', borderRadius: '8px',
              border: '1px solid #d1d5db', backgroundColor: '#fff',
              color: '#374151', fontSize: '12px', fontWeight: '500',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.45 : 1,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Next
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

        </div>
      </div>
    </div>
  )
}