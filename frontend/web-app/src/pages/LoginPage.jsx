import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const { login, getDefaultPortalRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError('');
    setIsUnverified(false);
    setLoading(true);

    try {
      const data = await login(email, password);
      const user = data.user;
      const targetPath = location.state?.from?.pathname || getDefaultPortalRoute(user.role);
      navigate(targetPath, { replace: true });
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Authentication failed. Please verify your credentials.';

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        setIsUnverified(true);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-700">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Authentication Required</span>
              </div>
              <p className="text-rose-600 leading-relaxed">{error}</p>
              {isUnverified && (
                <div className="pt-2 border-t border-rose-200/80">
                  <Link
                    to={`/register?step=verify&email=${encodeURIComponent(email)}`}
                    className="inline-flex items-center gap-1.5 font-bold text-brand-700 hover:text-brand-800 bg-white px-3 py-1.5 rounded-lg border border-brand-200 shadow-2xs transition-all"
                  >
                    <span>Enter Verification Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
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
                  autoComplete="email"
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
                  autoComplete="current-password"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full flex items-center justify-center gap-2"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-600">
            <p>
              Invited as a fleet driver?{' '}
              <Link to="/activate" className="font-semibold text-brand-600 hover:text-brand-700">
                Activate account & set password
              </Link>
            </p>
            <p>
              New to LogiSphere?{' '}
              <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Create customer account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
