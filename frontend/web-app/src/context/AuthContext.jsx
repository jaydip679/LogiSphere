import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('logisphere_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync token state on initial load
  useEffect(() => {
    const token = localStorage.getItem('logisphere_access_token');
    if (token && user) {
      // Validate profile with backend
      apiClient
        .get('/api/v1/auth/profile')
        .then((res) => {
          if (res.data?.data) {
            setUser(res.data.data);
            localStorage.setItem('logisphere_user', JSON.stringify(res.data.data));
          }
        })
        .catch(() => {
          // If profile check fails and token refresh also failed, clear session
          const hasToken = localStorage.getItem('logisphere_access_token');
          if (!hasToken) {
            setUser(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    const handleSessionLogout = () => {
      setUser(null);
    };

    window.addEventListener('logisphere:auth:logout', handleSessionLogout);
    return () => {
      window.removeEventListener('logisphere:auth:logout', handleSessionLogout);
    };
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/api/v1/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const payload = response.data?.data;
    if (!payload) {
      throw new Error('Authentication failed: Invalid response payload');
    }

    const { user: authUser, tokens } = payload;
    const accessToken = tokens?.accessToken;
    const refreshToken = tokens?.refreshToken;

    if (accessToken) {
      localStorage.setItem('logisphere_access_token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('logisphere_refresh_token', refreshToken);
    }
    if (authUser) {
      localStorage.setItem('logisphere_user', JSON.stringify(authUser));
      setUser(authUser);
    }

    return payload;
  };

  const registerCustomer = async (data) => {
    const response = await apiClient.post('/api/v1/auth/register/customer', data);
    return response.data;
  };

  const registerCompany = async (data) => {
    const response = await apiClient.post('/api/v1/organizations/register/company', data);
    return response.data;
  };

  const verifyOtp = async (email, otp, purpose = 'REGISTRATION') => {
    const response = await apiClient.post('/api/v1/auth/verify-otp', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      purpose,
    });

    const payload = response.data?.data;
    if (payload?.tokens && payload?.user) {
      const { user: authUser, tokens } = payload;
      if (tokens.accessToken) {
        localStorage.setItem('logisphere_access_token', tokens.accessToken);
      }
      if (tokens.refreshToken) {
        localStorage.setItem('logisphere_refresh_token', tokens.refreshToken);
      }
      localStorage.setItem('logisphere_user', JSON.stringify(authUser));
      setUser(authUser);
    }

    return response.data;
  };

  const resendOtp = async (email, purpose = 'REGISTRATION') => {
    const response = await apiClient.post('/api/v1/auth/resend-otp', {
      email: email.trim().toLowerCase(),
      purpose,
    });
    return response.data;
  };

  const requestPasswordReset = async (email) => {
    const response = await apiClient.post('/api/v1/auth/forgot-password', {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  };

  const resetPassword = async (email, otp, newPassword) => {
    const response = await apiClient.post('/api/v1/auth/reset-password', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword,
    });
    return response.data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('logisphere_refresh_token');
      if (refreshToken) {
        await apiClient.post('/api/v1/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn('Logout API call error (proceeding with local cleanup):', err?.message);
    } finally {
      localStorage.removeItem('logisphere_access_token');
      localStorage.removeItem('logisphere_refresh_token');
      localStorage.removeItem('logisphere_user');
      setUser(null);
    }
  };

  const getDefaultPortalRoute = (role) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return '/portal/admin';
      case 'COMPANY_OWNER':
      case 'LOGISTICS_MANAGER':
      case 'DISPATCHER':
        return '/portal/company';
      case 'DRIVER':
        return '/portal/driver';
      case 'CUSTOMER':
      default:
        return '/portal/customer';
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    registerCustomer,
    registerCompany,
    verifyOtp,
    resendOtp,
    requestPasswordReset,
    resetPassword,
    logout,
    getDefaultPortalRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
