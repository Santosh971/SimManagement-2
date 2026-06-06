import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { Spinner } from '../components/ui'
import { formatDate } from '../utils/dateFormat'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function LegalPage({ slug }) {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPage()
  }, [slug])

  const fetchPage = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/pages/${slug}`)

      if (!response.ok) {
        throw new Error('Page not found')
      }

      const data = await response.json()
      setPage(data.data)
    } catch (err) {
      console.error('Error fetching page:', err)
      setError('Page not found')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Page Not Found</h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          <FiArrowLeft /> Go Home
        </Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <FiArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '896px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '8px',
          lineHeight: 1.2,
        }}>
          {page.title}
        </h1>

        {page.metaDescription && (
          <p style={{
            fontSize: '16px',
            color: '#64748b',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}>
            {page.metaDescription}
          </p>
        )}

        <div
          className="legal-content"
          style={{
            color: '#334155',
            lineHeight: 1.8,
            fontSize: '15px',
          }}
          onClick={(e) => {
            const anchor = e.target.closest('a')
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href) return
            // Explicitly handle protocol links (mailto:, tel:) to ensure
            // the browser triggers the correct handler when rendered
            // inside dangerouslySetInnerHTML content
            if (href.startsWith('mailto:') || href.startsWith('tel:')) {
              e.preventDefault()
              window.location.href = href
            }
          }}
          dangerouslySetInnerHTML={{ __html: page.content }}
        />

        {page.updatedAt && (
          <p style={{
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#94a3b8',
          }}>
            Last updated: {formatDate(page.updatedAt)}
          </p>
        )}
      </div>

      {/* Styles for rendered HTML content */}
      <style>{`
        .legal-content h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          margin-top: 0;
        }
        .legal-content h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin-top: 32px;
          margin-bottom: 12px;
        }
        .legal-content h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-top: 24px;
          margin-bottom: 8px;
        }
        .legal-content p {
          margin-bottom: 16px;
        }
        .legal-content ul, .legal-content ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }
        .legal-content li {
          margin-bottom: 8px;
        }
        .legal-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .legal-content a:hover {
          color: #1d4ed8;
        }
        .legal-content strong {
          font-weight: 600;
          color: #0f172a;
        }
      `}</style>
    </div>
  )
}