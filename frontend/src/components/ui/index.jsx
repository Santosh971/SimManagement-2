import { useState, useEffect } from 'react'
import { animations } from '../../styles/common'

// Re-export PhoneInput component
export { default as PhoneInput } from './PhoneInput'

// Page Container - wraps all pages with consistent padding and background
export function PageContainer({ children, style }) {
  return (
    <div style={{
      padding: '24px',
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: '#f9fafb',
      ...style,
    }}>
      <style>{animations.fadeIn}</style>
      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {children}
      </div>
    </div>
  )
}

// Page Header - consistent page titles and descriptions
export function PageHeader({ title, description, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginBottom: '24px',
      '@media (min-width: 768px)': {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
    }}>
      <div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#111827',
          margin: 0,
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            marginTop: '4px',
            marginBottom: 0,
          }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <div style={{ marginTop: '16px', '@media (min-width: 768px)': { marginTop: 0 } }}>
          {action}
        </div>
      )}
    </div>
  )
}

// Card - reusable card component
export function Card({ children, style, className }) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

// Card Header - for cards with headers
export function CardHeader({ title, subtitle, action, style }) {
  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      ...style,
    }}>
      <div>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#111827',
          margin: 0,
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            margin: '4px 0 0 0',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Card Body - for card content
export function CardBody({ children, style }) {
  return (
    <div style={{
      padding: '24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// Stats Card - for dashboard statistics
export function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend, trendValue, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        minWidth: 0,  // critical — prevents grid blowout
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.2s',
        ...(onClick && {
          ':hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
          }
        }),
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '13px',
          color: '#6b7280',
          margin: 0,
          fontWeight: '500',
        }}>
          {title}
        </p>
        <p style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#111827',
          margin: '8px 0 4px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {value}
        </p>
        {subtitle && (
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            margin: 0,
          }}>
            {subtitle}
          </p>
        )}
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '500',
              color: trend === 'up' ? '#16a34a' : '#dc2626',
            }}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          </div>
        )}
      </div>
      {Icon && (
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: iconBg || '#eff6ff',
          flexShrink: 0,
        }}>
          <Icon style={{ width: '24px', height: '24px', color: iconColor || '#2563eb' }} />
        </div>
      )}
    </div>
  )
}

// Grid Layout - responsive grid with proper column support
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
    if (windowWidth <= 640) return 1
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

// Badge - status indicators
export function Badge({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: { bg: '#f3f4f6', text: '#374151' },
    primary: { bg: '#eff6ff', text: '#2563eb' },
    success: { bg: '#dcfce7', text: '#16a34a' },
    warning: { bg: '#fffbeb', text: '#d97706' },
    danger: { bg: '#fef2f2', text: '#dc2626' },
    info: { bg: '#eff6ff', text: '#2563eb' },
  }

  const sizes = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 10px', fontSize: '12px' },
    lg: { padding: '6px 12px', fontSize: '13px' },
  }

  const style = variants[variant] || variants.default
  const sizeStyle = sizes[size] || sizes.sm

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: '9999px',
      fontWeight: '500',
      textTransform: 'capitalize',
      backgroundColor: style.bg,
      color: style.text,
      ...sizeStyle,
    }}>
      {children}
    </span>
  )
}

// Button - primary, secondary, danger variants
export function Button({ children, variant = 'primary', size = 'md', icon: Icon, loading, disabled, style, ...props }) {
  const variants = {
    primary: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      border: 'none',
      hoverBg: '#1d4ed8',
    },
    secondary: {
      backgroundColor: '#ffffff',
      color: '#374151',
      border: '1px solid #d1d5db',
      hoverBg: '#f9fafb',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      border: 'none',
      hoverBg: '#b91c1c',
    },
    success: {
      backgroundColor: '#16a34a',
      color: '#ffffff',
      border: 'none',
      hoverBg: '#15803d',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#374151',
      border: 'none',
      hoverBg: '#f3f4f6',
    },
  }

  const sizes = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 16px', fontSize: '14px' },
    lg: { padding: '12px 20px', fontSize: '15px' },
  }

  const variantStyle = variants[variant] || variants.primary
  const sizeStyle = sizes[size] || sizes.md

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: '8px',
        fontWeight: '500',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s',
        backgroundColor: variantStyle.backgroundColor,
        color: variantStyle.color,
        border: variantStyle.border,
        ...sizeStyle,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <span style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
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

// Input - styled input field
export function Input({ label, error, icon: Icon, style, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            color: '#9ca3af',
          }} />
        )}
        <input
          style={{
            width: '100%',
            padding: Icon ? '10px 12px 10px 38px' : '10px 14px',
            border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box',
            ...style,
          }}
          {...props}
        />
      </div>
      {error && (
        <p style={{
          fontSize: '12px',
          color: '#ef4444',
          marginTop: '4px',
          margin: 0,
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

// Select - styled select dropdown
export function Select({ label, options, placeholder, error, style, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          {label}
        </label>
      )}
      <select
        style={{
          width: '100%',
          padding: '10px 14px',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
          ...style,
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{
          fontSize: '12px',
          color: '#ef4444',
          marginTop: '4px',
          margin: 0,
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

// Table - responsive table
export function Table({ columns, data, loading, emptyMessage, onRowClick }) {
  return (
    <div style={{ overflow: 'auto' }}>
      <style>{animations.slideUp}</style>
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : data && data.length > 0 ? (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '600px',
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {columns.map((col) => (
                <th key={col.key} style={{
                  padding: '12px 16px',
                  textAlign: col.align || 'left',
                  fontWeight: '600',
                  color: '#6b7280',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.id || index}
                style={{
                  borderTop: '1px solid #e5e7eb',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#1f2937',
                  }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          {emptyMessage || 'No data available'}
        </div>
      )}
    </div>
  )
}

// Empty State - for no data displays
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      padding: '48px',
      textAlign: 'center',
    }}>
      {Icon && (
        <Icon style={{
          width: '48px',
          height: '48px',
          color: '#9ca3af',
          marginBottom: '16px',
        }} />
      )}
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '8px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '16px',
        }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}

// Modal - reusable modal
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null

  const sizes = {
    sm: '400px',
    md: '500px',
    lg: '700px',
    xl: '900px',
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: sizes[size] || sizes.md,
        maxHeight: '90vh',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
            }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderRadius: '8px',
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Spinner - loading indicator
export function Spinner({ size = 'md' }) {
  const sizes = {
    sm: '16px',
    md: '32px',
    lg: '48px',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
    }}>
      <style>{animations.spin}</style>
      <div style={{
        width: sizes[size],
        height: sizes[size],
        border: '3px solid #e5e7eb',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  )
}

// Pagination - page navigation
export function Pagination({ currentPage, totalPages, onPageChange, total }) {
  const pageSize = 10
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, total)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5 // Max page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      // Calculate range around current page
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)

      // Adjust range to show up to 3 middle pages
      if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, 4)
      } else if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3)
      }

      // Add ellipsis and middle pages
      if (startPage > 2) {
        pages.push('...')
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      if (endPage < totalPages - 1) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '16px',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        margin: 0,
      }}>
        Showing {start} to {end} of {total} results
      </p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
            fontSize: '14px',
          }}
        >
          Previous
        </button>
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} style={{ padding: '0 4px', color: '#6b7280' }}>...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: currentPage === page ? '#2563eb' : '#ffffff',
                color: currentPage === page ? '#ffffff' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentPage === page ? '600' : '400',
              }}
            >
              {page}
            </button>
          )
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage >= totalPages ? 0.5 : 1,
            fontSize: '14px',
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}