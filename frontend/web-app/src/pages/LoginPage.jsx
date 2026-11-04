import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError('');
    setLoading(true);

    // Mock authentication transition / placeholder for API call
    setTimeout(() => {
      setLoading(false);
      // Determine redirection based on role or email hint
      if (email.includes('admin')) {
        navigate('/portal/admin');
      } else if (email.includes('driver')) {
        navigate('/portal/driver');
      } else if (
        email.includes('logistics') ||
        email.includes('carrier') ||
        email.includes('fleet')
      ) {
        navigate('/portal/company');
      } else {
        navigate('/portal/customer');
      }
    }, 600);
  };

  const handleRoleQuickFill = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">
          Sign In to Your Workspace
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Access your role-tailored logistics operations portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200/90 sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="w-full mt-2"
              icon={ArrowRight}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          {/* Quick Demo Role Autofill */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick Demo Fill
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleRoleQuickFill('customer@logisphere.local', 'Password123!')}
                className="p-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left"
              >
                <div className="font-semibold">Customer</div>
                <div className="text-[10px] text-slate-500 truncate">customer@logisphere.local</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleRoleQuickFill('dispatcher@apexlogistics.local', 'Password123!')
                }
                className="p-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left"
              >
                <div className="font-semibold">Logistics Company</div>
                <div className="text-[10px] text-slate-500 truncate">dispatcher@apex...</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickFill('driver@apexlogistics.local', 'Password123!')}
                className="p-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left"
              >
                <div className="font-semibold">Driver</div>
                <div className="text-[10px] text-slate-500 truncate">driver@apex...</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickFill('admin@logisphere.local', 'AdminSecure2026!')}
                className="p-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left"
              >
                <div className="font-semibold">Platform Admin</div>
                <div className="text-[10px] text-slate-500 truncate">admin@logisphere.local</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Register here
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
            ← Return to LogiSphere Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
