import { useState, useEffect } from 'react'
import { countryCodes, getDialCode } from '../../data/countries'
import { CountryCodeSelect } from './'

/**
 * PhoneInput Component
 * A reusable phone input with country code dropdown (with flag images) and number input.
 * Uses CountryCodeSelect instead of native <select> for proper flag rendering on all OSes.
 *
 * Dynamic maxLength based on country code (matches SIMs form pattern):
 *   - +91 (India): max 10 digits
 *   - Other countries: max 15 - (country code digit count)
 *
 * @param {string} value - The full phone number (e.g., "+919876543210")
 * @param {function} onChange - Callback with the full phone number
 * @param {string} label - Label text (default: "Phone")
 * @param {boolean} required - Whether the field is required
 * @param {string} placeholder - Placeholder for number input
 * @param {string} error - Error message to display below the input (also turns border red)
 * @param {function} onBlur - Blur handler for the phone number input
 * @param {string} className - Additional class names
 * @param {object} style - Additional inline styles for the wrapper
 */
export default function PhoneInput({
  value = '',
  onChange,
  onBlur,
  label = 'Phone',
  required = false,
  placeholder = 'Phone number',
  error,
  className = '',
  style = {},
}) {
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNumber, setPhoneNumber] = useState('')

  // Compute maxLength based on country code (same logic as SIMs Add form)
  const maxPhoneLength = countryCode === '+91' ? 10 : 15 - (countryCode.length - 1)

  // Parse value into country code and phone number
  useEffect(() => {
    if (!value) {
      setCountryCode('+91')
      setPhoneNumber('')
      return
    }

    let phoneNum = value
    const dialCode = getDialCode(value)
    if (dialCode) {
      setCountryCode(dialCode)
      phoneNum = value.substring(dialCode.length).trim()
    } else {
      setCountryCode('+91')
    }

    setPhoneNumber(phoneNum)
  }, [value])

  // Handle country code change (from CountryCodeSelect, which passes synthetic event)
  const handleCountryCodeChange = (e) => {
    const newCountryCode = e.target.value
    setCountryCode(newCountryCode)
    // Truncate phone number if it exceeds the new country's maxLength
    const newMaxLen = newCountryCode === '+91' ? 10 : 15 - (newCountryCode.length - 1)
    const trimmedPhone = phoneNumber.length > newMaxLen ? phoneNumber.substring(0, newMaxLen) : phoneNumber
    setPhoneNumber(trimmedPhone)
    const fullPhone = trimmedPhone ? newCountryCode + trimmedPhone : ''
    onChange(fullPhone)
  }

  // Handle phone number change (digits only)
  const handlePhoneNumberChange = (e) => {
    const newPhoneNumber = e.target.value.replace(/\D/g, '')
    setPhoneNumber(newPhoneNumber)
    const fullPhone = newPhoneNumber ? countryCode + newPhoneNumber : ''
    onChange(fullPhone)
  }

  return (
    <div className={className} style={style}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          {label}
          {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <CountryCodeSelect
          value={countryCode}
          onChange={handleCountryCodeChange}
        />
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxPhoneLength}
          style={{
            flex: 1,
            minWidth: '0',
            padding: '10px 14px',
            border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}