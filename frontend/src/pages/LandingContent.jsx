import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  FiSave,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiMonitor,
  FiMenu,
  FiX,
  FiUpload,
  FiImage,
} from 'react-icons/fi'
import { clearBrandingCache } from '../components/Logo'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Get the base URL for static files (remove /api from the end)
const getBaseUrl = () => {
  if (API_URL.endsWith('/api')) {
    return API_URL.slice(0, -4)
  }
  return API_URL
}
const BASE_URL = getBaseUrl()

// Helper to get full URL for logo
const getLogoUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// Available icons for features
const availableIcons = [
  'FiSmartphone', 'FiCreditCard', 'FiBell', 'FiBarChart2', 'FiUsers', 'FiShield',
  'FiStar', 'FiCheck', 'FiArrowRight', 'FiPlay', 'FiMonitor', 'FiSettings'
]

// Branding Section Component
const BrandingSection = ({ content, updateField, api, onLogoUpdate }) => {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG, JPG, SVG, and WebP images are allowed')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('type', 'logo')

      const response = await api.post('/landing-content/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success) {
        toast.success('Logo uploaded successfully')
        onLogoUpdate(response.data.data.logoUrl)
      } else {
        toast.error(response.data.message || 'Failed to upload logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the logo?')) return

    try {
      const response = await api.delete('/landing-content/logo/logo')
      if (response.data.success) {
        toast.success('Logo removed')
        onLogoUpdate('')
      }
    } catch (error) {
      toast.error('Failed to remove logo')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-secondary-900">Branding & Logo</h2>
      <p className="text-sm text-secondary-600">Customize your site branding. The logo appears in the navbar, sidebar, login pages, and footer.</p>

      {/* Site Name */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-1">Site Name</label>
        <input
          type="text"
          value={content.branding?.siteName || ''}
          onChange={(e) => {
            if (!content.branding) {
              updateField('branding', 'branding', { siteName: e.target.value, logoUrl: '', logoDarkUrl: '' })
            } else {
              const newBranding = { ...content.branding, siteName: e.target.value }
              updateField('branding', 'branding', newBranding)
            }
          }}
          className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="SIM Manager"
        />
        <p className="text-xs text-secondary-500 mt-1">This name appears next to the logo icon when no custom logo is uploaded.</p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">Logo Image</label>

        {/* Current Logo Preview */}
        {content.branding?.logoUrl && (
          <div className="mb-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={getLogoUrl(content.branding.logoUrl)}
                  alt="Current Logo"
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <p className="text-sm font-medium text-secondary-700">Current Logo</p>
                  <p className="text-xs text-secondary-500">Recommended: PNG or SVG with transparent background</p>
                </div>
              </div>
              <button
                onClick={handleDeleteLogo}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-secondary-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-sm text-secondary-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FiUpload className="w-8 h-8 text-secondary-400" />
              <p className="text-sm text-secondary-600">
                <span className="text-primary-600 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-secondary-500">PNG, JPG, SVG, or WebP (max 2MB)</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Logo Tips</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Use PNG or SVG with transparent background for best results</li>
          <li>• Recommended logo height: 32-48px</li>
          <li>• The logo appears on light and dark backgrounds - ensure contrast</li>
          <li>• Square logos work best with the rounded icon container</li>
        </ul>
      </div>
    </div>
  )
}

const LandingContent = () => {
  const { user, api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('branding')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [content, setContent] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    branding: true,
    hero: true,
    stats: true,
    features: true,
    howItWorks: true,
    testimonials: true,
    integrations: true,
    faq: true,
    cta: true,
    footer: true,
  })

  // Fetch content on mount
  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/landing-content`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setContent(data.data)
      }
    } catch (error) {
      toast.error('Failed to load landing content')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpdate = async (logoUrl) => {
    // Clear the logo cache so it fetches fresh data
    clearBrandingCache()

    // Update content with new branding
    setContent(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        logoUrl: logoUrl
      }
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/landing-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(content)
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Content saved successfully')
        setContent(data.data)
      } else {
        toast.error(data.message || 'Failed to save content')
      }
    } catch (error) {
      toast.error('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all content to default? This cannot be undone.')) return

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/landing-content/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Content reset to default')
        setContent(data.data)
      } else {
        toast.error(data.message || 'Failed to reset content')
      }
    } catch (error) {
      toast.error('Failed to reset content')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Update helper functions
  const updateField = (section, field, value) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const updateArrayItem = (section, index, field, value) => {
    setContent(prev => {
      const newArray = [...(prev[section]?.items || prev[section])]
      newArray[index] = { ...newArray[index], [field]: value }
      return { ...prev, [section]: prev[section]?.items ? { ...prev[section], items: newArray } : newArray }
    })
  }

  const addArrayItem = (section, arrayName, defaultItem) => {
    // If called with 2 arguments, arrayName is actually the defaultItem
    // This handles cases like stats, testimonials.items, etc.
    if (defaultItem === undefined) {
      const item = arrayName
      setContent(prev => {
        if (prev[section]?.items) {
          return {
            ...prev,
            [section]: {
              ...prev[section],
              items: [...prev[section].items, item]
            }
          }
        }
        return { ...prev, [section]: [...(prev[section] || []), item] }
      })
    } else {
      // Called with 3 arguments: section, arrayName, defaultItem
      // This handles nested arrays like hero.trustBadges
      setContent(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [arrayName]: [...(prev[section]?.[arrayName] || []), defaultItem]
        }
      }))
    }
  }

  const removeArrayItem = (section, index, arrayName) => {
    setContent(prev => {
      if (arrayName) {
        // Nested array like hero.trustBadges
        const newArray = prev[section]?.[arrayName]?.filter((_, i) => i !== index) || []
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [arrayName]: newArray
          }
        }
      }
      if (prev[section]?.items) {
        const newItems = prev[section].items.filter((_, i) => i !== index)
        return { ...prev, [section]: { ...prev[section], items: newItems } }
      }
      const newArray = prev[section].filter((_, i) => i !== index)
      return { ...prev, [section]: newArray }
    })
  }

  // Section configuration
  const sections = [
    { id: 'branding', label: 'Branding & Logo' },
    { id: 'hero', label: 'Hero Section' },
    { id: 'stats', label: 'Statistics' },
    { id: 'features', label: 'Features' },
    { id: 'howItWorks', label: 'How It Works' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'faq', label: 'FAQ' },
    { id: 'cta', label: 'Call to Action' },
    { id: 'footer', label: 'Footer' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Landing Page Content</h1>
          <p className="text-secondary-600 mt-1">Manage the content displayed on your public landing page</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Preview Link */}
      <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-center gap-2 text-primary-700">
          <FiMonitor className="w-5 h-5" />
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
            Preview landing page in a new tab
          </a>
        </div>
      </div>

      {/* Mobile Section Selector - Shows on mobile, hides on md+ */}
      <div className="block md:hidden mb-6">
        <label className="block text-sm font-medium text-secondary-700 mb-2">Select Section</label>
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value)}
          className="w-full px-3 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        >
          {sections.map(section => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation - Hides on mobile, shows on md+ */}
        <div className="hidden md:block md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-secondary-600 hover:bg-secondary-100'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Editor */}
        <div className="flex-1 min-w-0">
          {content && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 sm:p-6">
              {/* Branding Section */}
              {activeSection === 'branding' && (
                <BrandingSection
                  content={content}
                  updateField={updateField}
                  api={api}
                  onLogoUpdate={handleLogoUpdate}
                />
              )}

              {/* Hero Section */}
              {activeSection === 'hero' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">Hero Section</h2>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={content.hero?.badge || ''}
                      onChange={(e) => updateField('hero', 'badge', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Trusted by 500+ Companies"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Title (First Part)</label>
                      <input
                        type="text"
                        value={content.hero?.title || ''}
                        onChange={(e) => updateField('hero', 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Manage All Your"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Highlight Text</label>
                      <input
                        type="text"
                        value={content.hero?.highlight || ''}
                        onChange={(e) => updateField('hero', 'highlight', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="SIM Cards"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Title Suffix</label>
                    <input
                      type="text"
                      value={content.hero?.suffix || ''}
                      onChange={(e) => updateField('hero', 'suffix', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="in One Place"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Subtitle</label>
                    <textarea
                      value={content.hero?.subtitle || ''}
                      onChange={(e) => updateField('hero', 'subtitle', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Primary Button Text</label>
                      <input
                        type="text"
                        value={content.hero?.cta1Text || ''}
                        onChange={(e) => updateField('hero', 'cta1Text', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Primary Button Link</label>
                      <input
                        type="text"
                        value={content.hero?.cta1Link || ''}
                        onChange={(e) => updateField('hero', 'cta1Link', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Secondary Button Text</label>
                      <input
                        type="text"
                        value={content.hero?.cta2Text || ''}
                        onChange={(e) => updateField('hero', 'cta2Text', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Secondary Button Link</label>
                      <input
                        type="text"
                        value={content.hero?.cta2Link || ''}
                        onChange={(e) => updateField('hero', 'cta2Link', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Trust Badges</label>
                      <button
                        onClick={() => addArrayItem('hero', 'trustBadges', {
                          icon: 'FiCheck',
                          text: 'New Badge'
                        })}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Badge
                      </button>
                    </div>
                    <div className="space-y-2">
                      {content.hero?.trustBadges?.map((badge, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 items-start">
                          <select
                            value={badge.icon}
                            onChange={(e) => {
                              const newBadges = [...content.hero.trustBadges]
                              newBadges[index].icon = e.target.value
                              setContent(prev => ({
                                ...prev,
                                hero: { ...prev.hero, trustBadges: newBadges }
                              }))
                            }}
                            className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            {availableIcons.map(icon => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={badge.text}
                            onChange={(e) => {
                              const newBadges = [...content.hero.trustBadges]
                              newBadges[index].text = e.target.value
                              setContent(prev => ({
                                ...prev,
                                hero: { ...prev.hero, trustBadges: newBadges }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <button
                            onClick={() => {
                              const newBadges = content.hero.trustBadges.filter((_, i) => i !== index)
                              setContent(prev => ({
                                ...prev,
                                hero: { ...prev.hero, trustBadges: newBadges }
                              }))
                            }}
                            className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Section */}
              {activeSection === 'stats' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-secondary-900">Statistics</h2>
                    <button
                      onClick={() => addArrayItem('stats', { value: '0', label: 'New Stat' })}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <FiPlus className="w-4 h-4" /> Add Stat
                    </button>
                  </div>
                  <div className="space-y-4">
                    {content.stats?.map((stat, index) => (
                      <div key={index} className="flex gap-4 items-start p-4 bg-secondary-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Value</label>
                            <input
                              type="text"
                              value={stat.value}
                              onChange={(e) => updateArrayItem('stats', index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="500+"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Label</label>
                            <input
                              type="text"
                              value={stat.label}
                              onChange={(e) => updateArrayItem('stats', index, 'label', e.target.value)}
                              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Companies Trust Us"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeArrayItem('stats', index)}
                          className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg mt-6"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features Section */}
              {activeSection === 'features' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">Features Section</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Title</label>
                      <input
                        type="text"
                        value={content.features?.title || ''}
                        onChange={(e) => updateField('features', 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Subtitle</label>
                      <input
                        type="text"
                        value={content.features?.subtitle || ''}
                        onChange={(e) => updateField('features', 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Feature Items</label>
                      <button
                        onClick={() => {
                          const newFeatures = [...(content.features?.items || []), {
                            icon: 'FiSmartphone',
                            title: 'New Feature',
                            description: 'Feature description'
                          }]
                          setContent(prev => ({
                            ...prev,
                            features: { ...prev.features, items: newFeatures }
                          }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Feature
                      </button>
                    </div>
                    <div className="space-y-4">
                      {content.features?.items?.map((feature, index) => (
                        <div key={index} className="p-4 bg-secondary-50 rounded-lg space-y-3">
                          <div className="flex justify-between">
                            <select
                              value={feature.icon}
                              onChange={(e) => {
                                const newItems = [...content.features.items]
                                newItems[index].icon = e.target.value
                                setContent(prev => ({
                                  ...prev,
                                  features: { ...prev.features, items: newItems }
                                }))
                              }}
                              className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              {availableIcons.map(icon => (
                                <option key={icon} value={icon}>{icon}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const newItems = content.features.items.filter((_, i) => i !== index)
                                setContent(prev => ({
                                  ...prev,
                                  features: { ...prev.features, items: newItems }
                                }))
                              }}
                              className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={feature.title}
                            onChange={(e) => {
                              const newItems = [...content.features.items]
                              newItems[index].title = e.target.value
                              setContent(prev => ({
                                ...prev,
                                features: { ...prev.features, items: newItems }
                              }))
                            }}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Feature Title"
                          />
                          <textarea
                            value={feature.description}
                            onChange={(e) => {
                              const newItems = [...content.features.items]
                              newItems[index].description = e.target.value
                              setContent(prev => ({
                                ...prev,
                                features: { ...prev.features, items: newItems }
                              }))
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Feature description"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* How It Works Section */}
              {activeSection === 'howItWorks' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">How It Works Section</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Title</label>
                      <input
                        type="text"
                        value={content.howItWorks?.title || ''}
                        onChange={(e) => updateField('howItWorks', 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Subtitle</label>
                      <input
                        type="text"
                        value={content.howItWorks?.subtitle || ''}
                        onChange={(e) => updateField('howItWorks', 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Steps</label>
                      <button
                        onClick={() => {
                          const newSteps = [...(content.howItWorks?.steps || []), {
                            step: (content.howItWorks?.steps?.length || 0) + 1,
                            title: 'New Step',
                            description: 'Step description'
                          }]
                          setContent(prev => ({
                            ...prev,
                            howItWorks: { ...prev.howItWorks, steps: newSteps }
                          }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Step
                      </button>
                    </div>
                    <div className="space-y-4">
                      {content.howItWorks?.steps?.map((step, index) => (
                        <div key={index} className="flex gap-4 items-start p-4 bg-secondary-50 rounded-lg">
                          <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                            {step.step}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => {
                                const newSteps = [...content.howItWorks.steps]
                                newSteps[index].title = e.target.value
                                setContent(prev => ({
                                  ...prev,
                                  howItWorks: { ...prev.howItWorks, steps: newSteps }
                                }))
                              }}
                              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Step Title"
                            />
                            <input
                              type="text"
                              value={step.description}
                              onChange={(e) => {
                                const newSteps = [...content.howItWorks.steps]
                                newSteps[index].description = e.target.value
                                setContent(prev => ({
                                  ...prev,
                                  howItWorks: { ...prev.howItWorks, steps: newSteps }
                                }))
                              }}
                              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Step Description"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newSteps = content.howItWorks.steps.filter((_, i) => i !== index)
                              setContent(prev => ({
                                ...prev,
                                howItWorks: { ...prev.howItWorks, steps: newSteps }
                              }))
                            }}
                            className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Testimonials Section */}
              {activeSection === 'testimonials' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">Testimonials Section</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Title</label>
                      <input
                        type="text"
                        value={content.testimonials?.title || ''}
                        onChange={(e) => updateField('testimonials', 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Subtitle</label>
                      <input
                        type="text"
                        value={content.testimonials?.subtitle || ''}
                        onChange={(e) => updateField('testimonials', 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Testimonials</label>
                      <button
                        onClick={() => {
                          const newItems = [...(content.testimonials?.items || []), {
                            name: 'New Person',
                            role: 'Role',
                            company: 'Company',
                            content: 'Testimonial content',
                            rating: 5
                          }]
                          setContent(prev => ({
                            ...prev,
                            testimonials: { ...prev.testimonials, items: newItems }
                          }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Testimonial
                      </button>
                    </div>
                    <div className="space-y-4">
                      {content.testimonials?.items?.map((item, index) => (
                        <div key={index} className="p-4 bg-secondary-50 rounded-lg space-y-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                const newItems = content.testimonials.items.filter((_, i) => i !== index)
                                setContent(prev => ({
                                  ...prev,
                                  testimonials: { ...prev.testimonials, items: newItems }
                                }))
                              }}
                              className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...content.testimonials.items]
                                newItems[index].name = e.target.value
                                setContent(prev => ({
                                  ...prev,
                                  testimonials: { ...prev.testimonials, items: newItems }
                                }))
                              }}
                              className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Name"
                            />
                            <input
                              type="text"
                              value={item.role}
                              onChange={(e) => {
                                const newItems = [...content.testimonials.items]
                                newItems[index].role = e.target.value
                                setContent(prev => ({
                                  ...prev,
                                  testimonials: { ...prev.testimonials, items: newItems }
                                }))
                              }}
                              className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Role"
                            />
                            <input
                              type="text"
                              value={item.company}
                              onChange={(e) => {
                                const newItems = [...content.testimonials.items]
                                newItems[index].company = e.target.value
                                setContent(prev => ({
                                  ...prev,
                                  testimonials: { ...prev.testimonials, items: newItems }
                                }))
                              }}
                              className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Company"
                            />
                          </div>
                          <textarea
                            value={item.content}
                            onChange={(e) => {
                              const newItems = [...content.testimonials.items]
                              newItems[index].content = e.target.value
                              setContent(prev => ({
                                ...prev,
                                testimonials: { ...prev.testimonials, items: newItems }
                              }))
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Testimonial content"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-secondary-700">Rating:</label>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => {
                                  const newItems = [...content.testimonials.items]
                                  newItems[index].rating = star
                                  setContent(prev => ({
                                    ...prev,
                                    testimonials: { ...prev.testimonials, items: newItems }
                                  }))
                                }}
                                className={`w-6 h-6 ${star <= item.rating ? 'text-warning-500' : 'text-secondary-300'}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Section */}
              {activeSection === 'integrations' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">Integrations Section</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Title</label>
                      <input
                        type="text"
                        value={content.integrations?.title || ''}
                        onChange={(e) => updateField('integrations', 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Subtitle</label>
                      <input
                        type="text"
                        value={content.integrations?.subtitle || ''}
                        onChange={(e) => updateField('integrations', 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <h3 className="font-medium text-green-800">WhatsApp Integration</h3>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={content.integrations?.whatsapp?.title || ''}
                        onChange={(e) => setContent(prev => ({
                          ...prev,
                          integrations: {
                            ...prev.integrations,
                            whatsapp: { ...prev.integrations?.whatsapp, title: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                      <textarea
                        value={content.integrations?.whatsapp?.description || ''}
                        onChange={(e) => setContent(prev => ({
                          ...prev,
                          integrations: {
                            ...prev.integrations,
                            whatsapp: { ...prev.integrations?.whatsapp, description: e.target.value }
                          }
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <h3 className="font-medium text-blue-800">Telegram Integration</h3>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={content.integrations?.telegram?.title || ''}
                        onChange={(e) => setContent(prev => ({
                          ...prev,
                          integrations: {
                            ...prev.integrations,
                            telegram: { ...prev.integrations?.telegram, title: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                      <textarea
                        value={content.integrations?.telegram?.description || ''}
                        onChange={(e) => setContent(prev => ({
                          ...prev,
                          integrations: {
                            ...prev.integrations,
                            telegram: { ...prev.integrations?.telegram, description: e.target.value }
                          }
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ Section */}
              {activeSection === 'faq' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">FAQ Section</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Title</label>
                      <input
                        type="text"
                        value={content.faq?.title || ''}
                        onChange={(e) => updateField('faq', 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Section Subtitle</label>
                      <input
                        type="text"
                        value={content.faq?.subtitle || ''}
                        onChange={(e) => updateField('faq', 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Questions</label>
                      <button
                        onClick={() => {
                          const newItems = [...(content.faq?.items || []), {
                            question: 'New Question?',
                            answer: 'Answer to the question.',
                            order: (content.faq?.items?.length || 0) + 1
                          }]
                          setContent(prev => ({
                            ...prev,
                            faq: { ...prev.faq, items: newItems }
                          }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Question
                      </button>
                    </div>
                    <div className="space-y-4">
                      {content.faq?.items?.map((item, index) => (
                        <div key={index} className="p-4 bg-secondary-50 rounded-lg space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-secondary-500">#{index + 1}</span>
                            <button
                              onClick={() => {
                                const newItems = content.faq.items.filter((_, i) => i !== index)
                                setContent(prev => ({
                                  ...prev,
                                  faq: { ...prev.faq, items: newItems }
                                }))
                              }}
                              className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={item.question}
                            onChange={(e) => {
                              const newItems = [...content.faq.items]
                              newItems[index].question = e.target.value
                              setContent(prev => ({
                                ...prev,
                                faq: { ...prev.faq, items: newItems }
                              }))
                            }}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Question"
                          />
                          <textarea
                            value={item.answer}
                            onChange={(e) => {
                              const newItems = [...content.faq.items]
                              newItems[index].answer = e.target.value
                              setContent(prev => ({
                                ...prev,
                                faq: { ...prev.faq, items: newItems }
                              }))
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Answer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Section */}
              {activeSection === 'cta' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">Call to Action Section</h2>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Headline</label>
                    <input
                      type="text"
                      value={content.cta?.headline || ''}
                      onChange={(e) => updateField('cta', 'headline', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Subtitle</label>
                    <textarea
                      value={content.cta?.subtitle || ''}
                      onChange={(e) => updateField('cta', 'subtitle', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Primary Button Text</label>
                      <input
                        type="text"
                        value={content.cta?.button1Text || ''}
                        onChange={(e) => updateField('cta', 'button1Text', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Primary Button Link</label>
                      <input
                        type="text"
                        value={content.cta?.button1Link || ''}
                        onChange={(e) => updateField('cta', 'button1Link', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Secondary Button Text</label>
                      <input
                        type="text"
                        value={content.cta?.button2Text || ''}
                        onChange={(e) => updateField('cta', 'button2Text', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Secondary Button Link</label>
                      <input
                        type="text"
                        value={content.cta?.button2Link || ''}
                        onChange={(e) => updateField('cta', 'button2Link', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Section */}
              {activeSection === 'footer' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-secondary-900">Footer Section</h2>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Brand Description</label>
                    <textarea
                      value={content.footer?.brandDescription || ''}
                      onChange={(e) => updateField('footer', 'brandDescription', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Copyright Text</label>
                    <input
                      type="text"
                      value={content.footer?.copyright || ''}
                      onChange={(e) => updateField('footer', 'copyright', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Social Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Social Links</label>
                      <button
                        onClick={() => {
                          const newLinks = [...(content.footer?.socialLinks || []), { platform: 'new', url: '#' }]
                          setContent(prev => ({
                            ...prev,
                            footer: { ...prev.footer, socialLinks: newLinks }
                          }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Social
                      </button>
                    </div>
                    <div className="space-y-2">
                      {content.footer?.socialLinks?.map((link, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={link.platform}
                            onChange={(e) => {
                              const newLinks = [...content.footer.socialLinks]
                              newLinks[index].platform = e.target.value
                              setContent(prev => ({
                                ...prev,
                                footer: { ...prev.footer, socialLinks: newLinks }
                              }))
                            }}
                            className="w-full sm:w-36 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="twitter">Twitter/X</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="youtube">YouTube</option>
                            <option value="github">GitHub</option>
                          </select>
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) => {
                              const newLinks = [...content.footer.socialLinks]
                              newLinks[index].url = e.target.value
                              setContent(prev => ({
                                ...prev,
                                footer: { ...prev.footer, socialLinks: newLinks }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="https://..."
                          />
                          <button
                            onClick={() => {
                              const newLinks = content.footer.socialLinks.filter((_, i) => i !== index)
                              setContent(prev => ({
                                ...prev,
                                footer: { ...prev.footer, socialLinks: newLinks }
                              }))
                            }}
                            className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Product Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-secondary-700">Product Links</label>
                      <button
                        onClick={() => {
                          const newLinks = [...(content.footer?.productLinks || []), { text: 'New Link', url: '#' }]
                          setContent(prev => ({
                            ...prev,
                            footer: { ...prev.footer, productLinks: newLinks }
                          }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiPlus className="w-4 h-4" /> Add Link
                      </button>
                    </div>
                    <div className="space-y-2">
                      {content.footer?.productLinks?.map((link, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={link.text}
                            onChange={(e) => {
                              const newLinks = [...content.footer.productLinks]
                              newLinks[index].text = e.target.value
                              setContent(prev => ({
                                ...prev,
                                footer: { ...prev.footer, productLinks: newLinks }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Link Text"
                          />
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) => {
                              const newLinks = [...content.footer.productLinks]
                              newLinks[index].url = e.target.value
                              setContent(prev => ({
                                ...prev,
                                footer: { ...prev.footer, productLinks: newLinks }
                              }))
                            }}
                            className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="URL"
                          />
                          <button
                            onClick={() => {
                              const newLinks = content.footer.productLinks.filter((_, i) => i !== index)
                              setContent(prev => ({
                                ...prev,
                                footer: { ...prev.footer, productLinks: newLinks }
                              }))
                            }}
                            className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Contact Information</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-secondary-500 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={content.footer?.contact?.phone || ''}
                          onChange={(e) => {
                            const newContact = { ...(content.footer?.contact || {}), phone: e.target.value }
                            setContent(prev => ({
                              ...prev,
                              footer: { ...prev.footer, contact: newContact }
                            }))
                          }}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="+91 9876543210"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-500 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={content.footer?.contact?.email || ''}
                          onChange={(e) => {
                            const newContact = { ...(content.footer?.contact || {}), email: e.target.value }
                            setContent(prev => ({
                              ...prev,
                              footer: { ...prev.footer, contact: newContact }
                            }))
                          }}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="contact@example.com"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-secondary-500 mt-2">These contact details will appear in the footer.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LandingContent