import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Menu, X, User } from 'lucide-react';
import Logo from '../common/Logo';
import Badge from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch real unread notification count
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await apiClient.get('/api/v1/notifications/unread-count');
        if (isMounted && res.data?.data) {
          setUnreadCount(res.data.data.unreadCount || 0);
        }
      } catch {
        // Silently ignore if not authorized or network issue
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
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
              {/* Notification icon */}
              <div className="relative">
                <button
                  type="button"
                  className="p-2 text-slate-500 hover:text-navy-900 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full ring-2 ring-white" />
                  )}
                </button>
              </div>

              {/* Logged in User Profile Info */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
                <div className="w-7 h-7 bg-brand-50 border border-brand-200 rounded-full flex items-center justify-center text-brand-700 font-bold text-xs">
                  {user?.fullName ? user.fullName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800 leading-tight">
                    {user?.fullName || 'User'}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                    {user?.email || ''}
                  </div>
                </div>
              </div>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

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
          <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-xs">
                <div className="font-bold text-navy-900">{user?.fullName}</div>
                <div className="text-slate-500">{user?.email}</div>
              </div>
              <Badge variant={badge.variant} size="xs">
                {badge.text}
              </Badge>
            </div>
            {navItems.length > 0 && (
              <div className="grid grid-cols-1 gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange && onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2 text-xs font-semibold rounded-lg text-left ${
                        isActive ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
