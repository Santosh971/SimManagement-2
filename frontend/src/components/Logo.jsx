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

// Subscriber list — Logo components and useBranding hooks register here
const subscribers = new Set()

function notifySubscribers(data) {
  subscribers.forEach(fn => fn(data))
}

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
      brandingCache = data.data?.branding || { siteName: 'SIM Manager', logoUrl: '', faviconUrl: '' }
      brandingPromise = null
      return brandingCache
    })
    .catch(() => {
      brandingCache = { siteName: 'SIM Manager', logoUrl: '', faviconUrl: '' }
      brandingPromise = null
      return brandingCache
    })

  return brandingPromise
}

// Apply favicon from branding data to the browser tab
export function applyFavicon(branding) {
  const faviconUrl = branding?.faviconUrl
  // Find or create the favicon link element
  let link = document.querySelector("link[rel*='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  if (faviconUrl) {
    const fullUrl = getLogoUrl(faviconUrl)
    // Determine type based on extension
    if (fullUrl.endsWith('.svg')) {
      link.type = 'image/svg+xml'
    } else if (fullUrl.endsWith('.png')) {
      link.type = 'image/png'
    } else if (fullUrl.endsWith('.ico')) {
      link.type = 'image/x-icon'
    } else {
      link.type = 'image/png' // default
    }
    link.href = fullUrl
  } else if (branding?.logoUrl) {
    // Fallback: use the main logo as favicon when no dedicated favicon
    const fullUrl = getLogoUrl(branding.logoUrl)
    if (fullUrl.endsWith('.svg')) {
      link.type = 'image/svg+xml'
    } else if (fullUrl.endsWith('.png')) {
      link.type = 'image/png'
    } else if (fullUrl.endsWith('.ico')) {
      link.type = 'image/x-icon'
    } else {
      link.type = 'image/png'
    }
    link.href = fullUrl
  }
  // If neither faviconUrl nor logoUrl, the existing static favicon stays unchanged
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
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    fetchBranding().then(data => {
      setBranding(data)
      setLoading(false)
    })

    // Subscribe to live branding updates
    const onBrandingUpdate = (data) => {
      setBranding(data)
      setLogoError(false)
    }
    subscribers.add(onBrandingUpdate)

    return () => {
      subscribers.delete(onBrandingUpdate)
    }
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

    // If custom logo exists and hasn't failed to load
    if (logoUrl && !logoError) {
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
            onError={() => {
              setLogoError(true)
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
      // Apply dynamic favicon when branding loads
      applyFavicon(data)
    })

    // Subscribe to live branding updates
    const onBrandingUpdate = (data) => {
      setBranding(data)
      applyFavicon(data)
    }
    subscribers.add(onBrandingUpdate)

    return () => {
      subscribers.delete(onBrandingUpdate)
    }
  }, [])

  return { branding, loading }
}

// Function to update branding cache and notify all mounted Logo/useBranding instances
export function updateBrandingCache(newBranding) {
  brandingCache = { ...brandingCache, ...newBranding }
  notifySubscribers(brandingCache)
}

// Function to clear branding cache so next mount re-fetches from server
export function clearBrandingCache() {
  brandingCache = null
}