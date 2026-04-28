import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  FiSave,
  FiRefreshCw,
  FiFileText,
  FiEdit3,
} from 'react-icons/fi'
import {
  PageContainer,
  PageHeader,
  Card,
  CardBody,
  Button,
  Spinner,
} from '../components/ui'

const LegalPages = () => {
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pages, setPages] = useState([])
  const [activePage, setActivePage] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    metaDescription: '',
  })

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      setLoading(true)
      const response = await api.get('/pages')
      setPages(response.data.data || [])

      // Set first page as active if available
      if (response.data.data?.length > 0 && !activePage) {
        loadPageDetails(response.data.data[0].slug)
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
      toast.error('Failed to load pages')

      // Try to initialize pages
      await initializePages()
    } finally {
      setLoading(false)
    }
  }

  const loadPageDetails = async (slug) => {
    try {
      const response = await api.get(`/pages/details/${slug}`)
      const page = response.data.data
      setActivePage(page)
      setEditForm({
        title: page.title || '',
        content: page.content || '',
        metaDescription: page.metaDescription || '',
      })
    } catch (error) {
      console.error('Error loading page details:', error)
      toast.error('Failed to load page details')
    }
  }

  const initializePages = async () => {
    try {
      await api.post('/pages/initialize')
      toast.success('Default pages initialized')
      fetchPages()
    } catch (error) {
      console.error('Error initializing pages:', error)
    }
  }

  const handlePageSelect = (slug) => {
    loadPageDetails(slug)
  }

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const savePage = async () => {
    if (!activePage) return

    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setSaving(true)
      await api.put(`/pages/${activePage.slug}`, editForm)
      toast.success('Page saved successfully')

      // Update local state
      setActivePage(prev => ({
        ...prev,
        ...editForm,
      }))

      // Update pages list
      setPages(prev =>
        prev.map(p =>
          p.slug === activePage.slug
            ? { ...p, title: editForm.title, metaDescription: editForm.metaDescription }
            : p
        )
      )
    } catch (error) {
      console.error('Error saving page:', error)
      toast.error('Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Legal Pages"
        description="Manage Privacy Policy, Terms of Service, and other legal pages"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Pages List */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardBody className="p-0">
              <nav className="divide-y divide-secondary-200">
                {pages.map(page => (
                  <button
                    key={page.slug}
                    onClick={() => handlePageSelect(page.slug)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      activePage?.slug === page.slug
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-600 hover:bg-secondary-50'
                    }`}
                  >
                    <FiFileText className="w-4 h-4" />
                    <span className="font-medium text-sm">{page.title}</span>
                  </button>
                ))}
              </nav>
            </CardBody>
          </Card>

          <div className="mt-4 text-xs text-secondary-500 px-2">
            <p>Legal pages are publicly accessible at:</p>
            <ul className="mt-2 space-y-1">
              {pages.map(page => (
                <li key={page.slug} className="text-primary-600">
                  /{page.slug}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          {activePage ? (
            <Card>
              <CardBody>
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-secondary-200 pb-4">
                    <div className="flex items-center gap-3">
                      <FiEdit3 className="w-5 h-5 text-primary-600" />
                      <h2 className="text-lg font-semibold text-secondary-900">
                        Edit {activePage.title}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => loadPageDetails(activePage.slug)}
                      >
                        <FiRefreshCw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={savePage}
                        loading={saving}
                      >
                        <FiSave className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Page Title
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Privacy Policy"
                    />
                  </div>

                  {/* Meta Description */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Meta Description
                    </label>
                    <input
                      type="text"
                      value={editForm.metaDescription}
                      onChange={(e) => handleFormChange('metaDescription', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Brief description for SEO"
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      This appears in search engine results
                    </p>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Page Content (HTML)
                    </label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => handleFormChange('content', e.target.value)}
                      rows={20}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                      placeholder="<h1>Your Content Here</h1>..."
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Use HTML tags like &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt; for formatting
                    </p>
                  </div>

                  {/* Preview Section */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Preview
                    </label>
                    <div
                      className="border border-secondary-200 rounded-lg p-4 bg-secondary-50 max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: editForm.content }}
                    />
                  </div>

                  {/* Last Updated */}
                  {activePage.updatedAt && (
                    <p className="text-xs text-secondary-500">
                      Last updated: {new Date(activePage.updatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}

                  {/* Styles for preview */}
                  <style>{`
                    .preview-content h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
                    .preview-content h2 { font-size: 18px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; }
                    .preview-content p { margin-bottom: 12px; line-height: 1.6; }
                    .preview-content ul { margin-bottom: 12px; padding-left: 20px; }
                    .preview-content li { margin-bottom: 6px; }
                  `}</style>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="text-center py-12 text-secondary-500">
                  <FiFileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a page from the list to edit</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

export default LegalPages