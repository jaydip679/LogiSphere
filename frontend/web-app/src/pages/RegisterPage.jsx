import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Mail,
  KeyRound,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
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
  const navigate = useNavigate();

  const initialRole = searchParams.get('role') === 'COMPANY' ? 'COMPANY' : 'CUSTOMER';
  const initialStep = searchParams.get('step') === 'verify' ? 'VERIFY' : 'FORM';
  const initialEmail = searchParams.get('email') || '';

  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(initialStep); // 'FORM' | 'VERIFY' | 'SUCCESS'

  // Registration form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('INDIVIDUAL');
  const [businessName, setBusinessName] = useState('');

  // Carrier specific fields
  const [companyName, setCompanyName] = useState('');
  const [selectedHubs, setSelectedHubs] = useState(['Delhi NCR', 'Mumbai']);

  // OTP Verification state
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // General loading & messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const { registerCustomer, registerCompany, verifyOtp, resendOtp } = useAuth();

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer;
    if (step === 'VERIFY' && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

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
      setError(
        'Password must be at least 8 characters long and contain at least one uppercase letter and one number.'
      );
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
        setStep('VERIFY');
        setCooldown(60);
        setCanResend(false);
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
        setStep('VERIFY');
        setCooldown(60);
        setCanResend(false);
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setOtpLoading(true);
    try {
      await verifyOtp(email.trim().toLowerCase(), cleanOtp, 'REGISTRATION');
      setStep('SUCCESS');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Verification failed. Please check your code.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setOtpError('');
    setCanResend(false);
    setCooldown(60);

    try {
      await resendOtp(email.trim().toLowerCase(), 'REGISTRATION');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to resend code. Please try again.';
      setOtpError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">
          {step === 'VERIFY' ? 'Verify Your Email' : step === 'SUCCESS' ? 'Registration Complete' : 'Create Your LogiSphere Account'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {step === 'VERIFY'
            ? 'Enter the 6-digit security code sent to your email'
            : step === 'SUCCESS'
            ? 'Your account is verified and ready for use'
            : "Connect to India's smart logistics and dispatch network"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200/90 sm:px-10">
          {/* STEP 1: REGISTRATION FORM */}
          {step === 'FORM' && (
            <>
              {/* Account Type Selector */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setRole('CUSTOMER');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    role === 'CUSTOMER'
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Shipper / Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('COMPANY');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    role === 'COMPANY'
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Logistics Carrier</span>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleRegister}>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {role === 'COMPANY' ? 'Company Owner / Authorized Rep' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    A 6-digit OTP verification code will be sent to this email.
                  </p>
                </div>

                {/* Customer Account Type */}
                {role === 'CUSTOMER' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType('INDIVIDUAL')}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                          accountType === 'INDIVIDUAL'
                            ? 'border-brand-600 bg-brand-50/50 text-brand-700 font-semibold'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Individual Shipper
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('BUSINESS')}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                          accountType === 'BUSINESS'
                            ? 'border-brand-600 bg-brand-50/50 text-brand-700 font-semibold'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Enterprise / Business
                      </button>
                    </div>
                  </div>
                )}

                {/* Business Name (for Business Customers) */}
                {role === 'CUSTOMER' && accountType === 'BUSINESS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Registered Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Retail Solutions Ltd"
                      required
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                    />
                  </div>
                )}

                {/* Company Name (for Carrier) */}
                {role === 'COMPANY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Logistics Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Freight Lines Pvt Ltd"
                      required
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                    />
                  </div>
                )}

                {/* Service Hubs (for Carrier) */}
                {role === 'COMPANY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Corridor Coverage Hubs
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                      {AVAILABLE_HUBS.map((hub) => {
                        const isSelected = selectedHubs.includes(hub);
                        return (
                          <button
                            key={hub}
                            type="button"
                            onClick={() => toggleHub(hub)}
                            className={`px-2.5 py-1.5 text-xs rounded-md text-left font-medium transition-all ${
                              isSelected
                                ? 'bg-brand-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {hub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters (1 uppercase, 1 number)"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <span>{role === 'COMPANY' ? 'Register Logistics Carrier' : 'Create Customer Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* STEP 2: OTP VERIFICATION SCREEN */}
          {step === 'VERIFY' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-brand-50 border border-brand-200 rounded-full flex items-center justify-center mx-auto text-brand-600 mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-900">Check Your Email</h3>
                <p className="text-sm text-slate-600 mt-1">
                  We sent a 6-digit verification code to:
                </p>
                <p className="text-sm font-semibold text-navy-900 bg-slate-100 py-1 px-3 rounded-md inline-block mt-1 font-mono">
                  {email}
                </p>
              </div>

              {otpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider text-center mb-2">
                    Enter 6-Digit Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="block w-full py-3 text-center text-2xl font-mono tracking-[0.5em] font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    Code expires in 10 minutes.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={otpLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Verify & Activate Account</span>
                </Button>
              </form>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setStep('FORM');
                    setOtp('');
                    setOtpError('');
                  }}
                  className="flex items-center gap-1 text-slate-600 hover:text-navy-900 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend}
                  className={`flex items-center gap-1 font-semibold transition-colors ${
                    canResend
                      ? 'text-brand-600 hover:text-brand-700 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${!canResend ? 'animate-spin-slow' : ''}`} />
                  <span>{canResend ? 'Resend Code' : `Resend in ${cooldown}s`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-navy-900">
                Email Verified Successfully!
              </h3>
              <p className="text-sm text-slate-600">
                Your LogiSphere account is active. You can now sign in to access your portal.
              </p>

              {role === 'COMPANY' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Company Status: PENDING_REVIEW</span>
                  </div>
                  <span>
                    Your owner account email is verified. Platform Administration will review and approve your carrier license before bidding on marketplace consignments.
                  </span>
                </div>
              )}

              <div className="pt-4">
                <Button to="/login" variant="primary" size="md" className="w-full">
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
