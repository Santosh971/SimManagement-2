

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import { useState, useEffect } from 'react'
import {
  FiHome,
  FiCreditCard,
  FiPhone,
  FiBell,
  FiSettings,
  FiUsers,
  FiPackage,
  FiSmartphone,
  FiFileText,
  FiX,
  FiClipboard,
  FiMessageCircle,
  FiSend,
  FiMessageSquare,
  FiWifi,
  FiLayout,
  FiDollarSign,
  FiFile,
  FiPhoneOutgoing, // [CALL AUTOMATION]
} from 'react-icons/fi'
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa'

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { user, api } = useAuth()
  const location = useLocation()
  const [subscriptionFeatures, setSubscriptionFeatures] = useState(null)

  // Fetch subscription features for admin users
  useEffect(() => {
    const fetchSubscriptionFeatures = async () => {
      if (user?.role === 'admin' && user?.companyId) {
        try {
          const response = await api.get('/companies/my-subscription')
          const features = response.data?.data?.plan?.features || {}
          setSubscriptionFeatures(features)
        } catch (error) {
          console.error('Failed to fetch subscription features:', error)
        }
      }
    }
    fetchSubscriptionFeatures()
  }, [user, api])

  // Role Based Navigation
  const getNavigationByRole = () => {
    switch (user?.role) {
      case 'super_admin':
        return [
          { name: 'Dashboard', href: '/app/dashboard', icon: FiHome },
          { name: 'Companies', href: '/app/companies', icon: FiUsers },
          { name: 'Subscriptions', href: '/app/subscriptions', icon: FiPackage },
          { name: 'Payment History', href: '/app/payment-history', icon: FiDollarSign },
          { name: 'Landing Content', href: '/app/landing-content', icon: FiLayout },
          { name: 'Legal Pages', href: '/app/legal-pages', icon: FiFile },
          { name: 'Audit Logs', href: '/app/audit-logs', icon: FiClipboard },
          { name: 'Notifications', href: '/app/notifications', icon: FiBell },
          { name: 'Settings', href: '/app/settings', icon: FiSettings },
        ]

      case 'admin': {
        const navItems = [
          { name: 'Dashboard', href: '/app/dashboard', icon: FiHome },
          { name: 'SIMs', href: '/app/sims', icon: FiSmartphone },
          { name: 'Recharges', href: '/app/recharges', icon: FiCreditCard },
          { name: 'Call Logs', href: '/app/call-logs', icon: FiPhone },
          { name: 'SMS Logs', href: '/app/sms', icon: FiMessageSquare, feature: 'smsLogs' },
          { name: 'WhatsApp', href: '/app/whatsapp', icon: FaWhatsapp, feature: 'whatsappStatus' },
          { name: 'Telegram', href: '/app/telegram', icon: FaTelegramPlane, feature: 'telegramStatus' },
          { name: 'WiFi Monitor', href: '/app/wifi-monitor', icon: FiWifi, feature: 'wifiMonitor' },
          // { name: 'WiFi Devices', href: '/app/wifi-devices', icon: FiSmartphone },
          { name: 'Call Automation', href: '/app/call-automation', icon: FiPhoneOutgoing, feature: 'callAutomation' },
          { name: 'Users', href: '/app/users', icon: FiUsers },
          { name: 'Reports', href: '/app/reports', icon: FiFileText },
          { name: 'Subscription', href: '/app/subscription', icon: FiPackage },
          { name: 'Audit Logs', href: '/app/audit-logs', icon: FiClipboard },
          { name: 'Notifications', href: '/app/notifications', icon: FiBell },
          { name: 'Settings', href: '/app/settings', icon: FiSettings },
        ]

        // Filter out items based on subscription features
        return navItems.filter(item => {
          if (!item.feature) return true
          // Show item only if feature is enabled (or features not loaded yet - will show until filtered)
          if (subscriptionFeatures === null) return true
          return subscriptionFeatures[item.feature] === true
        })
      }

      case 'user':
        return [
          { name: 'Dashboard', href: '/app/dashboard', icon: FiHome },
          { name: 'My SIMs', href: '/app/my-sims', icon: FiSmartphone },
          { name: 'My Logs', href: '/app/my-logs', icon: FiPhone },
          { name: 'Notifications', href: '/app/notifications', icon: FiBell },
          { name: 'Settings', href: '/app/settings', icon: FiSettings },
        ]

      default:
        return []
    }
  }

  const navigation = getNavigationByRole()

  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
          <Logo
            linkTo="/app/dashboard"
            size="default"
            variant="dark"
          />

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive(item.href)
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <item.icon className="text-lg" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}