import { useState, useEffect, useRef } from 'react'
import { countryCodes, getFlagUrl } from '../../data/countries'

/**
 * CountryCodeSelect — A custom dropdown that shows flag images alongside
 * country codes. Native <select>/<option> cannot render images on Windows,
 * so this custom component replaces it.
 *
 * @param {string} value - Current country code (e.g., '+91')
 * @param {function} onChange - Callback with selected country code
 * @param {object} style - Additional inline styles for the wrapper
 */
export default function CountryCodeSelect({ value, onChange, style = {} }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  const selected = countryCodes.find(c => c.code === value) || countryCodes[0]

  // Filter countries by search
  const filtered = search
    ? countryCodes.filter(c =>
        c.country.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search)
      )
    : countryCodes

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (code) => {
    onChange({ target: { name: 'countryCode', value: code } })
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0, ...style }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '160px',
          padding: '10px 8px',
          border: '1px solid #d1d5db',
          borderRadius: isOpen ? '8px 8px 0 0' : '8px',
          fontSize: '14px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src={getFlagUrl(selected.iso)}
            alt={selected.iso}
            style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span>{selected.code}</span>
        </span>
        <span style={{ fontSize: '10px', color: '#6b7280' }}>▼</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 9999,
          width: '280px',
          maxHeight: '300px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          border: '1px solid #d1d5db',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Country list */}
          <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                No countries found
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.code + c.country}
                  onClick={() => handleSelect(c.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: c.code === value ? '#eff6ff' : 'transparent',
                    fontSize: '14px',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = c.code === value ? '#eff6ff' : 'transparent' }}
                >
                  <img
                    src={getFlagUrl(c.iso)}
                    alt={c.iso}
                    style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <span style={{ fontWeight: '500', color: '#374151' }}>{c.code}</span>
                  <span style={{ color: '#6b7280' }}>{c.country}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}