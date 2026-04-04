import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Building2 } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className={`p-2 rounded-xl transition-colors ${scrolled ? 'bg-blue-600' : 'bg-white/20 backdrop-blur-sm'}`}>
              <Building2 className={`h-6 w-6 ${scrolled ? 'text-white' : 'text-white'}`} />
            </div>
            <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              RealEstate<span className="text-blue-400">Pro</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                  scrolled ? 'text-gray-600' : 'text-white/80'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/auth/login"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scrolled
                  ? 'text-gray-700 hover:text-blue-600'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Log In
            </Link>
            <Link
              to="/auth/register"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-gray-700' : 'text-white'}`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                {link.label}
              </a>
            ))}
            <hr className="my-3" />
            <Link to="/auth/login" className="block px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50">
              Log In
            </Link>
            <Link
              to="/auth/register"
              className="block px-4 py-3 text-center text-white font-semibold bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
