import { useState, useEffect } from 'react'

// Country codes list for phone input
const countryCodes = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+971', country: 'United Arab Emirates' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+974', country: 'Qatar' },
  { code: '+965', country: 'Kuwait' },
  { code: '+973', country: 'Bahrain' },
  { code: '+968', country: 'Oman' },
  { code: '+61', country: 'Australia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+82', country: 'South Korea' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+66', country: 'Thailand' },
  { code: '+63', country: 'Philippines' },
  { code: '+62', country: 'Indonesia' },
  { code: '+92', country: 'Pakistan' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+977', country: 'Nepal' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+27', country: 'South Africa' },
  { code: '+234', country: 'Nigeria' },
  { code: '+20', country: 'Egypt' },
  { code: '+55', country: 'Brazil' },
  { code: '+52', country: 'Mexico' },
  { code: '+7', country: 'Russia' },
  { code: '+90', country: 'Turkey' },
]

/**
 * PhoneInput Component
 * A reusable phone input with country code dropdown and number input.
 * Matches the style used in SIMs.jsx for Mobile Number field.
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
    let cCode = '+91'

    // If value starts with +, extract country code
    if (phoneNum.startsWith('+')) {
      const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
      for (const cc of sortedCodes) {
        if (phoneNum.startsWith(cc.code)) {
          cCode = cc.code
          phoneNum = phoneNum.substring(cc.code.length).trim()
          break
        }
      }
    }

    setCountryCode(cCode)
    setPhoneNumber(phoneNum)
  }, [value])

  // Handle country code change
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
      <style>{`
        .phone-input-wrapper {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 480px) {
          .phone-input-wrapper {
            flex-direction: column;
          }
          .phone-country-select {
            width: 100% !important;
          }
        }
        @media (min-width: 481px) {
          .phone-input-wrapper {
            flex-wrap: nowrap;
          }
          .phone-country-select {
            width: 100px !important;
            min-width: 80px;
            flex-shrink: 0;
          }
        }
      `}</style>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
          {label}
          {required && ' *'}
        </label>
      )}
      <div className="phone-input-wrapper">
        <select
          value={countryCode}
          onChange={handleCountryCodeChange}
          className="phone-country-select"
          style={{
            padding: '10px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          {countryCodes.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.country}
            </option>
          ))}
        </select>
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