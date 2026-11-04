import React from 'react';
import { FileEdit, Cpu, CheckCircle2, UserCheck, MapPinned, ArrowRight } from 'lucide-react';
import Badge from '../common/Badge';

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: FileEdit,
      title: 'Create Consignment',
      subtitle: 'Shipper Request',
      description:
        'Shipper enters pickup/drop Indian PIN codes, package dimensions, and weight. Platform calculates volumetric rate and instant estimated pricing.',
    },
    {
      step: '02',
      icon: Cpu,
      title: 'Intelligent Matching',
      subtitle: 'Marketplace Engine',
      description:
        'LogiSphere queries verified carriers covering the corridor, verifying available fleet capacity and scoring top-rated logistics partners.',
    },
    {
      step: '03',
      icon: CheckCircle2,
      title: 'Carrier Acceptance',
      subtitle: '15-Min Cascade Offer',
      description:
        'Selected carrier receives an exclusive 15-minute offer window to accept and lock in the quoted shipping rate with SLA guarantees.',
    },
    {
      step: '04',
      icon: UserCheck,
      title: 'Automated Dispatch',
      subtitle: 'Driver & Fleet Lock',
      description:
        'Carrier dispatcher assigns a verified driver and vehicle via 2-minute atomic reservation, ensuring zero double-allocation.',
    },
    {
      step: '05',
      icon: MapPinned,
      title: 'Live Tracking & Delivery',
      subtitle: 'Doorstep Milestone',
      description:
        'Customer and dispatch monitor transit milestones in real time with GPS corridor simulation through to verified digital delivery confirmation.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-50/70 border-y border-slate-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="brand" size="sm">
            Operational Lifecycle
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            How LogiSphere Works End-to-End
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            A frictionless, automated journey that coordinates shippers, carriers, dispatchers, and
            drivers from initial request to verified delivery.
          </p>
        </div>

        {/* Process Steps */}
        <div className="relative">
          {/* Desktop connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-accent-300 -translate-y-12 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div>
                    {/* Step number badge & icon */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-md">
                        STEP {item.step}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Step Subtitle & Title */}
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {item.subtitle}
                    </div>
                    <h3 className="text-base font-bold text-navy-900 mb-2 group-hover:text-brand-600 transition-colors">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* Flow Arrow (Mobile/Tablet indication) */}
                  {idx < steps.length - 1 && (
                    <div className="lg:hidden mt-4 pt-3 border-t border-slate-100 flex items-center justify-end text-slate-400">
                      <span className="text-xs font-medium mr-1">Next Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
