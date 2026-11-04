import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  TrendingUp,
  Layers,
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';

export default function HeroSection() {
  const [trackingInput, setTrackingInput] = useState('');
  const navigate = useNavigate();

  const handleQuickTrack = (e) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      navigate(`/track?trackingNumber=${encodeURIComponent(trackingInput.trim())}`);
    } else {
      navigate('/track');
    }
  };

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white">
      {/* Subtle background ambient mesh */}
      <div className="absolute inset-0 bg-grid-slate opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-accent-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Description, CTAs, Quick Track */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-semibold uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-accent-500 animate-pulse" />
              <span>Next-Generation Logistics Operating System</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-900 tracking-tight leading-[1.12]">
              Connected Logistics. <br />
              <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-accent-600 bg-clip-text text-transparent">
                Smarter Shipment
              </span>{' '}
              Management.
            </h1>

            {/* Subtitle / Description */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              LogiSphere connects shippers, enterprise businesses, and verified logistics carriers
              into one seamless ecosystem. Automate marketplace matching, optimize fleet dispatch,
              and track consignments with real-time Indian PIN-code intelligence.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Button
                to="/register"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                className="w-full sm:w-auto"
              >
                Get Started
              </Button>
              <Button
                href="#platform-preview"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Explore Platform
              </Button>
            </div>

            {/* Quick Track Input Bar */}
            <div className="pt-3 max-w-lg mx-auto lg:mx-0">
              <form
                onSubmit={handleQuickTrack}
                className="flex items-center p-1.5 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all"
              >
                <div className="pl-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Enter Consignment or Tracking ID (e.g. TRK-MUM-560001)"
                  className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
                >
                  Track Now
                </button>
              </form>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-600" />
                  Instant PIN-code lookup
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  Zero login required for public tracking
                </span>
              </div>
            </div>

            {/* Key Trust Signals */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 text-left">
              <div>
                <div className="text-xl font-bold text-navy-900">5 Major</div>
                <div className="text-xs text-slate-500">Indian Metro Hubs</div>
              </div>
              <div>
                <div className="text-xl font-bold text-navy-900">15-Min</div>
                <div className="text-xs text-slate-500">Cascade Dispatch Match</div>
              </div>
              <div>
                <div className="text-xl font-bold text-navy-900">100%</div>
                <div className="text-xs text-slate-500">Milestone Telemetry</div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Logistics Visual Dashboard */}
          <div className="lg:col-span-5 relative">
            {/* Visual Container Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 sm:p-6 relative backdrop-blur-sm">
              {/* Header of Mockup Card */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">CONSIGNMENT DISPATCH</div>
                    <div className="text-[11px] text-slate-500 font-mono">TRK-8821-MUM-BLR</div>
                  </div>
                </div>
                <Badge variant="accent" size="xs">
                  IN TRANSIT • ON TIME
                </Badge>
              </div>

              {/* Corridor Route Visualizer */}
              <div className="py-4 my-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span>Mumbai Central (400001)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent-600" />
                    <span>Bengaluru Hub (560001)</span>
                  </div>
                </div>

                {/* Progress Bar with nodes */}
                <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden my-3">
                  <div className="absolute left-0 top-0 bottom-0 w-2/3 bg-gradient-to-r from-brand-600 to-accent-500 rounded-full" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Picked Up: Pune Corridor</span>
                  <span className="font-semibold text-slate-700">650 km completed / 980 km</span>
                </div>
              </div>

              {/* Operational Metrics Sub-grid */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 my-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    <span>Est. Delivery</span>
                  </div>
                  <div className="text-sm font-bold text-navy-900 mt-1">Today, 18:30 IST</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    Within SLA Window
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-accent-600" />
                    <span>Package Weight</span>
                  </div>
                  <div className="text-sm font-bold text-navy-900 mt-1">45.5 kg (Volumetric)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tata 407 (Medium)</div>
                </div>
              </div>

              {/* Assigned Carrier & Driver Badge */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold">
                    VK
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      Vikram Kumar (Driver)
                    </div>
                    <div className="text-[10px] text-slate-500">MH-12-DE-9081 • Apex Logistics</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified</span>
                </div>
              </div>

              {/* Floating Decorative Chip */}
              <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl border border-slate-200 shadow-lg hidden sm:flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">B2B Marketplace Match</div>
                  <div className="text-[11px] text-slate-500">Auto-allocated in 4m 12s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
