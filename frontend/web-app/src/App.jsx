import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicTrackingPage from './pages/PublicTrackingPage';
import CustomerPortalPage from './pages/portal/CustomerPortalPage';
import CompanyPortalPage from './pages/portal/CompanyPortalPage';
import DriverPortalPage from './pages/portal/DriverPortalPage';
import AdminPortalPage from './pages/portal/AdminPortalPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication & Onboarding Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Public Tracking Telemetry Route */}
      <Route path="/track" element={<PublicTrackingPage />} />

      {/* Role-Based Portals */}
      <Route path="/portal/customer/*" element={<CustomerPortalPage />} />
      <Route path="/portal/company/*" element={<CompanyPortalPage />} />
      <Route path="/portal/driver/*" element={<DriverPortalPage />} />
      <Route path="/portal/admin/*" element={<AdminPortalPage />} />

      {/* Convenience redirects for shorter role links */}
      <Route path="/driver" element={<Navigate to="/portal/driver" replace />} />
      <Route path="/admin" element={<Navigate to="/portal/admin" replace />} />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
