import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiSmartphone,
  FiCreditCard,
  FiBell,
  FiBarChart2,
  FiUsers,
  FiShield,
  FiCheck,
  FiArrowRight,
  FiPlay,
  FiStar,
  FiChevronDown,
  FiChevronUp,
  FiMenu,
  FiX,
} from 'react-icons/fi'
import { FaWhatsapp, FaTelegram } from 'react-icons/fa'

// Static Data
const features = [
  {
    icon: FiSmartphone,
    title: 'SIM Management',
    description: 'Manage all your SIM cards in one place. Track operators, circles, status, and assignments effortlessly.',
  },
  {
    icon: FiCreditCard,
    title: 'Recharge Tracking',
    description: 'Never miss a recharge. Get reminders before expiry and track all recharge history with detailed analytics.',
  },
  {
    icon: FiBell,
    title: 'Smart Notifications',
    description: 'Automated alerts for recharge due dates, inactive SIMs, and subscription expiry. Stay informed always.',
  },
  {
    icon: FiBarChart2,
    title: 'Call Log Analytics',
    description: 'Sync call logs from mobile devices and analyze call patterns, durations, and contact frequency.',
  },
  {
    icon: FiUsers,
    title: 'Multi-User Access',
    description: 'Role-based access control. Admins manage everything, users sync call logs via mobile app.',
  },
  {
    icon: FiShield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with JWT authentication, encrypted data, and role-based permissions.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    description: 'Perfect for small businesses',
    features: [
      'Up to 10 SIMs',
      'Up to 5 Users',
      'Call Log Sync',
      'Email Notifications',
      'Basic Reports',
      'Excel Export',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '₹2,499',
    period: '/month',
    description: 'Best for growing companies',
    features: [
      'Up to 50 SIMs',
      'Up to 20 Users',
      'Everything in Starter',
      'WhatsApp/Telegram Status',
      'Advanced Reports',
      'Priority Support',
      'API Access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₹4,999',
    period: '/month',
    description: 'For large organizations',
    features: [
      'Unlimited SIMs',
      'Unlimited Users',
      'Everything in Professional',
      'Custom Integrations',
      'Dedicated Support',
      'SLA Guarantee',
      'On-premise Option',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const stats = [
  { value: '500+', label: 'Companies Trust Us' },
  { value: '50K+', label: 'SIMs Managed' },
  { value: '1M+', label: 'Call Logs Synced' },
  { value: '99.9%', label: 'Uptime Guarantee' },
]

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Operations Manager',
    company: 'TechConnect Solutions',
    content: 'SIM Manager has transformed how we manage our company SIMs. The recharge reminders alone have saved us thousands in missed recharges.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'IT Administrator',
    company: 'Global Communications',
    content: 'The call log sync feature is brilliant. We can now track all company calls in one dashboard. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Amit Patel',
    role: 'Business Owner',
    company: 'Smart Telecom',
    content: 'Finally, a simple yet powerful SIM management solution. The mobile app makes call log syncing effortless.',
    rating: 5,
  },
]

const faqs = [
  {
    question: 'What is SIM Management SaaS?',
    answer: 'SIM Management SaaS is a cloud-based platform that helps businesses manage their SIM cards, track recharges, sync call logs, and monitor messaging app statuses all in one place.',
  },
  {
    question: 'How does the mobile app work?',
    answer: 'Our mobile app (Android) automatically syncs call logs from registered devices to your dashboard. Simply install the app, verify your number via OTP, and grant call log permission.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use industry-standard encryption, JWT authentication, and role-based access control. Your data is stored securely in the cloud with regular backups.',
  },
  {
    question: 'Can I track WhatsApp/Telegram status?',
    answer: 'Yes! Professional and Enterprise plans include WhatsApp and Telegram status tracking for your managed SIMs.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major payment methods including Credit/Debit Cards, UPI, Net Banking, and Wallets through Razorpay.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
  },
]

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [openFaq, setOpenFaq] = React.useState(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-secondary-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <FiSmartphone className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-secondary-900">SIM Manager</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-secondary-600 hover:text-primary-600 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-secondary-600 hover:text-primary-600 transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-secondary-600 hover:text-primary-600 transition-colors">
                Testimonials
              </a>
              <a href="#faq" className="text-secondary-600 hover:text-primary-600 transition-colors">
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-secondary-600 hover:text-primary-600 font-medium transition-colors">
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-secondary-600"
            >
              {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-secondary-200">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-2 text-secondary-600 hover:text-primary-600">
                Features
              </a>
              <a href="#pricing" className="block py-2 text-secondary-600 hover:text-primary-600">
                Pricing
              </a>
              <a href="#testimonials" className="block py-2 text-secondary-600 hover:text-primary-600">
                Testimonials
              </a>
              <a href="#faq" className="block py-2 text-secondary-600 hover:text-primary-600">
                FAQ
              </a>
              <div className="pt-4 border-t border-secondary-200 space-y-3">
                <Link to="/login" className="block py-2 text-secondary-600 font-medium">
                  Sign In
                </Link>
                <Link to="/register" className="block py-2 text-center bg-primary-600 text-white rounded-lg font-medium">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <FiStar className="w-4 h-4" />
              <span>Trusted by 500+ Companies</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary-900 leading-tight mb-6">
              Manage All Your{' '}
              <span className="text-primary-600">SIM Cards</span>{' '}
              in One Place
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
              Track recharges, sync call logs, monitor messaging apps, and manage your entire SIM inventory with our powerful cloud platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
              >
                Start Free Trial
                <FiArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-white text-secondary-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-secondary-200 hover:border-primary-300 hover:text-primary-600 transition-all"
              >
                <FiPlay className="w-5 h-5" />
                Watch Demo
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-secondary-400">
              <div className="flex items-center gap-2">
                <FiShield className="w-5 h-5" />
                <span className="text-sm">256-bit SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheck className="w-5 h-5" />
                <span className="text-sm">14-day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCreditCard className="w-5 h-5" />
                <span className="text-sm">No Credit Card Required</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-white rounded-2xl shadow-2xl border border-secondary-200 overflow-hidden">
              {/* Browser Header */}
              <div className="bg-secondary-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-danger-500" />
                  <div className="w-3 h-3 rounded-full bg-warning-500" />
                  <div className="w-3 h-3 rounded-full bg-success-500" />
                </div>
                <div className="flex-1 bg-white rounded-md px-4 py-1.5 text-sm text-secondary-400 text-center">
                  dashboard.simmanager.com
                </div>
              </div>
              {/* Dashboard Preview */}
              <div className="p-6 bg-secondary-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total SIMs', value: '127', color: 'primary' },
                    { label: 'Active SIMs', value: '118', color: 'success' },
                    { label: 'Upcoming Recharges', value: '12', color: 'warning' },
                    { label: 'Call Logs Today', value: '2,456', color: 'secondary' },
                  ].map((stat, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-secondary-100">
                      <p className="text-secondary-500 text-sm">{stat.label}</p>
                      <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-secondary-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-secondary-900">Recent SIMs</h3>
                    <span className="text-primary-600 text-sm font-medium">View All</span>
                  </div>
                  <div className="space-y-3">
                    {['+91 98765 43210', '+91 87654 32109', '+91 76543 21098'].map((num, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <FiSmartphone className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900">{num}</p>
                            <p className="text-sm text-secondary-500">Jio • Maharashtra</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-success-50 text-success-600 text-sm rounded-full">Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-primary-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Everything You Need to Manage SIMs
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Powerful features designed to simplify SIM management for businesses of all sizes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-secondary-50 rounded-2xl p-8 hover:shadow-lg transition-all group border border-secondary-100"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary-600 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-3">{feature.title}</h3>
                <p className="text-secondary-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 4-step process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Sign Up', desc: 'Create your free account in seconds' },
              { step: '2', title: 'Add SIMs', desc: 'Import or manually add your SIM cards' },
              { step: '3', title: 'Install App', desc: 'Download mobile app for call log sync' },
              { step: '4', title: 'Track & Manage', desc: 'Monitor everything from dashboard' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-secondary-100">
                  <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-2">{item.title}</h3>
                  <p className="text-secondary-600 text-sm">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <FiArrowRight className="w-8 h-8 text-secondary-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl border-2 ${
                  plan.popular ? 'border-primary-600 shadow-xl' : 'border-secondary-200'
                } p-8 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">{plan.name}</h3>
                  <p className="text-secondary-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-secondary-900">{plan.price}</span>
                    <span className="text-secondary-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-4 flex-1 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <FiCheck className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
                      <span className="text-secondary-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`w-full py-3 rounded-xl font-semibold text-center transition-all ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Loved by Businesses
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              See what our customers have to say about SIM Manager.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-sm border border-secondary-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FiStar key={i} className="w-5 h-5 text-warning-500 fill-warning-500" />
                  ))}
                </div>
                <p className="text-secondary-600 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900">{testimonial.name}</p>
                    <p className="text-sm text-secondary-500">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Track Messaging Apps
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Monitor WhatsApp and Telegram status for your managed SIMs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="flex items-center gap-4 mb-4">
                <FaWhatsapp className="w-12 h-12 text-green-600" />
                <h3 className="text-2xl font-bold text-secondary-900">WhatsApp</h3>
              </div>
              <p className="text-secondary-600 mb-6">
                Track which SIMs have WhatsApp active, monitor last active time, and get alerts when status changes.
              </p>
              <ul className="space-y-2">
                {['Status tracking', 'Last active monitoring', 'Bulk status updates'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-secondary-700">
                    <FiCheck className="w-5 h-5 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <FaTelegram className="w-12 h-12 text-blue-500" />
                <h3 className="text-2xl font-bold text-secondary-900">Telegram</h3>
              </div>
              <p className="text-secondary-600 mb-6">
                Monitor Telegram activation status across all your SIMs and keep track of messaging activity.
              </p>
              <ul className="space-y-2">
                {['Status tracking', 'Last active monitoring', 'Bulk status updates'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-secondary-700">
                    <FiCheck className="w-5 h-5 text-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-secondary-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-secondary-600">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-secondary-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-secondary-900">{faq.question}</span>
                  {openFaq === index ? (
                    <FiChevronUp className="w-5 h-5 text-secondary-500" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-secondary-500" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-secondary-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Simplify SIM Management?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join 500+ companies already using SIM Manager. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-all"
            >
              Start Free Trial
              <FiArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-800 transition-all border border-primary-500"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <FiSmartphone className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">SIM Manager</span>
              </div>
              <p className="text-secondary-400 mb-6">
                The complete SIM management solution for modern businesses.
              </p>
              <div className="flex gap-4">
                {['twitter', 'linkedin', 'facebook'].map((social, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 bg-secondary-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5 bg-secondary-400 rounded" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Integrations', 'Mobile App', 'Updates'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-secondary-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'Careers', 'Blog', 'Press', 'Partners'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-secondary-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-3">
                {['Help Center', 'Contact Us', 'Privacy Policy', 'Terms of Service', 'Status'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-secondary-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-secondary-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-secondary-400 text-sm">
              © 2026 SIM Manager. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-secondary-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-secondary-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-secondary-400 hover:text-white text-sm transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing