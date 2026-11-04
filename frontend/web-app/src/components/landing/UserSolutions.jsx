import React from 'react';
import { User, Building, Truck, Check, ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';

export default function UserSolutions() {
  const solutions = [
    {
      role: 'Individual Shippers',
      badge: 'B2C Logistics',
      icon: User,
      title: 'Effortless Personal Parcel Booking',
      description:
        'Ship packages across Indian cities with transparent volumetric pricing, instant carrier matching, and live door-to-door milestone tracking.',
      features: [
        'Instant PIN-code lookup across 5 metro corridors',
        'Transparent upfront pricing in INR paise',
        'Public tracking lookup with zero mandatory signups',
        'Direct driver pickup and doorstep delivery confirmation',
      ],
      ctaText: 'Ship a Package',
      ctaTo: '/register?role=CUSTOMER',
      color: 'brand',
    },
    {
      role: 'Enterprise & Businesses',
      badge: 'B2B Freight',
      icon: Building,
      title: 'High-Volume Commercial Consignments',
      description:
        'Scale your supply chain with batch consignment orchestration, centralized organizational billing, and auditable 5-minute exportable reports.',
      features: [
        'Multi-package freight with automated volumetric weight',
        'Guaranteed 15-minute carrier allocation windows',
        'Strict SLA monitoring and automated breach alerts',
        'Exportable fulfillment and latency analytics (CSV)',
      ],
      ctaText: 'Scale Your Freight',
      ctaTo: '/register?role=BUSINESS',
      color: 'accent',
      featured: true,
    },
    {
      role: 'Logistics Companies & Fleets',
      badge: 'Fleet Operators',
      icon: Truck,
      title: 'Maximize Fleet Capacity & Dispatch',
      description:
        'Monetize your vehicle capacity, eliminate empty return trips, and streamline driver dispatch with atomic 2-minute reservation locks.',
      features: [
        'Real-time marketplace order intake matching your routes',
        '1-to-1 active driver and vehicle allocation locks',
        'Driver mobile milestone tracking (Pickup to Delivery)',
        'Full administrative vetting and tenant isolation',
      ],
      ctaText: 'Join as Carrier',
      ctaTo: '/register?role=COMPANY',
      color: 'navy',
    },
  ];

  return (
    <section id="solutions" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="brand" size="sm">
            Targeted Solutions
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            Tailored for Every Stakeholder in Modern Logistics
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            Whether you are shipping an individual parcel, operating an enterprise supply chain, or
            managing a commercial fleet, LogiSphere delivers purpose-built tools.
          </p>
        </div>

        {/* 3 Solutions Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {solutions.map((item, idx) => {
            const Icon = item.icon;
            const isFeatured = item.featured;
            return (
              <div
                key={idx}
                className={`rounded-2xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                  isFeatured
                    ? 'bg-gradient-to-b from-brand-50/50 via-white to-white border-2 border-brand-500 shadow-card-hover -translate-y-2'
                    : 'bg-white border border-slate-200/90 shadow-subtle hover:shadow-card-hover'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm tracking-wide">
                    MOST POPULAR FOR ENTERPRISE
                  </div>
                )}

                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isFeatured ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant={isFeatured ? 'brand' : 'neutral'} size="xs">
                      {item.badge}
                    </Badge>
                  </div>

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {item.role}
                  </div>
                  <h3 className="text-xl font-bold text-navy-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal mb-6">
                    {item.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 mb-8">
                    {item.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isFeatured
                              ? 'bg-brand-100 text-brand-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <span className="text-xs text-slate-700 font-medium leading-tight">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <Button
                  to={item.ctaTo}
                  variant={isFeatured ? 'primary' : 'outline'}
                  size="md"
                  icon={ArrowRight}
                  className="w-full"
                >
                  {item.ctaText}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
