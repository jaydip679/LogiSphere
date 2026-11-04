import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../common/Button';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const navLinks = [
    {
      name: 'Platform',
      href: '#platform-overview',
      children: [
        {
          name: 'Core Capabilities',
          href: '#features',
          description: 'Marketplace matching, dispatch & telemetry',
        },
        {
          name: 'Interactive Preview',
          href: '#platform-preview',
          description: 'Explore live interface mockups for every role',
        },
        {
          name: 'Tracking Telemetry',
          href: '/track',
          description: 'Live consignment tracking simulator & status',
          isRoute: true,
        },
      ],
    },
    {
      name: 'Solutions',
      href: '#solutions',
      children: [
        {
          name: 'For Shippers & Businesses',
          href: '#solutions',
          description: 'B2B freight, volume pricing & automated booking',
        },
        {
          name: 'For Logistics Companies',
          href: '#solutions',
          description: 'Marketplace orders, fleet capacity & dispatch',
        },
        {
          name: 'For Fleet Drivers',
          href: '#solutions',
          description: 'Milestone tracking & digital Proof-of-Delivery',
        },
      ],
    },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'About', href: '#about-us' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-3'
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-100 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Logo size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                if (link.children) {
                  return (
                    <div
                      key={link.name}
                      className="relative"
                      onMouseEnter={() => setActiveDropdown(link.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg transition-colors cursor-pointer"
                        onClick={() =>
                          setActiveDropdown(activeDropdown === link.name ? null : link.name)
                        }
                      >
                        <span>{link.name}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            activeDropdown === link.name ? 'rotate-180 text-brand-600' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdown === link.name && (
                        <div className="absolute top-full left-0 w-72 bg-white rounded-xl shadow-lg border border-slate-100 py-2 mt-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                          {link.children.map((child) =>
                            child.isRoute ? (
                              <Link
                                key={child.name}
                                to={child.href}
                                className="block px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                              >
                                <div className="text-sm font-medium text-slate-900 group-hover:text-brand-600">
                                  {child.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {child.description}
                                </div>
                              </Link>
                            ) : (
                              <a
                                key={child.name}
                                href={child.href}
                                className="block px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                              >
                                <div className="text-sm font-medium text-slate-900 group-hover:text-brand-600">
                                  {child.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {child.description}
                                </div>
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg transition-colors"
                  >
                    {link.name}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Quick Track Consignment */}
            <Link
              to="/track"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Track Consignment</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Login Link */}
            <Link
              to="/login"
              className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors"
            >
              Sign In
            </Link>

            {/* Get Started CTA */}
            <Button to="/register" variant="primary" size="md" icon={ArrowRight}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/track"
              className="p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg border border-slate-200"
              title="Track Consignment"
            >
              <Search className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-navy-900 hover:bg-slate-100 rounded-lg focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 shadow-lg animate-in fade-in duration-200">
          <div className="space-y-1">
            <a
              href="#platform-overview"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Platform Overview
            </a>
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Core Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              How It Works
            </a>
            <a
              href="#solutions"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Solutions
            </a>
            <a
              href="#platform-preview"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Platform Preview
            </a>
            <a
              href="#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Contact
            </a>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <Link
              to="/track"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Track Consignment</span>
            </Link>

            <Link
              to="/login"
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
