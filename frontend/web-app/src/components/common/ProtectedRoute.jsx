import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading, getDefaultPortalRoute } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Verifying LogiSphere session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const destination = getDefaultPortalRoute(user.role);
    if (destination === location.pathname || location.pathname.startsWith(destination)) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card max-w-md text-center space-y-3">
            <h2 className="text-base font-bold text-navy-900">Access Restricted</h2>
            <p className="text-xs text-slate-500">
              Your account role ({user.role || 'Unspecified'}) is not authorized to access this portal section.
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to={destination} replace />;
  }

  return children;
}
