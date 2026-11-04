import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, MapPin, ExternalLink, ArrowUpRight } from 'lucide-react';
import Logo from '../common/Logo';

export default function Footer() {
  const hubs = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Chennai'];

  return (
    <footer id="contact" className="bg-slate-50 border-t border-slate-200/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200">
          {/* Brand Info & Mission (Cols 1-2) */}
          <div className="lg:col-span-2 space-y-4">
            <Logo size="md" />
            <p className="text-sm text-slate-600 leading-relaxed font-normal max-w-sm">
              LogiSphere is an India-first connected logistics and supply chain SaaS platform.
              Unifying shippers, commercial enterprises, and verified fleet carriers through
              automated marketplace matching and real-time telemetry.
            </p>

            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Operational Metro Corridors
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hubs.map((hub) => (
                  <span
                    key={hub}
                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md"
                  >
                    <MapPin className="w-3 h-3 text-brand-600" />
                    <span>{hub}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Column: Platform */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">Platform</div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a href="#features" className="hover:text-brand-600 transition-colors">
                  Smart Marketplace
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-brand-600 transition-colors">
                  Shipment Management
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-brand-600 transition-colors">
                  Fleet & Dispatch
                </a>
              </li>
              <li>
                <Link to="/track" className="hover:text-brand-600 transition-colors">
                  Tracking Telemetry
                </Link>
              </li>
              <li>
                <a href="#platform-preview" className="hover:text-brand-600 transition-colors">
                  Interactive Preview
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Solutions */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Solutions
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a href="#solutions" className="hover:text-brand-600 transition-colors">
                  Individual Shippers
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-brand-600 transition-colors">
                  Enterprise B2B Freight
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-brand-600 transition-colors">
                  Fleet Operators
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-brand-600 transition-colors">
                  Commercial Drivers
                </a>
              </li>
              <li>
                <Link to="/register" className="hover:text-brand-600 transition-colors">
                  Carrier Onboarding
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Architecture & Contact */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Platform Contact
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="font-mono text-xs">contact@logisphere.local</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs">RS256 JWT Authentication</span>
              </li>
            </ul>

            <div className="pt-3">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Direct Portals
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <Link
                  to="/login"
                  className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  <span>Unified Sign In Portal</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/track"
                  className="text-slate-600 hover:text-brand-600 font-medium inline-flex items-center gap-1"
                >
                  <span>Public Consignment Search</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} LogiSphere Platform. Built for India-first multi-tenant
            logistics.
          </div>
          <div className="flex items-center gap-6">
            <span>Schema-Isolated PostgreSQL</span>
            <span>SQS Event Outbox</span>
            <span>REST API Gateway</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
