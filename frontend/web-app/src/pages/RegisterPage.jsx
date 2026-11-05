import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Truck, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

const AVAILABLE_HUBS = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
];

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'COMPANY' ? 'COMPANY' : 'CUSTOMER';
  const [role, setRole] = useState(initialRole);

  // Common customer fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('INDIVIDUAL');
  const [businessName, setBusinessName] = useState('');

  // Carrier specific fields
  const [companyName, setCompanyName] = useState('');
  const [selectedHubs, setSelectedHubs] = useState(['Delhi NCR', 'Mumbai']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const { registerCustomer, registerCompany } = useAuth();

  const toggleHub = (hub) => {
    if (selectedHubs.includes(hub)) {
      if (selectedHubs.length > 1) {
        setSelectedHubs(selectedHubs.filter((h) => h !== hub));
      }
    } else {
      setSelectedHubs([...selectedHubs, hub]);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter and one number.');
      return;
    }

    setLoading(true);

    try {
      if (role === 'CUSTOMER') {
        const payload = {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          accountType,
          ...(accountType === 'BUSINESS' && businessName ? { businessName: businessName.trim() } : {}),
        };
        const res = await registerCustomer(payload);
        setSuccessInfo(res.data);
        setSubmitted(true);
      } else {
        if (!companyName.trim()) {
          setError('Organization business name is required.');
          setLoading(false);
          return;
        }
        if (selectedHubs.length === 0) {
          setError('Please select at least one corridor hub.');
          setLoading(false);
          return;
        }

        const payload = {
          name: companyName.trim(),
          contactEmail: email.trim().toLowerCase(),
          serviceAreas: selectedHubs,
          supportedCategories: ['PARCEL', 'DOCUMENT', 'CORPORATE'],
          ownerFullName: fullName.trim(),
          ownerEmail: email.trim().toLowerCase(),
          ownerPassword: password,
        };
        const res = await registerCompany(payload);
        setSuccessInfo(res.data);
        setSubmitted(true);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Registration failed. Please verify your information.';
      setError(msg);
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
              <h3 className="text-xl font-bold text-navy-900">
                {role === 'COMPANY' ? 'Carrier Application Submitted!' : 'Account Successfully Created!'}
              </h3>
              <p className="text-sm text-slate-600">
                {role === 'COMPANY'
                  ? `Your organization application for "${successInfo?.organization?.name || companyName}" is registered. Platform Administrators will review your compliance before dispatch activation.`
                  : `Welcome to LogiSphere, ${fullName}! Your account has been registered and is ready for use.`}
              </p>
              {role === 'COMPANY' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Status: PENDING_REVIEW</span>
                  </div>
                  <span>
                    You can sign in to view your application status. Bidding on marketplace consignments will unlock once approved by Platform Administration.
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
                  onClick={() => {
                    setRole('CUSTOMER');
                    setError('');
                  }}
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
                  onClick={() => {
                    setRole('COMPANY');
                    setError('');
                  }}
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

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleRegister}>
                {role === 'CUSTOMER' && (
                  <div className="flex gap-4 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="accountType"
                        value="INDIVIDUAL"
                        checked={accountType === 'INDIVIDUAL'}
                        onChange={() => setAccountType('INDIVIDUAL')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-semibold text-slate-700">Individual Shipper</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="accountType"
                        value="BUSINESS"
                        checked={accountType === 'BUSINESS'}
                        onChange={() => setAccountType('BUSINESS')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-semibold text-slate-700">Business / Enterprise</span>
                    </label>
                  </div>
                )}

                {role === 'CUSTOMER' && accountType === 'BUSINESS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Business Entity Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="TechCorp India Pvt Ltd"
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                    />
                  </div>
                )}

                {role === 'COMPANY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Organization / Fleet Business Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Apex Logistics Private Limited"
                      required
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {role === 'COMPANY' ? 'Owner / Authorized Representative Name *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rohit Sharma"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Work Email Address *
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
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters, 1 uppercase, 1 number"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must be 8+ characters with at least one uppercase letter and one number.
                  </p>
                </div>

                {role === 'COMPANY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Operating Corridor Hubs (Select at least one) *
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {AVAILABLE_HUBS.map((hub) => (
                        <button
                          key={hub}
                          type="button"
                          onClick={() => toggleHub(hub)}
                          className={`px-3 py-1.5 rounded-lg border text-xs text-left font-medium transition-colors ${
                            selectedHubs.includes(hub)
                              ? 'bg-brand-50 border-brand-500 text-brand-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {selectedHubs.includes(hub) ? '✓ ' : '+ '} {hub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  className="w-full mt-4"
                  icon={ArrowRight}
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                    Sign In here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
