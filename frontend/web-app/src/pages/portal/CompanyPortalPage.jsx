import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  Truck,
  Users,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function CompanyPortalPage() {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'dispatch' | 'fleet' | 'reports'

  // 15-Minute Countdown Timer for marketplace offer
  const [timeLeftSec, setTimeLeftSec] = useState(844); // 14 mins 4s
  const [offerAccepted, setOfferAccepted] = useState(false);

  useEffect(() => {
    if (timeLeftSec <= 0 || offerAccepted) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSec, offerAccepted]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Drivers and Vehicles
  const [drivers, setDrivers] = useState([
    {
      id: 'drv_1',
      name: 'Vikram Kumar',
      phone: '+91 98201 12345',
      license: 'MH-1420180029',
      status: 'ASSIGNED',
      currentShipment: 'TRK-8821',
    },
    {
      id: 'drv_2',
      name: 'Suresh Verma',
      phone: '+91 98450 67890',
      license: 'KA-0120194412',
      status: 'AVAILABLE',
      currentShipment: 'None',
    },
    {
      id: 'drv_3',
      name: 'Arjun Rao',
      phone: '+91 94401 55678',
      license: 'TS-0920207812',
      status: 'AVAILABLE',
      currentShipment: 'None',
    },
  ]);

  const [vehicles, setVehicles] = useState([
    {
      id: 'veh_1',
      plate: 'MH-12-DE-9081',
      model: 'Tata 407 (Medium)',
      capacityKg: 2500,
      status: 'ASSIGNED',
      hub: 'Mumbai Central',
    },
    {
      id: 'veh_2',
      plate: 'KA-05-AA-1022',
      model: 'Eicher Pro 2049 (Heavy)',
      capacityKg: 5000,
      status: 'AVAILABLE',
      hub: 'Bengaluru Hub',
    },
    {
      id: 'veh_3',
      plate: 'DL-01-AX-4433',
      model: 'Ashok Leyland Dost (Light)',
      capacityKg: 1250,
      status: 'AVAILABLE',
      hub: 'Delhi NCR Hub',
    },
  ]);

  // Dispatch Assignment State
  const [selectedDriver, setSelectedDriver] = useState('drv_2');
  const [selectedVehicle, setSelectedVehicle] = useState('veh_2');
  const [dispatchStatus, setDispatchStatus] = useState(null);

  const handleAssignDispatch = (e) => {
    e.preventDefault();
    setDispatchStatus({
      status: 'RESERVED',
      message: '2-minute atomic reservation locked. Driver and vehicle assigned successfully!',
    });

    // Update statuses
    setDrivers((prev) =>
      prev.map((d) => (d.id === selectedDriver ? { ...d, status: 'ASSIGNED' } : d))
    );
    setVehicles((prev) =>
      prev.map((v) => (v.id === selectedVehicle ? { ...v, status: 'ASSIGNED' } : v))
    );
  };

  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerateReport = () => {
    setReportGenerated(true);
  };

  const navItems = [
    { id: 'inbox', label: 'Marketplace Offers (15m)', icon: Inbox },
    { id: 'dispatch', label: 'Dispatch Desk', icon: Send },
    { id: 'fleet', label: 'Fleet & Drivers', icon: Truck },
    { id: 'reports', label: 'Analytics & Reports', icon: FileSpreadsheet },
  ];

  return (
    <PortalLayout
      title="Apex Express Logistics — Operations Portal"
      subtitle="Accept marketplace bids, manage vehicle capacity, and orchestrate atomic dispatch"
      role="COMPANY"
      roleName="Logistics Carrier Portal"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Tab 1: Marketplace Offers Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">
                Incoming Marketplace Consignment Offers
              </h2>
              <p className="text-xs text-slate-500">
                LogiSphere matching engine routes high-priority shipments with strict 15-minute SLA
                windows
              </p>
            </div>
            <Badge variant="brand" size="sm">
              Tier 1 Preferred Carrier
            </Badge>
          </div>

          {/* Active Offer Card */}
          {!offerAccepted ? (
            <div className="bg-white rounded-2xl border-2 border-brand-500 shadow-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                      TRK-9042-DEL-BOM
                    </span>
                    <h3 className="text-lg font-bold text-navy-900 mt-1">
                      Delhi NCR Hub (110001) → Mumbai Central Hub (400001)
                    </h3>
                  </div>
                </div>

                {/* 15-Min Timer Display */}
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Offer Response Window
                    </div>
                    <div className="text-xl font-mono font-extrabold text-amber-800">
                      {formatTimer(timeLeftSec)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Quoted Freight Rate</span>
                  <div className="text-base font-bold text-navy-900 mt-1">₹4,850.00</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Instant Bank Payout
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Total Consignment Weight</span>
                  <div className="text-base font-bold text-navy-900 mt-1">120.0 kg</div>
                  <span className="text-[10px] text-slate-500">Volumetric: 95 kg</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Required Vehicle Class</span>
                  <div className="text-base font-bold text-navy-900 mt-1">Light / Medium Truck</div>
                  <span className="text-[10px] text-slate-500">Min. 500 kg payload</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Pickup Schedule</span>
                  <div className="text-base font-bold text-navy-900 mt-1">Today by 15:00</div>
                  <span className="text-[10px] text-brand-600 font-semibold">Doorstep Origin</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl"
                >
                  Decline (Pass to Next Carrier)
                </button>
                <Button
                  onClick={() => setOfferAccepted(true)}
                  variant="primary"
                  size="md"
                  icon={CheckCircle2}
                  iconPosition="left"
                >
                  Accept Consignment Order
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Consignment TRK-9042-DEL-BOM Accepted!
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Order locked. Proceed to Dispatch Desk to assign driver and vehicle.
                  </p>
                </div>
              </div>
              <Button onClick={() => setActiveTab('dispatch')} variant="secondary" size="sm">
                Go to Dispatch Desk
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Dispatch Desk */}
      {activeTab === 'dispatch' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-navy-900">
                  Atomic Driver & Vehicle Dispatch
                </h2>
                <p className="text-xs text-slate-500">
                  Enforces 1-to-1 active allocation with concurrency-safe 2-minute reservation locks
                </p>
              </div>
              <Badge variant="accent" size="sm">
                Active Assignment Safety
              </Badge>
            </div>

            {dispatchStatus && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{dispatchStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleAssignDispatch} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Driver Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Select Available Driver
                  </label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-500"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.status === 'ASSIGNED'}>
                        {d.name} ({d.license}) — [{d.status}]
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Only AVAILABLE drivers can be locked to new assignments
                  </span>
                </div>

                {/* Vehicle Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Select Available Fleet Vehicle
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-500"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.status === 'ASSIGNED'}>
                        {v.plate} • {v.model} ({v.capacityKg} kg payload) — [{v.status}]
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Capacity checks enforce payload weight requirements
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">Target Consignment to Dispatch</div>
                <div className="text-slate-600 font-mono">
                  TRK-9042-DEL-BOM • Delhi to Mumbai • 120.0 kg
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="md" icon={Send} iconPosition="left">
                  Lock & Confirm Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Fleet & Drivers Registry */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Driver Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-navy-900">Commercial Driver Roster</h3>
              <Badge variant="brand" size="xs">
                {drivers.filter((d) => d.status === 'AVAILABLE').length} Available
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              {drivers.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">{d.name}</div>
                    <div className="text-slate-500 text-[11px]">
                      License: {d.license} • Phone: {d.phone}
                    </div>
                  </div>
                  <Badge variant={d.status === 'AVAILABLE' ? 'success' : 'navy'} size="xs">
                    {d.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Fleet */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-navy-900">Fleet Vehicles</h3>
              <Badge variant="accent" size="xs">
                {vehicles.filter((v) => v.status === 'AVAILABLE').length} Available
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {v.plate} ({v.model})
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Capacity: {v.capacityKg} kg • Base Hub: {v.hub}
                    </div>
                  </div>
                  <Badge variant={v.status === 'AVAILABLE' ? 'success' : 'navy'} size="xs">
                    {v.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Reports & Analytics */}
      {activeTab === 'reports' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-navy-900">
                Operational Reports & CSV Export
              </h2>
              <p className="text-xs text-slate-500">
                Temporary export files generated with authenticated 5-minute auto-expiry security
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800">Monthly Fulfillment & SLA Summary</div>
                <p className="text-slate-600">
                  Includes driver assignments, route pickup-to-delivery latencies, and total revenue
                  in INR paise.
                </p>
                <div className="text-[11px] text-slate-500">
                  File Format: CSV • Retention Window: 5 minutes from generation
                </div>
              </div>

              {reportGenerated ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Report Generated: rep_179378929_apex.csv</span>
                  </div>
                  <div className="text-emerald-700 text-[11px]">
                    Link expires automatically in 04:59. Authenticated token validated.
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Simulated CSV Download: Apex_Operations_Nov2026.csv')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Now</span>
                  </button>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateReport}
                  variant="primary"
                  size="md"
                  icon={Download}
                  iconPosition="left"
                >
                  Generate 5-Minute Secure CSV
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
