// import { Link, useLocation } from 'react-router-dom'
// import { useAuth } from '../context/AuthContext'
// import {
//   FiHome,
//   FiCreditCard,
//   FiPhone,
//   FiBell,
//   FiSettings,
//   FiUsers,
//   FiPackage,
//   FiSmartphone,
//   FiFileText,
//   FiX,
// } from 'react-icons/fi'

// const navigation = [
//   { name: 'Dashboard', href: '/dashboard', icon: FiHome },
//   { name: 'SIMs', href: '/sims', icon: FiSmartphone },
//   { name: 'Recharges', href: '/recharges', icon: FiCreditCard },
//   { name: 'Call Logs', href: '/call-logs', icon: FiPhone },
//   { name: 'Reports', href: '/reports', icon: FiFileText },
//   { name: 'Notifications', href: '/notifications', icon: FiBell },
//   { name: 'Settings', href: '/settings', icon: FiSettings },
// ]

// const adminNavigation = [
//   { name: 'Companies', href: '/companies', icon: FiUsers },
//   { name: 'Subscriptions', href: '/subscriptions', icon: FiPackage },
// ]

// export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
//   const { user } = useAuth()
//   const location = useLocation()

//   const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/')

//   // Check if screen is large (for sidebar visibility)
//   const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1024

//   return (
//     <>
//       {/* Mobile overlay */}
//       {sidebarOpen && (
//         <div
//           style={{
//             position: 'fixed',
//             inset: 0,
//             zIndex: 40,
//             backgroundColor: 'rgba(15, 23, 42, 0.5)'
//           }}
//           className="lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside
//         style={{
//           position: 'fixed',
//           top: 0,
//           left: 0,
//           zIndex: 50,
//           height: '100%',
//           width: '256px',
//           backgroundColor: '#ffffff',
//           borderRight: '1px solid #e2e8f0',
//           // Hide on mobile by default, show on large screens
//           transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
//           transition: 'transform 200ms ease-in-out'
//         }}
//         className="lg:transform-none"
//       >
//         {/* Logo */}
//         <div style={{
//           height: '64px',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           padding: '0 16px',
//           borderBottom: '1px solid #e2e8f0'
//         }}>
//           <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//             <div style={{
//               width: '32px',
//               height: '32px',
//               backgroundColor: '#2563eb',
//               borderRadius: '8px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center'
//             }}>
//               <FiSmartphone style={{ width: '20px', height: '20px', color: 'white' }} />
//             </div>
//             <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>SIM Manager</span>
//           </Link>
//           <button
//             style={{ padding: '8px', borderRadius: '8px' }}
//             className="lg:hidden hover:bg-gray-100"
//             onClick={() => setSidebarOpen(false)}
//           >
//             <FiX style={{ width: '20px', height: '20px' }} />
//           </button>
//         </div>

//         {/* Navigation */}
//         <nav style={{ padding: '16px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
//           {navigation.map((item) => (
//             <Link
//               key={item.name}
//               to={item.href}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '12px',
//                 padding: '12px 16px',
//                 borderRadius: '8px',
//                 color: isActive(item.href) ? '#2563eb' : '#475569',
//                 backgroundColor: isActive(item.href) ? '#eff6ff' : 'transparent',
//                 marginBottom: '4px',
//                 textDecoration: 'none'
//               }}
//               className="hover:bg-gray-100"
//             >
//               <item.icon style={{ width: '20px', height: '20px' }} />
//               <span>{item.name}</span>
//             </Link>
//           ))}

//           {/* Admin Navigation */}
//           {user?.role === 'super_admin' && (
//             <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #e2e8f0' }}>
//               <p style={{
//                 padding: '0 16px',
//                 fontSize: '12px',
//                 fontWeight: '600',
//                 color: '#94a3b8',
//                 textTransform: 'uppercase',
//                 letterSpacing: '0.05em',
//                 marginBottom: '8px'
//               }}>
//                 Administration
//               </p>
//               {adminNavigation.map((item) => (
//                 <Link
//                   key={item.name}
//                   to={item.href}
//                   style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '12px',
//                     padding: '12px 16px',
//                     borderRadius: '8px',
//                     color: isActive(item.href) ? '#2563eb' : '#475569',
//                     backgroundColor: isActive(item.href) ? '#eff6ff' : 'transparent',
//                     marginBottom: '4px',
//                     textDecoration: 'none'
//                   }}
//                   className="hover:bg-gray-100"
//                 >
//                   <item.icon style={{ width: '20px', height: '20px' }} />
//                   <span>{item.name}</span>
//                 </Link>
//               ))}
//             </div>
//           )}
//         </nav>
//       </aside>

//       {/* CSS to show sidebar on large screens */}
//       <style>{`
//         @media (min-width: 1024px) {
//           aside {
//             transform: translateX(0) !important;
//           }
//         }
//       `}</style>
//     </>
//   )
// }

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
  FiActivity,
  FiMessageCircle,
} from 'react-icons/fi'

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { user } = useAuth()
  const location = useLocation()

  // Role Based Navigation
  const getNavigationByRole = () => {
    switch (user?.role) {
      case 'super_admin':
        return [
          { name: 'Dashboard', href: '/app/dashboard', icon: FiHome },
          { name: 'Companies', href: '/app/companies', icon: FiUsers },
          { name: 'Subscriptions', href: '/app/subscriptions', icon: FiPackage },
          { name: 'Audit Logs', href: '/app/audit-logs', icon: FiActivity },
          { name: 'Notifications', href: '/app/notifications', icon: FiBell },
          { name: 'Settings', href: '/app/settings', icon: FiSettings },
        ]

      case 'admin':
        return [
          { name: 'Dashboard', href: '/app/dashboard', icon: FiHome },
          { name: 'SIMs', href: '/app/sims', icon: FiSmartphone },
          { name: 'Recharges', href: '/app/recharges', icon: FiCreditCard },
          { name: 'Call Logs', href: '/app/call-logs', icon: FiPhone },
          { name: 'WhatsApp', href: '/app/whatsapp', icon: FiMessageCircle },
          { name: 'Users', href: '/app/users', icon: FiUsers },
          { name: 'Reports', href: '/app/reports', icon: FiFileText },
          { name: 'Subscription', href: '/app/subscription', icon: FiPackage },
          { name: 'Audit Logs', href: '/app/audit-logs', icon: FiActivity },
          { name: 'Notifications', href: '/app/notifications', icon: FiBell },
          { name: 'Settings', href: '/app/settings', icon: FiSettings },
        ]

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
          <Link to="/app/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <FiSmartphone className="text-white text-lg" />
            </div>

            <span className="text-xl font-bold text-slate-900">
              SIM Manager
            </span>
          </Link>

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