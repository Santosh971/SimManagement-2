import { useState, useEffect } from 'react'
import { countryCodes, getDialCode } from '../../data/countries'
import { CountryCodeSelect } from './'

/**
 * PhoneInput Component
 * A reusable phone input with country code dropdown (with flag images) and number input.
 * Uses CountryCodeSelect instead of native <select> for proper flag rendering on all OSes.
 *
 * @param {string} value - The full phone number (e.g., "+919876543210")
 * @param {function} onChange - Callback with the full phone number
 * @param {string} label - Label text (default: "Phone")
 * @param {boolean} required - Whether the field is required
 * @param {string} placeholder - Placeholder for number input
 * @param {string} className - Additional class names
 * @param {object} style - Additional inline styles for the wrapper
 */
export default function PhoneInput({
  value = '',
  onChange,
  label = 'Phone',
  required = false,
  placeholder = 'Phone number',
  className = '',
  style = {},
}) {
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNumber, setPhoneNumber] = useState('')

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
    const fullPhone = phoneNumber ? newCountryCode + phoneNumber : ''
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
          placeholder={placeholder}
          maxLength="15"
          style={{
            flex: 1,
            minWidth: '0',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}