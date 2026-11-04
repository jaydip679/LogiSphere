import React from 'react';
import { ArrowRight, ShieldCheck, Zap, Mail } from 'lucide-react';
import Button from '../common/Button';

export default function FinalCTA() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-brand-950 p-8 sm:p-12 lg:p-16 overflow-hidden text-center shadow-xl border border-navy-800">
          {/* Subtle background ambient glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-brand-200 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-accent-400" />
              <span>Modernize Your Supply Chain Today</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ready to Connect Your Logistics with Smarter Shipment Automation?
            </h2>

            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              Join shippers, enterprise distributors, and verified logistics operators across India.
              Automate cascade offers, lock fleet capacity, and track consignments with zero
              friction.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                to="/register"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-semibold"
              >
                Get Started Free
              </Button>
              <Button
                href="#contact"
                variant="outline"
                size="lg"
                icon={Mail}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40"
              >
                Contact Platform Team
              </Button>
            </div>

            {/* Bottom feature badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-400" />
                <span>Enterprise Multi-Tenant Security</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                <span>5 Indian Hub Corridors Supported</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                <span>Zero Mandatory Setup Fees</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
