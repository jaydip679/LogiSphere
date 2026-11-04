import React, { useState } from 'react';
import {
  Truck,
  Package,
  Navigation,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  ChevronRight,
  BarChart2,
  Users,
  AlertCircle,
} from 'lucide-react';
import Badge from '../common/Badge';

export default function PlatformPreview() {
  const [activeTab, setActiveTab] = useState('carrier');

  const tabs = [
    { id: 'carrier', name: 'Logistics Carrier Portal', icon: Truck },
    { id: 'shipment', name: 'Shipment Management', icon: Package },
    { id: 'tracking', name: 'Live Tracking Timeline', icon: Navigation },
    { id: 'dispatch', name: 'Fleet & Dispatch Desk', icon: Send },
  ];

  return (
    <section id="platform-preview" className="py-24 bg-slate-50/70 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="brand" size="sm">
            Interactive Product Tour
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            Designed for High-Velocity Logistics Teams
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            Explore illustrative previews of LogiSphere’s role-tailored workspaces built for
            seamless dispatch, consignment operations, and real-time tracking.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-navy-900 hover:bg-slate-100/80 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Mockup Container Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          {/* Mockup Window Chrome / Header */}
          <div className="bg-slate-100/80 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-slate-500 ml-3">
                https://app.logisphere.io/portal/
                {activeTab === 'carrier'
                  ? 'company/dashboard'
                  : activeTab === 'shipment'
                    ? 'customer/shipments'
                    : activeTab === 'tracking'
                      ? 'tracking/TRK-8821'
                      : 'dispatch/allocations'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="accent" size="xs">
                LIVE DEMO ENVIRONMENT
              </Badge>
            </div>
          </div>

          {/* Tab 1: Carrier Portal */}
          {activeTab === 'carrier' && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Carrier Top Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="text-xs text-slate-500 font-medium">Pending Offers</div>
                  <div className="text-2xl font-bold text-navy-900 mt-1">4 Active</div>
                  <div className="text-[11px] text-amber-600 font-medium mt-1">
                    Expires in &lt; 12 mins
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="text-xs text-slate-500 font-medium">Fleet In Transit</div>
                  <div className="text-2xl font-bold text-navy-900 mt-1">18 Vehicles</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    89% Capacity Utilized
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="text-xs text-slate-500 font-medium">Monthly Dispatches</div>
                  <div className="text-2xl font-bold text-navy-900 mt-1">342 Loads</div>
                  <div className="text-[11px] text-brand-600 font-medium mt-1">
                    +14% vs Previous Month
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="text-xs text-slate-500 font-medium">On-Time SLA</div>
                  <div className="text-2xl font-bold text-navy-900 mt-1">99.4%</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    Tier 1 Preferred Carrier
                  </div>
                </div>
              </div>

              {/* Pending Cascade Offer Card */}
              <div className="p-5 rounded-xl border-2 border-brand-500 bg-brand-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-navy-900">
                        New Marketplace Consignment Offer
                      </span>
                      <span className="text-xs font-mono bg-brand-100 text-brand-800 px-2 py-0.5 rounded font-semibold">
                        TRK-9042-DEL-BOM
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Route: <strong>Delhi NCR Hub (110001) → Mumbai Hub (400001)</strong> • 3
                      Packages • 120 kg • Quoted: <strong>₹4,850.00</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg">
                    Decline
                  </button>
                  <button className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm">
                    Accept Offer (08:44 remaining)
                  </button>
                </div>
              </div>

              {/* Active Dispatches Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                  <span>ACTIVE FLEET DISPATCH JOBS</span>
                  <span className="text-brand-600">Auto-refresh: 10s</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold text-slate-900">TRK-8821</span> • Mumbai →
                        Bengaluru
                      </div>
                    </div>
                    <div className="text-slate-600">Driver: Vikram Kumar (MH-12-DE-9081)</div>
                    <Badge variant="accent" size="xs">
                      IN TRANSIT (65%)
                    </Badge>
                  </div>
                  <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                      <div>
                        <span className="font-bold text-slate-900">TRK-8790</span> • Hyderabad →
                        Chennai
                      </div>
                    </div>
                    <div className="text-slate-600">Driver: Arjun Rao (TS-09-UB-4421)</div>
                    <Badge variant="brand" size="xs">
                      PICKED UP
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Shipment Management */}
          {activeTab === 'shipment' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-navy-900">Customer Shipment Orders</h3>
                  <p className="text-xs text-slate-500">
                    Consignments across Indian origin and destination postal codes
                  </p>
                </div>
                <button className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm">
                  + Create New Consignment
                </button>
              </div>

              {/* Shipment List Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-50 p-3 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <div className="col-span-3">Consignment ID</div>
                  <div className="col-span-3">Corridor (Origin → Drop)</div>
                  <div className="col-span-2">Weight / Rate</div>
                  <div className="col-span-2">Carrier</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-12 p-3.5 items-center hover:bg-slate-50/60">
                    <div className="col-span-3 font-mono font-bold text-navy-900">
                      TRK-8821-MUM-BLR
                    </div>
                    <div className="col-span-3 text-slate-700">400001 → 560001 (Mumbai to BLR)</div>
                    <div className="col-span-2 text-slate-900 font-semibold">
                      45.5 kg • ₹1,850.00
                    </div>
                    <div className="col-span-2 text-slate-600">Apex Logistics</div>
                    <div className="col-span-2 text-right">
                      <Badge variant="accent" size="xs">
                        IN TRANSIT
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 p-3.5 items-center hover:bg-slate-50/60">
                    <div className="col-span-3 font-mono font-bold text-navy-900">
                      TRK-7719-DEL-HYD
                    </div>
                    <div className="col-span-3 text-slate-700">110001 → 500001 (Delhi to HYD)</div>
                    <div className="col-span-2 text-slate-900 font-semibold">
                      80.0 kg • ₹3,200.00
                    </div>
                    <div className="col-span-2 text-slate-600">Bharat Freight Lines</div>
                    <div className="col-span-2 text-right">
                      <Badge variant="success" size="xs">
                        DELIVERED
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 p-3.5 items-center hover:bg-slate-50/60">
                    <div className="col-span-3 font-mono font-bold text-navy-900">
                      TRK-9102-MAA-BLR
                    </div>
                    <div className="col-span-3 text-slate-700">
                      600001 → 560001 (Chennai to BLR)
                    </div>
                    <div className="col-span-2 text-slate-900 font-semibold">15.0 kg • ₹950.00</div>
                    <div className="col-span-2 text-slate-400 italic">Matching Carrier...</div>
                    <div className="col-span-2 text-right">
                      <Badge variant="warning" size="xs">
                        OFFER PENDING
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Live Tracking Timeline */}
          {activeTab === 'tracking' && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Top Consignment Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Live Tracking ID</div>
                  <div className="text-lg font-bold text-navy-900 font-mono">
                    TRK-8821-MUM-BLR • Tata 407
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-emerald-700">
                    Live GPS Telemetry Active
                  </span>
                </div>
              </div>

              {/* Progress Milestones Bar */}
              <div className="py-4">
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold mb-3">
                  <div className="text-emerald-700 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span>Created</span>
                  </div>
                  <div className="text-emerald-700 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span>Picked Up</span>
                  </div>
                  <div className="text-brand-600 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-100 border-2 border-brand-600 flex items-center justify-center mb-1 animate-pulse">
                      <Truck className="w-4 h-4 text-brand-600" />
                    </div>
                    <span>In Transit</span>
                  </div>
                  <div className="text-slate-400 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                    </div>
                    <span>Delivered</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="w-3/4 bg-brand-600 h-full rounded-full" />
                </div>
              </div>

              {/* Timeline Events Log */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  APPEND-ONLY EVENT AUDIT LOG (IMMUTABLE)
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Transit Checkpoint: Pune Bypass Expressway
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Today, 14:15 IST • Lat: 18.5204, Lng: 73.8567 • Driver: Vikram Kumar
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Consignment Picked Up from Shipper Hub
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Today, 09:30 IST • Mumbai Hub (400001) • Verified by OTP
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Fleet & Dispatch Desk */}
          {activeTab === 'dispatch' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-navy-900">
                    Fleet Capacity & Atomic Dispatch Desk
                  </h3>
                  <p className="text-xs text-slate-500">
                    2-minute concurrency reservation lock for drivers and vehicles
                  </p>
                </div>
                <Badge variant="accent" size="sm">
                  1-to-1 Active Assignment Enforced
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicles Status */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
                    <span>Vehicle Fleet Registry</span>
                    <span className="text-emerald-600">8 Available / 10 Total</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">MH-12-DE-9081 (Tata 407)</div>
                        <div className="text-[11px] text-slate-500">
                          Capacity: 2,500 kg • Assigned to TRK-8821
                        </div>
                      </div>
                      <Badge variant="navy" size="xs">
                        ON DUTY
                      </Badge>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg flex items-center justify-between border border-emerald-100">
                      <div>
                        <div className="font-bold text-slate-900">KA-05-AA-1022 (Eicher Pro)</div>
                        <div className="text-[11px] text-slate-500">
                          Capacity: 5,000 kg • Ready for allocation
                        </div>
                      </div>
                      <Badge variant="success" size="xs">
                        AVAILABLE
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Drivers Status */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
                    <span>Driver Roster & Licensing</span>
                    <span className="text-emerald-600">12 Active Drivers</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">Vikram Kumar</div>
                        <div className="text-[11px] text-slate-500">
                          DL: MH-1420180029 • On Route MUM-BLR
                        </div>
                      </div>
                      <Badge variant="navy" size="xs">
                        ASSIGNED
                      </Badge>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg flex items-center justify-between border border-emerald-100">
                      <div>
                        <div className="font-bold text-slate-900">Suresh Verma</div>
                        <div className="text-[11px] text-slate-500">
                          DL: KA-0120194412 • Bengaluru Hub
                        </div>
                      </div>
                      <Badge variant="success" size="xs">
                        AVAILABLE
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
