import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  FiPhone,
  FiMail,
} from "react-icons/fi";
import {
  FaWhatsapp,
  FaTelegram,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaGithub,
} from "react-icons/fa";
import Logo from "../components/Logo";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Default static data (fallback)
const defaultContent = {
  hero: {
    badge: "Trusted by 500+ Companies",
    title: "Manage All Your",
    highlight: "SIM Cards",
    suffix: "in One Place",
    subtitle:
      "Track recharges, sync call logs, monitor messaging apps, and manage your entire SIM inventory with our powerful cloud platform.",
    cta1Text: "Get Started",
    cta1Link: "/register",
    cta2Text: "Watch Demo",
    cta2Link: "#demo",
    trustBadges: [
      { icon: "FiShield", text: "256-bit SSL" },
      { icon: "FiCheck", text: "Easy Setup" },
      { icon: "FiCreditCard", text: "Secure Payments" },
    ],
  },
  stats: [
    { value: "500+", label: "Companies Trust Us" },
    { value: "50K+", label: "SIMs Managed" },
    { value: "1M+", label: "Call Logs Synced" },
    { value: "99.9%", label: "Uptime Guarantee" },
  ],
  features: {
    title: "Everything You Need to Manage SIMs",
    subtitle:
      "Powerful features designed to simplify SIM management for businesses of all sizes.",
    items: [
      {
        icon: "FiSmartphone",
        title: "SIM Management",
        description:
          "Manage all your SIM cards in one place. Track operators, circles, status, and assignments effortlessly.",
      },
      {
        icon: "FiCreditCard",
        title: "Recharge Tracking",
        description:
          "Never miss a recharge. Get reminders before expiry and track all recharge history with detailed analytics.",
      },
      {
        icon: "FiBell",
        title: "Smart Notifications",
        description:
          "Automated alerts for recharge due dates, inactive SIMs, and subscription expiry. Stay informed always.",
      },
      {
        icon: "FiBarChart2",
        title: "Call Log Analytics",
        description:
          "Sync call logs from mobile devices and analyze call patterns, durations, and contact frequency.",
      },
      {
        icon: "FiUsers",
        title: "Multi-User Access",
        description:
          "Role-based access control. Admins manage everything, users sync call logs via mobile app.",
      },
      {
        icon: "FiShield",
        title: "Secure & Reliable",
        description:
          "Enterprise-grade security with JWT authentication, encrypted data, and role-based permissions.",
      },
    ],
  },
  howItWorks: {
    title: "How It Works",
    subtitle: "Get started in minutes with our simple 4-step process.",
    steps: [
      {
        step: 1,
        title: "Sign Up",
        description: "Create your free account in seconds",
      },
      {
        step: 2,
        title: "Add SIMs",
        description: "Import or manually add your SIM cards",
      },
      {
        step: 3,
        title: "Install App",
        description: "Download mobile app for call log sync",
      },
      {
        step: 4,
        title: "Track & Manage",
        description: "Monitor everything from dashboard",
      },
    ],
  },
  testimonials: {
    title: "Loved by Businesses",
    subtitle: "See what our customers have to say about SIM Manager.",
    items: [
      {
        name: "Rajesh Kumar",
        role: "Operations Manager",
        company: "TechConnect Solutions",
        content:
          "SIM Manager has transformed how we manage our company SIMs. The recharge reminders alone have saved us thousands in missed recharges.",
        rating: 5,
      },
      {
        name: "Priya Sharma",
        role: "IT Administrator",
        company: "Global Communications",
        content:
          "The call log sync feature is brilliant. We can now track all company calls in one dashboard. Highly recommended!",
        rating: 5,
      },
      {
        name: "Amit Patel",
        role: "Business Owner",
        company: "Smart Telecom",
        content:
          "Finally, a simple yet powerful SIM management solution. The mobile app makes call log syncing effortless.",
        rating: 5,
      },
    ],
  },
  integrations: {
    title: "Track Messaging Apps",
    subtitle: "Monitor WhatsApp and Telegram status for your managed SIMs.",
    whatsapp: {
      title: "WhatsApp",
      description:
        "Track which SIMs have WhatsApp active, monitor last active time, and get alerts when status changes.",
      features: [
        "Status tracking",
        "Last active monitoring",
        "Bulk status updates",
      ],
    },
    telegram: {
      title: "Telegram",
      description:
        "Monitor Telegram activation status across all your SIMs and keep track of messaging activity.",
      features: [
        "Status tracking",
        "Last active monitoring",
        "Bulk status updates",
      ],
    },
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Got questions? We've got answers.",
    items: [
      {
        question: "What is SIM Management SaaS?",
        answer:
          "SIM Management SaaS is a cloud-based platform that helps businesses manage their SIM cards, track recharges, sync call logs, and monitor messaging app statuses all in one place.",
      },
      {
        question: "How does the mobile app work?",
        answer:
          "Our mobile app (Android) automatically syncs call logs from registered devices to your dashboard. Simply install the app, verify your number via OTP, and grant call log permission.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Absolutely, We use industry-standard encryption, JWT authentication, and role-based access control. Your data is stored securely in the cloud with regular backups.",
      },
      {
        question: "Can I track WhatsApp/Telegram status?",
        answer:
          "Yes! Professional and Enterprise plans include WhatsApp and Telegram status tracking for your managed SIMs.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major payment methods including Credit/Debit Cards, UPI, Net Banking, and Wallets through Razorpay.",
      },
      {
        question: "Can I upgrade or downgrade my plan?",
        answer:
          "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.",
      },
    ],
  },
  cta: {
    headline: "Ready to Simplify SIM Management?",
    subtitle:
      "Join 500+ companies already using SIM Manager. Get started today.",
    button1Text: "Get Started",
    button1Link: "/register",
    button2Text: "Sign In",
    button2Link: "/login",
  },
  footer: {
    brandDescription:
      "The complete SIM management solution for modern businesses.",
    socialLinks: [
      { platform: "twitter", url: "#twitter" },
      { platform: "linkedin", url: "#" },
      { platform: "facebook", url: "#" },
    ],
    productLinks: [
      { text: "Features", url: "#features" },
      { text: "Pricing", url: "#pricing" },
      { text: "Integrations", url: "#integrations" },
      { text: "Mobile App", url: "#" },
    ],
    contact: {
      phone: "+91 9876543210",
      email: "contact@simtrackr.com",
    },
    copyright: "© 2026 SIM Manager. All rights reserved.",
  },
};

// Icon mapping
const iconMap = {
  FiSmartphone,
  FiCreditCard,
  FiBell,
  FiBarChart2,
  FiUsers,
  FiShield,
  FiCheck,
  FiStar,
  FiArrowRight,
  FiPlay,
};

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [content, setContent] = useState(defaultContent);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [contactErrors, setContactErrors] = useState({});
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Contact form handlers
  const validateContactField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value || !value.trim()) return 'Name is required'
        if (value.trim().length > 100) return 'Name cannot exceed 100 characters'
        return ''
      case 'email':
        if (!value || !value.trim()) return 'Email is required'
        if (!/^\S+@\S+\.\S+$/.test(value.trim())) return 'Please enter a valid email address'
        return ''
      case 'phone':
        if (value && value.trim() && !/^\+?\d{10,15}$/.test(value.trim())) return 'Phone number must be 10-15 digits'
        return ''
      case 'message':
        if (!value || !value.trim()) return 'Message is required'
        if (value.trim().length > 1000) return 'Message cannot exceed 1000 characters'
        return ''
      default:
        return ''
    }
  }

  const handleContactChange = (e) => {
    const { name, value } = e.target
    setContactForm((prev) => ({ ...prev, [name]: value }))
    if (contactErrors[name]) {
      setContactErrors((prev) => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }
  }

  const handleContactBlur = (e) => {
    const { name, value } = e.target
    const error = validateContactField(name, value)
    setContactErrors((prev) => ({ ...prev, [name]: error }))
  }

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}
    const fieldsToValidate = ['name', 'email', 'phone', 'message']
    fieldsToValidate.forEach((field) => {
      const error = validateContactField(field, contactForm[field])
      if (error) newErrors[field] = error
    })

    if (Object.keys(newErrors).length > 0) {
      setContactErrors(newErrors)
      return
    }

    setContactSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          company: contactForm.company,
          message: contactForm.message,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setContactSubmitted(true)
      } else {
        alert(data.message || 'Something went wrong. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setContactSubmitting(false)
    }
  }

  // Fetch dynamic content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`${API_URL}/landing-content/public`);
        const data = await response.json();
        if (data.success && data.data) {
          // Merge with defaults to ensure all fields exist
          setContent((prev) => ({
            hero: { ...prev.hero, ...data.data.hero },
            stats: data.data.stats || prev.stats,
            features: { ...prev.features, ...data.data.features },
            howItWorks: { ...prev.howItWorks, ...data.data.howItWorks },
            testimonials: { ...prev.testimonials, ...data.data.testimonials },
            integrations: { ...prev.integrations, ...data.data.integrations },
            faq: { ...prev.faq, ...data.data.faq },
            cta: { ...prev.cta, ...data.data.cta },
            footer: { ...prev.footer, ...data.data.footer },
          }));
        }
      } catch (error) {
        console.log("Using default landing content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/subscriptions/compare`);
        const data = await response.json();
        if (data.success && data.data) {
          setPlans(data.data);
        }
      } catch (error) {
        console.log("Could not fetch subscription plans");
      }
    };

    fetchPlans();
  }, []);

  // Get icon component
  const getIcon = (iconName) => {
    return iconMap[iconName] || FiSmartphone;
  };

  // Handle logo click - scroll to top smoothly
  const handleLogoClick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-secondary-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div onClick={handleLogoClick} className="cursor-pointer">
              <Logo
                size="default"
                variant="dark"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-secondary-600 hover:text-primary-600 transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-secondary-600 hover:text-primary-600 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-secondary-600 hover:text-primary-600 transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#faq"
                className="text-secondary-600 hover:text-primary-600 transition-colors"
              >
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/login"
                className="text-secondary-600 hover:text-primary-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <a
                href="#pricing"
                className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                {content.hero?.cta1Text || "Get Started"}
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-secondary-600"
            >
              {mobileMenuOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-secondary-200">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#features"
                className="block py-2 text-secondary-600 hover:text-primary-600"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block py-2 text-secondary-600 hover:text-primary-600"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="block py-2 text-secondary-600 hover:text-primary-600"
              >
                Testimonials
              </a>
              <a
                href="#faq"
                className="block py-2 text-secondary-600 hover:text-primary-600"
              >
                FAQ
              </a>
              <div className="pt-4 border-t border-secondary-200 space-y-3">
                <Link
                  to="/login"
                  className="block py-2 text-secondary-600 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-center bg-primary-600 text-white rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {content.hero?.cta1Text || "Get Started"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-primary-50 via-white to-secondary-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <FiStar className="w-4 h-4" />
              <span>{content.hero?.badge}</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary-900 leading-tight mb-6">
              {content.hero?.title}{" "}
              <span className="text-primary-600">
                {content.hero?.highlight}
              </span>{" "}
              {content.hero?.suffix}
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
              {content.hero?.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a
                href={content.hero?.cta1Link || "#pricing"}
                className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
              >
                {content.hero?.cta1Text || "Get Started"}
                <FiArrowRight className="w-5 h-5" />
              </a>
              <a
                href={content.hero?.cta2Link || "#demo"}
                className="inline-flex items-center justify-center gap-2 bg-white text-secondary-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-secondary-200 hover:border-primary-300 hover:text-primary-600 transition-all"
              >
                <FiPlay className="w-5 h-5" />
                {content.hero?.cta2Text || "Watch Demo"}
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-secondary-400">
              {content.hero?.trustBadges?.map((badge, index) => {
                const IconComponent = getIcon(badge.icon);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <IconComponent className="w-5 h-5" />
                    <span className="text-sm">{badge.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-12 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {content.stats?.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </p>
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
              {content.features?.title}
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              {content.features?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.features?.items?.map((feature, index) => {
              const IconComponent = getIcon(feature.icon);
              return (
                <div
                  key={index}
                  className="bg-secondary-50 rounded-2xl p-8 hover:shadow-lg transition-all group border border-secondary-100"
                >
                  <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary-600 transition-colors">
                    <IconComponent className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-secondary-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="howItWorks" className="py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              {content.howItWorks?.title}
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              {content.howItWorks?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {content.howItWorks?.steps?.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-secondary-100">
                  <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-secondary-600 text-sm">
                    {item.description}
                  </p>
                </div>
                {index < (content.howItWorks?.steps?.length || 4) - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-8 transform -translate-y-1/2">
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
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. Cancel anytime.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-secondary-100 rounded-xl p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white text-secondary-900 shadow-sm"
                    : "text-secondary-600 hover:text-secondary-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-white text-secondary-900 shadow-sm"
                    : "text-secondary-600 hover:text-secondary-900"
                }`}
              >
                Yearly
                <span className="bg-success-100 text-success-700 text-xs px-2 py-0.5 rounded-full">
                  Best Value
                </span>
              </button>
            </div>
          </div>

          {plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {plans.map((plan, index) => {
                // Convert features object to array of enabled features
                const featureLabels = {
                  callLogSync: "Call Log Sync",
                  whatsappStatus: "WhatsApp Tracking",
                  telegramStatus: "Telegram Tracking",
                  emailNotifications: "Email Notifications",
                  smsNotifications: "SMS Notifications",
                  advancedReports: "Advanced Reports",
                  excelExport: "Excel Export",
                  apiAccess: "API Access",
                  prioritySupport: "Priority Support",
                };

                const enabledFeatures = plan.features
                  ? Object.entries(plan.features)
                      .filter(([key, value]) => value === true)
                      .map(([key]) => featureLabels[key] || key)
                  : [];

                const price =
                  billingCycle === "monthly"
                    ? plan.price?.monthly
                    : plan.price?.yearly;

                const displayPrice = price?.toLocaleString?.() || price || 0;

                // Calculate savings for yearly
                const yearlySavings =
                  plan.price?.monthly && plan.price?.yearly
                    ? Math.round(
                        ((plan.price.monthly * 12 - plan.price.yearly) /
                          (plan.price.monthly * 12)) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={plan._id || index}
                    className={`relative bg-white rounded-2xl border-2 ${
                      plan.isPopular
                        ? "border-primary-600 shadow-xl"
                        : "border-secondary-200"
                    } p-6 flex flex-col`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-secondary-900">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-secondary-500 text-xs mt-1">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex items-baseline justify-center gap-1 mt-2">
                        <span className="text-3xl font-bold text-secondary-900">
                          ₹{displayPrice}
                        </span>
                        <span className="text-secondary-500 text-sm">
                          /{billingCycle === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                      {billingCycle === "yearly" && yearlySavings > 0 && (
                        <p className="text-success-600 text-xs mt-1 font-medium">
                          Save {yearlySavings}% yearly
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 flex-1 mb-4 text-sm">
                      {plan.limits && (
                        <>
                          {plan.limits.maxSims !== 0 && (
                            <li className="flex items-center gap-2">
                              <FiCheck className="w-4 h-4 text-success-500 flex-shrink-0" />
                              <span className="text-secondary-600">
                                {plan.limits.maxSims === -1
                                  ? "Unlimited"
                                  : plan.limits.maxSims}{" "}
                                SIMs
                              </span>
                            </li>
                          )}
                          {plan.limits.maxUsers !== 0 && (
                            <li className="flex items-center gap-2">
                              <FiCheck className="w-4 h-4 text-success-500 flex-shrink-0" />
                              <span className="text-secondary-600">
                                {plan.limits.maxUsers === -1
                                  ? "Unlimited"
                                  : plan.limits.maxUsers}{" "}
                                Users
                              </span>
                            </li>
                          )}
                        </>
                      )}
                      {enabledFeatures.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-2">
                          <FiCheck className="w-4 h-4 text-success-500 flex-shrink-0" />
                          <span className="text-secondary-600">{feature}</span>
                        </li>
                      ))}
                      {/* Custom Features */}
                      {plan.customFeatures?.map((feature, fIndex) => (
                        <li
                          key={`custom-${fIndex}`}
                          className="flex items-center gap-2"
                        >
                          <FiCheck className="w-4 h-4 text-success-500 flex-shrink-0" />
                          <span className="text-secondary-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={`/register?plan=${plan._id}&cycle=${billingCycle}`}
                      className={`w-full py-2.5 rounded-xl font-medium text-center transition-all block text-sm ${
                        plan.isPopular
                          ? "bg-primary-600 text-white hover:bg-primary-700"
                          : "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-secondary-500">
              <p>Loading plans...</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              {content.testimonials?.title}
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              {content.testimonials?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.testimonials?.items?.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm border border-secondary-100"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating || 5)].map((_, i) => (
                    <FiStar
                      key={i}
                      className="w-5 h-5 text-warning-500 fill-warning-500"
                    />
                  ))}
                </div>
                <p className="text-secondary-600 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-lg">
                      {testimonial.name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900">
                      {testimonial.name}
                    </p>
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

      {/* Integrations Section - Whatsapp,telegram */}
      <section id="integrations" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              {content.integrations?.title}
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              {content.integrations?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="flex items-center gap-4 mb-4">
                <FaWhatsapp className="w-12 h-12 text-green-600" />
                <h3 className="text-2xl font-bold text-secondary-900">
                  {content.integrations?.whatsapp?.title}
                </h3>
              </div>
              <p className="text-secondary-600 mb-6">
                {content.integrations?.whatsapp?.description}
              </p>
              <ul className="space-y-2">
                {content.integrations?.whatsapp?.features?.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-secondary-700"
                  >
                    <FiCheck className="w-5 h-5 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <FaTelegram className="w-12 h-12 text-blue-500" />
                <h3 className="text-2xl font-bold text-secondary-900">
                  {content.integrations?.telegram?.title}
                </h3>
              </div>
              <p className="text-secondary-600 mb-6">
                {content.integrations?.telegram?.description}
              </p>
              <ul className="space-y-2">
                {content.integrations?.telegram?.features?.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-secondary-700"
                  >
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
              {content.faq?.title}
            </h2>
            <p className="text-lg text-secondary-600">
              {content.faq?.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            {content.faq?.items?.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-secondary-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-secondary-900">
                    {faq.question}
                  </span>
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
      <section id="cta" className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {content.cta?.headline}
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            {content.cta?.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-all"
            >
              {content.cta?.button1Text || "Get Started"}
              <FiArrowRight className="w-5 h-5" />
            </Link> */}
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-all"
            >
              {content.hero?.cta1Text || "Get Started"}
              <FiArrowRight className="w-5 h-5" />
            </a>
            <Link
              to={content.cta?.button2Link || "/login"}
              className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-800 transition-all border border-primary-500"
            >
              {content.cta?.button2Text || "Sign In"}
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">Get In Touch</h2>
            <p className="text-secondary-600 text-lg max-w-2xl mx-auto">
              Have questions about our SIM management platform? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            {contactSubmitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheck className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-secondary-900 mb-2">Thank You!</h3>
                <p className="text-secondary-600 mb-6">Your message has been sent successfully. We'll get back to you soon.</p>
                <button
                  onClick={() => { setContactSubmitted(false); setContactForm({ name: '', email: '', phone: '', company: '', message: '' }); setContactErrors({}); }}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      onBlur={handleContactBlur}
                      className={`w-full px-4 py-2.5 rounded-lg border ${contactErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500'} focus:outline-none focus:ring-2 transition-all duration-200`}
                      placeholder="Your name"
                    />
                    {contactErrors.name && <p className="text-xs text-red-500 mt-1">{contactErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      onBlur={handleContactBlur}
                      className={`w-full px-4 py-2.5 rounded-lg border ${contactErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500'} focus:outline-none focus:ring-2 transition-all duration-200`}
                      placeholder="your@email.com"
                    />
                    {contactErrors.email && <p className="text-xs text-red-500 mt-1">{contactErrors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={contactForm.phone}
                      onChange={handleContactChange}
                      onBlur={handleContactBlur}
                      className={`w-full px-4 py-2.5 rounded-lg border ${contactErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500'} focus:outline-none focus:ring-2 transition-all duration-200`}
                      placeholder="+91 9876543210"
                    />
                    {contactErrors.phone && <p className="text-xs text-red-500 mt-1">{contactErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">Company</label>
                    <input
                      type="text"
                      name="company"
                      value={contactForm.company}
                      onChange={handleContactChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-secondary-300 focus:ring-primary-500 focus:border-primary-500 focus:outline-none focus:ring-2 transition-all duration-200"
                      placeholder="Your company name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1.5">Message *</label>
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    rows={4}
                    className={`w-full px-4 py-2.5 rounded-lg border ${contactErrors.message ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500'} focus:outline-none focus:ring-2 transition-all duration-200 resize-vertical`}
                    placeholder="How can we help you?"
                  />
                  {contactErrors.message && <p className="text-xs text-red-500 mt-1">{contactErrors.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {contactSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-secondary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand */}
            <div>
              <div className="mb-4" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = '/' }}>
                <Logo
                  size="default"
                  variant="light"
                />
              </div>
              <p className="text-secondary-400 mb-6">
                {content.footer?.brandDescription}
              </p>
              <div className="flex gap-4">
                {content.footer?.socialLinks?.map((social, i) => {
                  const IconComponent =
                    {
                      twitter: FaTwitter,
                      linkedin: FaLinkedin,
                      facebook: FaFacebook,
                      instagram: FaInstagram,
                      youtube: FaYoutube,
                      github: FaGithub,
                    }[social.platform] || FaTwitter;
                  return (
                    <a
                      key={i}
                      href={social.url}
                      className="w-10 h-10 bg-secondary-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconComponent className="w-5 h-5 text-secondary-400 hover:text-white" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                {content.footer?.productLinks?.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url}
                      className="text-secondary-400 hover:text-white transition-colors"
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3">
                {content.footer?.contact?.phone && (
                  <li>
                    <a
                      href={`tel:${content.footer.contact.phone.replace(/\s/g, '')}`}
                      className="text-secondary-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <FiPhone className="w-4 h-4" />
                      {content.footer.contact.phone}
                    </a>
                  </li>
                )}
                {content.footer?.contact?.email && (
                  <li>
                    <a
                      href={`mailto:${content.footer.contact.email}`}
                      className="text-secondary-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <FiMail className="w-4 h-4" />
                      {content.footer.contact.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-secondary-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-secondary-400 text-sm">
              {content.footer?.copyright}
            </p>
            <div className="flex gap-6">
              <Link
                to="/privacy-policy"
                className="text-secondary-400 hover:text-white text-sm transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-of-service"
                className="text-secondary-400 hover:text-white text-sm transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
