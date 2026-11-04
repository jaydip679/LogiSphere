import React from 'react';
import { Users, PackageCheck, Zap, Navigation } from 'lucide-react';
import Badge from '../common/Badge';

export default function PlatformOverview() {
  const pillars = [
    {
      icon: Users,
      badge: 'B2B2C Network',
      title: 'Connect Shippers & Logistics Providers',
      description:
        'Bridge the gap between individual shippers, commercial enterprises, and verified logistics operators through an automated marketplace that allocates orders fairly and transparently.',
      highlight: 'Zero idle capacity & transparent rates',
      color: 'brand',
    },
    {
      icon: PackageCheck,
      badge: 'PIN-Code Intelligence',
      title: 'Simplify Consignment Booking',
      description:
        'Instant multi-package booking with automated volumetric weight calculations, straight-line Haversine distance estimation, and upfront INR pricing across 5 major Indian metro hubs.',
      highlight: 'Upfront rates with no hidden surcharges',
      color: 'accent',
    },
    {
      icon: Zap,
      badge: 'Automated Dispatch',
      title: 'Automate Fleet Operations',
      description:
        'Empower logistics dispatchers with 1-to-1 atomic vehicle and driver reservations, real-time payload capacity verification, and 15-minute cascade offer acceptance windows.',
      highlight: 'Prevents double-booking & SLA defaults',
      color: 'brand',
    },
    {
      icon: Navigation,
      badge: 'End-to-End Visibility',
      title: 'Transparent Shipment Tracking',
      description:
        'Provide shippers and recipients with milestone-by-milestone visibility from pickup to doorstep delivery, backed by append-only event streams and live corridor telemetry.',
      highlight: 'Real-time telemetry and instant updates',
      color: 'accent',
    },
  ];

  return (
    <section id="platform-overview" className="py-20 bg-slate-50/60 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="brand" size="sm">
            Unified Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            How LogiSphere Modernizes the Logistics Value Chain
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            A single, intelligent cloud platform engineered to eliminate operational silos between
            customers, dispatchers, fleet owners, and drivers.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            const isBrand = pillar.color === 'brand';
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-subtle hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  {/* Icon & Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isBrand
                          ? 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white'
                          : 'bg-accent-50 text-accent-600 group-hover:bg-accent-600 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant={isBrand ? 'brand' : 'accent'} size="xs">
                      {pillar.badge}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-navy-900 mb-2.5 group-hover:text-brand-600 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    {pillar.description}
                  </p>
                </div>

                {/* Bottom Highlight */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBrand ? 'bg-brand-600' : 'bg-accent-600'
                    }`}
                  />
                  <span>{pillar.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
