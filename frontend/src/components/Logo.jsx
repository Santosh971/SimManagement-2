import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiSmartphone } from 'react-icons/fi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Get the base URL for static files (remove /api from the end)
const getBaseUrl = () => {
  if (API_URL.endsWith('/api')) {
    return API_URL.slice(0, -4) // Remove '/api'
  }
  return API_URL
}

const BASE_URL = getBaseUrl()

// Cache for branding data
let brandingCache = null
let brandingPromise = null

const fetchBranding = async () => {
  // Return cached data if available
  if (brandingCache) {
    return brandingCache
  }

  // Return existing promise if request is in progress
  if (brandingPromise) {
    return brandingPromise
  }

  // Make new request
  brandingPromise = fetch(`${API_URL}/landing-content/public`)
    .then(res => res.json())
    .then(data => {
      brandingCache = data.data?.branding || { siteName: 'SIM Manager', logoUrl: '' }
      brandingPromise = null
      return brandingCache
    })
    .catch(() => {
      brandingCache = { siteName: 'SIM Manager', logoUrl: '' }
      brandingPromise = null
      return brandingCache
    })

  return brandingPromise
}

// Helper to get full URL for logo
const getLogoUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // Prepend base URL for relative paths
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function Logo({
  size = 'default',
  showText = true,
  variant = 'light', // 'light' or 'dark'
  linkTo = '/',
  className = '',
  style = {},
}) {
  const [branding, setBranding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBranding().then(data => {
      setBranding(data)
      setLoading(false)
    })
  }, [])

  // Size configurations
  const sizes = {
    small: { icon: '16px', img: '24px', text: '14px', gap: '6px' },
    default: { icon: '20px', img: '32px', text: '16px', gap: '8px' },
    large: { icon: '24px', img: '40px', text: '20px', gap: '10px' },
    xlarge: { icon: '32px', img: '48px', text: '24px', gap: '12px' },
  }

  const config = sizes[size] || sizes.default

  // Determine which logo to use based on variant
  const logoUrl = variant === 'dark' && branding?.logoDarkUrl
    ? branding.logoDarkUrl
    : branding?.logoUrl

  // Render the logo content
  const renderLogo = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: config.gap,
        }}>
          <div style={{
            width: config.img,
            height: config.img,
            backgroundColor: '#2563eb',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FiSmartphone style={{ width: config.icon, height: config.icon, color: 'white' }} />
          </div>
          {showText && (
            <span style={{
              fontWeight: 'bold',
              fontSize: config.text,
              color: variant === 'dark' ? '#0f172a' : (variant === 'light' ? '#ffffff' : '#0f172a'),
            }}>
              SIM Manager
            </span>
          )}
        </div>
      )
    }

    // If custom logo exists
    if (logoUrl) {
      const fullLogoUrl = getLogoUrl(logoUrl)
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: config.gap,
        }}>
          <img
            src={fullLogoUrl}
            alt={branding?.siteName || 'Logo'}
            style={{
              height: config.img,
              width: 'auto',
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback to default if image fails to load
              e.target.style.display = 'none'
            }}
          />
          {showText && (
            <span style={{
              fontWeight: 'bold',
              fontSize: config.text,
              color: variant === 'dark' ? '#0f172a' : (variant === 'light' ? '#ffffff' : '#0f172a'),
            }}>
              {branding?.siteName || 'SIM Manager'}
            </span>
          )}
        </div>
      )
    }

    // Default logo with icon and text
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
      }}>
        <div style={{
          width: config.img,
          height: config.img,
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FiSmartphone style={{ width: config.icon, height: config.icon, color: 'white' }} />
        </div>
        {showText && (
          <span style={{
            fontWeight: 'bold',
            fontSize: config.text,
            color: variant === 'dark' ? '#0f172a' : (variant === 'light' ? '#ffffff' : '#0f172a'),
          }}>
            {branding?.siteName || 'SIM Manager'}
          </span>
        )}
      </div>
    )
  }

  // Wrap in Link if linkTo is provided
  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className={className}
        style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', ...style }}
      >
        {renderLogo()}
      </Link>
    )
  }

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', ...style }}>
      {renderLogo()}
    </div>
  )
}

// Hook to access branding data directly
export function useBranding() {
  const [branding, setBranding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBranding().then(data => {
      setBranding(data)
      setLoading(false)
    })
  }, [])

  return { branding, loading }
}

// Function to clear branding cache (useful after updating branding)
export function clearBrandingCache() {
  brandingCache = null
}