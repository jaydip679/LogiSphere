import React from 'react';
import {
  Store,
  Boxes,
  Truck,
  Send,
  Compass,
  BellRing,
  BarChart3,
  Building2,
  CheckCircle,
} from 'lucide-react';
import Badge from '../common/Badge';

export default function CoreFeatures() {
  const features = [
    {
      icon: Store,
      title: 'Smart Logistics Marketplace',
      tag: 'Bidding Engine',
      description:
        'Rule-based matching engine with 15-minute cascade windows. Automatically prioritizes top-rated carriers matching payload capacity and geographic coverage.',
      bullets: ['Automated cascade offers', 'Zero empty miles', 'Fair carrier ranking'],
      color: 'brand',
    },
    {
      icon: Boxes,
      title: 'Shipment Management',
      tag: 'Lifecycle Authority',
      description:
        'End-to-end consignment lifecycle management with volumetric weight calculations, multi-package support, and strict state transitions.',
      bullets: ['Volumetric rate pricing', 'State machine validation', 'Consignment grouping'],
      color: 'brand',
    },
    {
      icon: Truck,
      title: 'Fleet & Driver Management',
      tag: 'Resource Registry',
      description:
        'Comprehensive vehicle and driver registry with licensing verification, payload capacities (weight/volume), and real-time operational status tracking.',
      bullets: ['Active driver rosters', 'Vehicle payload specs', 'Maintenance readiness'],
      color: 'brand',
    },
    {
      icon: Send,
      title: 'Dispatch Management',
      tag: 'Atomic Reservation',
      description:
        'Concurrency-safe dispatch orchestration with 2-minute pending reservation locks, preventing double-assignment across simultaneous consignment requests.',
      bullets: ['1-to-1 active driver locks', 'Two-phase commit reserve', 'Auto-expiration'],
      color: 'brand',
    },
    {
      icon: Compass,
      title: 'Real-Time Shipment Tracking',
      tag: 'Corridor Telemetry',
      description:
        'Append-only tracking event store recording milestone progression (Picked Up → In Transit → Out For Delivery → Delivered) with route simulation.',
      bullets: ['Milestone progression', 'Indian corridor hubs', 'Zero event loss'],
      color: 'accent',
    },
    {
      icon: BellRing,
      title: 'Automated Notifications',
      tag: 'Event Driven',
      description:
        'Reliable SQS-driven event consumer sending transactional alerts to shippers, dispatchers, and drivers on milestone changes and critical SLA warnings.',
      bullets: ['Instant milestone alerts', 'In-app notification inbox', 'Dead-letter retry'],
      color: 'accent',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      tag: 'Operational Intelligence',
      description:
        'Generate exportable CSV operational reports covering fulfillment latency, driver SLAs, and carrier earnings with secure 5-minute auto-expiring links.',
      bullets: ['CSV data exports', 'Auto-expiring download links', 'Fulfillment metrics'],
      color: 'accent',
    },
    {
      icon: Building2,
      title: 'Multi-Tenant Organization',
      tag: 'Enterprise Isolation',
      description:
        'Strict logical data boundary enforcement with role-based access control (Admin, Company Owner, Logistics Manager, Dispatcher, Driver, Shipper).',
      bullets: ['Strict tenant isolation', 'Granular RBAC roles', 'Admin vetting approval'],
      color: 'accent',
    },
  ];

  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="brand" size="sm">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            Comprehensive Microservices Built for Scale
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            Every core logistics capability is engineered into modular, decoupled services designed
            for reliability, enterprise security, and seamless integration.
          </p>
        </div>

        {/* 8 Features 4x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isBrand = feature.color === 'brand';
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  {/* Top Icon & Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                        isBrand
                          ? 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white'
                          : 'bg-accent-50 text-accent-600 group-hover:bg-accent-600 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-mono">
                      {feature.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-navy-900 mb-2 group-hover:text-brand-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal mb-4">
                    {feature.description}
                  </p>
                </div>

                {/* Bullets */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  {feature.bullets.map((bullet, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium"
                    >
                      <CheckCircle
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isBrand ? 'text-brand-600' : 'text-accent-600'
                        }`}
                      />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
