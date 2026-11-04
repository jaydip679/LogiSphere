import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Badge from '../components/common/Badge';

export default function PublicTrackingPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('trackingNumber') || 'TRK-8821-MUM-BLR';
  const [trackingId, setTrackingId] = useState(initialId);
  const [activeConsignment, setActiveConsignment] = useState(null);

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleSearch = (idToSearch) => {
    const id = idToSearch || trackingId;
    if (!id.trim()) return;

    // Simulated shipment tracking lookup
    setActiveConsignment({
      trackingNumber: id.trim().toUpperCase(),
      status: 'IN_TRANSIT',
      carrier: 'Apex Express Logistics',
      origin: { hub: 'Mumbai Hub', pin: '400001', state: 'Maharashtra' },
      destination: { hub: 'Bengaluru Hub', pin: '560001', state: 'Karnataka' },
      estimatedDelivery: 'Today, 18:30 IST',
      driver: { name: 'Vikram Kumar', vehicle: 'Tata 407 (MH-12-DE-9081)' },
      weight: '45.5 kg',
      currentLocation: 'Pune Bypass Expressway, Maharashtra',
      milestones: [
        {
          status: 'CREATED',
          label: 'Shipment Created',
          timestamp: '04 Nov 2026, 08:15 IST',
          completed: true,
        },
        {
          status: 'PICKED_UP',
          label: 'Picked Up by Driver',
          timestamp: '04 Nov 2026, 09:30 IST',
          completed: true,
        },
        {
          status: 'IN_TRANSIT',
          label: 'In Transit on National Corridor',
          timestamp: '04 Nov 2026, 14:15 IST',
          completed: true,
          active: true,
        },
        {
          status: 'OUT_FOR_DELIVERY',
          label: 'Out for Doorstep Delivery',
          timestamp: 'Pending Arrival at BLR Hub',
          completed: false,
        },
        {
          status: 'DELIVERED',
          label: 'Delivered to Consignee',
          timestamp: 'Estimated 18:30 IST',
          completed: false,
        },
      ],
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch(trackingId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <Badge variant="brand" size="sm">
              Public Telemetry Search
            </Badge>
            <h1 className="text-3xl font-bold text-navy-900 tracking-tight">
              Track Your Consignment
            </h1>
            <p className="text-sm text-slate-600">
              Live Indian corridor tracking with append-only milestone verification
            </p>
          </div>

          {/* Search Box */}
          <form
            onSubmit={onSubmit}
            className="flex items-center p-2 bg-white rounded-2xl border border-slate-200 shadow-card mb-8"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter Consignment ID (e.g. TRK-8821-MUM-BLR)"
              className="w-full px-3 py-2 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shrink-0 transition-colors shadow-sm"
            >
              Search Status
            </button>
          </form>

          {/* Result Card */}
          {activeConsignment && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              {/* Banner */}
              <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-brand-300 font-medium">Tracking Number</div>
                  <div className="text-xl font-mono font-bold">
                    {activeConsignment.trackingNumber}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Carrier: {activeConsignment.carrier}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="accent" size="sm">
                    {activeConsignment.status}
                  </Badge>
                </div>
              </div>

              {/* Corridor Route */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Origin</div>
                      <div className="text-sm font-bold text-navy-900">
                        {activeConsignment.origin.hub} ({activeConsignment.origin.pin})
                      </div>
                      <div className="text-xs text-slate-500">{activeConsignment.origin.state}</div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center text-slate-300">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-50 border border-accent-200 flex items-center justify-center text-accent-600">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Destination</div>
                      <div className="text-sm font-bold text-navy-900">
                        {activeConsignment.destination.hub} ({activeConsignment.destination.pin})
                      </div>
                      <div className="text-xs text-slate-500">
                        {activeConsignment.destination.state}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                    <div className="text-slate-500 font-medium">Estimated Arrival</div>
                    <div className="font-bold text-navy-900">
                      {activeConsignment.estimatedDelivery}
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones Flow */}
              <div className="p-6 sm:p-8">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-6">
                  Milestone Progression Timeline
                </h2>
                <div className="space-y-6">
                  {activeConsignment.milestones.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                            m.completed
                              ? 'bg-emerald-500 text-white'
                              : m.active
                                ? 'bg-brand-600 text-white animate-pulse'
                                : 'bg-slate-100 text-slate-400 border border-slate-300'
                          }`}
                        >
                          {m.completed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        {idx < activeConsignment.milestones.length - 1 && (
                          <div
                            className={`w-0.5 h-10 mt-1 ${
                              m.completed ? 'bg-emerald-400' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1 pt-0.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span
                            className={`text-sm font-semibold ${
                              m.completed ? 'text-navy-900' : 'text-slate-400'
                            }`}
                          >
                            {m.label}
                          </span>
                          <span className="text-xs font-mono text-slate-500">{m.timestamp}</span>
                        </div>
                        {m.active && (
                          <div className="mt-1 text-xs text-brand-600 font-medium">
                            Current Telemetry Checkpoint: {activeConsignment.currentLocation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
