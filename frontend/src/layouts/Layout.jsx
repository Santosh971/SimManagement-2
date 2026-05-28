import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  // Handle resize - auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (!desktop) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content area */}
      <div
        style={{
          minHeight: '100vh',
          marginLeft: isDesktop && sidebarOpen ? '256px' : '0',
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
        {/* Header */}
        <Header sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

        {/* Page content - Outlet renders nested routes */}
        <main style={{ padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}