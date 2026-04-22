import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiUser, FiLock, FiBell, FiGlobe, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Button,
} from '../components/ui'

export default function Settings() {
  const { user, updateProfile, changePassword } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [preferences, setPreferences] = useState({
    emailNotifications: user?.preferences?.notifications?.email ?? true,
    inAppNotifications: user?.preferences?.notifications?.inApp ?? true,
    timezone: user?.preferences?.timezone || 'Asia/Kolkata',
    language: user?.preferences?.language || 'en',
  })
  const [loading, setLoading] = useState(false)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile(profileData)
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile({ preferences })
      toast.success('Preferences updated')
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'security', label: 'Security', icon: FiLock },
    // { id: 'notifications', label: 'Notifications', icon: FiBell },
    // { id: 'preferences', label: 'Preferences', icon: FiGlobe },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Card>
            <CardBody>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Profile Information</h3>
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#f9fafb',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', margin: 0 }}>Email cannot be changed</p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <Button type="submit" loading={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )
      case 'security':
        return (
          <Card>
            <CardBody>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Change Password</h3>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
                <Button type="submit" loading={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )
      case 'notifications':
        return (
          <Card>
            <CardBody>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Notification Preferences</h3>
              <form onSubmit={handlePreferencesSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <p style={{ fontWeight: '500', margin: 0 }}>Email Notifications</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Receive notifications via email</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      backgroundColor: preferences.emailNotifications ? '#16a34a' : '#d1d5db',
                      borderRadius: '24px',
                      transition: 'background-color 0.2s',
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        left: preferences.emailNotifications ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }} />
                    </span>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <p style={{ fontWeight: '500', margin: 0 }}>In-App Notifications</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Receive notifications in the app</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preferences.inAppNotifications}
                      onChange={(e) => setPreferences({ ...preferences, inAppNotifications: e.target.checked })}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      backgroundColor: preferences.inAppNotifications ? '#16a34a' : '#d1d5db',
                      borderRadius: '24px',
                      transition: 'background-color 0.2s',
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        left: preferences.inAppNotifications ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }} />
                    </span>
                  </label>
                </div>
                <Button type="submit" loading={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )
      case 'preferences':
        return (
          <Card>
            <CardBody>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Regional Settings</h3>
              <form onSubmit={handlePreferencesSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Timezone
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' }}>
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <Button type="submit" loading={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Responsive tabs on top for mobile, sidebar on larger screens */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tabs */}
          <Card style={{ width: '100%' }}>
            <CardBody style={{ padding: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: activeTab === tab.id ? '#2563eb' : '#475569',
                      backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                    }}
                  >
                    <tab.icon style={{ width: '18px', height: '18px' }} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}