import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  User,
  ShieldCheck,
  Truck,
  Package,
  Layers,
  Send,
  Menu,
  X,
  Bell,
  ExternalLink,
} from 'lucide-react';
import Logo from '../common/Logo';
import Badge from '../common/Badge';

export default function PortalLayout({
  title,
  subtitle,
  role = 'CUSTOMER',
  roleName = 'Shipper Portal',
  navItems = [],
  activeTab,
  onTabChange,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate('/login');
  };

  const roleBadges = {
    CUSTOMER: { variant: 'brand', text: 'Shipper' },
    COMPANY: { variant: 'accent', text: 'Logistics Carrier' },
    DRIVER: { variant: 'warning', text: 'Fleet Driver' },
    ADMIN: { variant: 'navy', text: 'Platform Admin' },
  };

  const badge = roleBadges[role] || { variant: 'brand', text: role };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Logo size="sm" to="/" />
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
                <span className="text-sm font-bold text-navy-900">{roleName}</span>
                <Badge variant={badge.variant} size="xs">
                  {badge.text}
                </Badge>
              </div>
            </div>

            {/* Right side user info & actions */}
            <div className="flex items-center gap-3">
              {/* Quick role switcher dropdown or links */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 mr-2">
                <span>Switch Portal:</span>
                <Link
                  to="/portal/customer"
                  className={`px-2 py-1 rounded hover:bg-slate-100 ${
                    role === 'CUSTOMER' ? 'font-bold text-brand-600' : ''
                  }`}
                >
                  Customer
                </Link>
                <span>•</span>
                <Link
                  to="/portal/company"
                  className={`px-2 py-1 rounded hover:bg-slate-100 ${
                    role === 'COMPANY' ? 'font-bold text-brand-600' : ''
                  }`}
                >
                  Carrier
                </Link>
                <span>•</span>
                <Link
                  to="/portal/driver"
                  className={`px-2 py-1 rounded hover:bg-slate-100 ${
                    role === 'DRIVER' ? 'font-bold text-brand-600' : ''
                  }`}
                >
                  Driver
                </Link>
                <span>•</span>
                <Link
                  to="/portal/admin"
                  className={`px-2 py-1 rounded hover:bg-slate-100 ${
                    role === 'ADMIN' ? 'font-bold text-brand-600' : ''
                  }`}
                >
                  Admin
                </Link>
              </div>

              <div className="h-5 w-px bg-slate-200 hidden lg:block" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Sign out of LogiSphere"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 md:hidden hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase">Portals</span>
              <Badge variant={badge.variant} size="xs">
                {badge.text}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link to="/portal/customer" className="p-2 rounded bg-slate-50 hover:bg-slate-100">
                Shipper Portal
              </Link>
              <Link to="/portal/company" className="p-2 rounded bg-slate-50 hover:bg-slate-100">
                Logistics Carrier
              </Link>
              <Link to="/portal/driver" className="p-2 rounded bg-slate-50 hover:bg-slate-100">
                Fleet Driver View
              </Link>
              <Link to="/portal/admin" className="p-2 rounded bg-slate-50 hover:bg-slate-100">
                Platform Admin
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          {navItems.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-subtle overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange && onTabChange(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Body */}
        {children}
      </div>
    </div>
  );
}
