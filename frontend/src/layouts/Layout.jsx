import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content area */}
      <div className="main-content" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Page content - Outlet renders nested routes */}
        <main style={{ padding: '24px' }}>
          <Outlet />
        </main>
      </div>

      {/* CSS for sidebar offset on large screens */}
      <style>{`
        @media (min-width: 1024px) {
          .main-content {
            margin-left: 256px;
          }
        }
      `}</style>
    </div>
  )
}