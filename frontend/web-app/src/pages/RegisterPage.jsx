import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'COMPANY' ? 'COMPANY' : 'CUSTOMER';
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">
          Create Your LogiSphere Account
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Connect to India's smart logistics and dispatch network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200/90 sm:px-10">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-navy-900">Registration Received!</h3>
              <p className="text-sm text-slate-600">
                {role === 'COMPANY'
                  ? 'Your logistics organization application has been submitted. Platform Administrators review carrier compliance within 24 hours.'
                  : 'Your customer account is ready! Sign in to start booking and tracking consignments.'}
              </p>
              {role === 'COMPANY' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Status: PENDING_REVIEW</span>
                  </div>
                  <span>
                    Carrier dispatch and marketplace biddings will activate upon administrative
                    approval.
                  </span>
                </div>
              )}
              <div className="pt-4">
                <Button to="/login" variant="primary" size="md" className="w-full">
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Account Type Selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'CUSTOMER'
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User
                      className={`w-4 h-4 ${
                        role === 'CUSTOMER' ? 'text-brand-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-navy-900">Shipper / Customer</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Book and track consignments</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('COMPANY')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'COMPANY'
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Truck
                      className={`w-4 h-4 ${
                        role === 'COMPANY' ? 'text-brand-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-navy-900">Logistics Carrier</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Operate fleet & receive orders</div>
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleRegister}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rohit Sharma"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                </div>

                {role === 'COMPANY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Organization / Fleet Business Name
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Apex Logistics Private Limited"
                      required
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rohit@logistics.in"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                </div>

                <Button type="submit" variant="primary" size="md" className="w-full mt-2">
                  {role === 'COMPANY'
                    ? 'Submit Carrier Onboarding Application'
                    : 'Create Shipper Account'}
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                  Sign In
                </Link>
              </div>
            </>
          )}
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
