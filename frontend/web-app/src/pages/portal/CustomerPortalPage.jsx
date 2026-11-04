import React, { useState, useEffect } from 'react';
import {
  Package,
  PlusCircle,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'new' | 'tracking'
  const [isPolling, setIsPolling] = useState(true);
  const [lastPollTime, setLastPollTime] = useState(new Date().toLocaleTimeString());

  // Form State
  const [originPin, setOriginPin] = useState('400001'); // Mumbai
  const [destinationPin, setDestinationPin] = useState('560001'); // Bengaluru
  const [lengthCm, setLengthCm] = useState(40);
  const [widthCm, setWidthCm] = useState(30);
  const [heightCm, setHeightCm] = useState(20);
  const [weightKg, setWeightKg] = useState(15);
  const [description, setDescription] = useState('Industrial components & electronics');
  const [selectedConsignment, setSelectedConsignment] = useState(null);

  // Dynamic estimated rate calculation
  const volumetricWeight = ((lengthCm * widthCm * heightCm) / 5000).toFixed(1);
  const billableWeight = Math.max(Number(weightKg), Number(volumetricWeight));
  // Est distance: if different pins, approx 850km, else 50km
  const estDistanceKm = originPin === destinationPin ? 45 : 845;
  const estimatedPricePaise = Math.round((200 + estDistanceKm * 8.5 + billableWeight * 65) * 100);
  const estimatedPriceRupees = (estimatedPricePaise / 100).toFixed(2);

  // Shipments List State
  const [shipments, setShipments] = useState([
    {
      id: 'shp_101',
      trackingNumber: 'TRK-8821-MUM-BLR',
      originPin: '400001 (Mumbai)',
      destinationPin: '560001 (Bengaluru)',
      weight: '45.5 kg',
      status: 'IN_TRANSIT',
      carrier: 'Apex Express Logistics',
      quotedPrice: '₹1,850.00',
      createdAt: 'Today, 08:30 IST',
      currentLocation: 'Pune Expressway Checkpoint',
    },
    {
      id: 'shp_102',
      trackingNumber: 'TRK-9042-DEL-HYD',
      originPin: '110001 (Delhi NCR)',
      destinationPin: '500001 (Hyderabad)',
      weight: '12.0 kg',
      status: 'UNMATCHED',
      carrier: 'Pending Carrier Re-match',
      quotedPrice: '₹1,240.00',
      createdAt: 'Today, 10:15 IST',
      currentLocation: 'Delhi Dispatch Hub',
    },
    {
      id: 'shp_103',
      trackingNumber: 'TRK-7719-BLR-MAA',
      originPin: '560001 (Bengaluru)',
      destinationPin: '600001 (Chennai)',
      weight: '80.0 kg',
      status: 'DELIVERED',
      carrier: 'Bharat Freight Lines',
      quotedPrice: '₹3,200.00',
      createdAt: 'Yesterday, 14:00 IST',
      currentLocation: 'Delivered to Doorstep',
    },
  ]);

  // Polling simulation for active tracking
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => {
      setLastPollTime(new Date().toLocaleTimeString());
    }, 6000);
    return () => clearInterval(interval);
  }, [isPolling]);

  const handleCreateShipment = (e) => {
    e.preventDefault();
    const newId = `shp_${Date.now().toString().slice(-4)}`;
    const newTracking = `TRK-${originPin.slice(0, 3)}-${destinationPin.slice(0, 3)}-${Date.now().toString().slice(-3)}`;
    const newShipment = {
      id: newId,
      trackingNumber: newTracking,
      originPin: `${originPin} (Hub)`,
      destinationPin: `${destinationPin} (Hub)`,
      weight: `${billableWeight} kg`,
      status: 'MATCHING',
      carrier: 'Cascade Bidding in Progress',
      quotedPrice: `₹${estimatedPriceRupees}`,
      createdAt: 'Just now',
      currentLocation: 'Origin Dispatch Facility',
    };
    setShipments([newShipment, ...shipments]);
    setSelectedConsignment(newShipment);
    setActiveTab('shipments');
  };

  const handleRetryMatching = (id) => {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: 'MATCHING', carrier: 'Re-matching eligible carriers...' } : s
      )
    );
  };

  const handleCancelShipment = (id) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
  };

  const navItems = [
    { id: 'shipments', label: 'My Consignments', icon: Package },
    { id: 'new', label: 'Create Consignment', icon: PlusCircle },
    { id: 'tracking', label: 'Live Telemetry', icon: RefreshCw },
  ];

  return (
    <PortalLayout
      title="Shipper Consignment Portal"
      subtitle="Book consignments, monitor marketplace matching, and track active deliveries"
      role="CUSTOMER"
      roleName="Shipper Portal"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Tab 1: Shipments List */}
      {activeTab === 'shipments' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Active In Transit</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">1 Shipment</div>
              <div className="text-[11px] text-brand-600 mt-1">Pune Corridor Telemetry</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Pending Matches</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">1 Consignment</div>
              <div className="text-[11px] text-amber-600 mt-1">Awaiting carrier acceptance</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Completed Deliveries</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">1 Delivered</div>
              <div className="text-[11px] text-emerald-600 mt-1">100% SLA fulfillment</div>
            </div>
          </div>

          {/* Consignments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">Your Consignment Orders</h2>
                <p className="text-xs text-slate-500">
                  Track real-time status across Indian postal corridors
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('new')}
                variant="primary"
                size="sm"
                icon={PlusCircle}
                iconPosition="left"
              >
                New Consignment
              </Button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {shipments.map((s) => (
                <div
                  key={s.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-navy-900 text-sm">
                        {s.trackingNumber}
                      </span>
                      <Badge
                        variant={
                          s.status === 'DELIVERED'
                            ? 'success'
                            : s.status === 'IN_TRANSIT'
                              ? 'accent'
                              : s.status === 'UNMATCHED'
                                ? 'warning'
                                : 'brand'
                        }
                        size="xs"
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <div className="text-slate-600 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {s.originPin} → {s.destinationPin}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>Weight: {s.weight}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-800">{s.quotedPrice}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Carrier: <strong>{s.carrier}</strong> • {s.currentLocation}
                    </div>
                  </div>

                  {/* Actions per status */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {s.status === 'UNMATCHED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRetryMatching(s.id)}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg border border-brand-200"
                        >
                          Retry Matching
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelShipment(s.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    <Button
                      onClick={() => {
                        setSelectedConsignment(s);
                        setActiveTab('tracking');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      View Live Telemetry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: New Consignment Request Form */}
      {activeTab === 'new' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-navy-900">Create New Consignment Request</h2>
              <p className="text-xs text-slate-500">
                Enter Indian origin and destination postal codes with package dimensions for dynamic
                pricing
              </p>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-6">
              {/* Origin & Destination PINs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Pickup PIN Code (Origin Hub)
                  </label>
                  <select
                    value={originPin}
                    onChange={(e) => setOriginPin(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900"
                  >
                    <option value="400001">400001 — Mumbai Central Hub (Maharashtra)</option>
                    <option value="110001">110001 — Delhi NCR Hub (Delhi)</option>
                    <option value="560001">560001 — Bengaluru Hub (Karnataka)</option>
                    <option value="500001">500001 — Hyderabad Hub (Telangana)</option>
                    <option value="600001">600001 — Chennai Hub (Tamil Nadu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Delivery PIN Code (Destination)
                  </label>
                  <select
                    value={destinationPin}
                    onChange={(e) => setDestinationPin(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900"
                  >
                    <option value="560001">560001 — Bengaluru Hub (Karnataka)</option>
                    <option value="400001">400001 — Mumbai Central Hub (Maharashtra)</option>
                    <option value="110001">110001 — Delhi NCR Hub (Delhi)</option>
                    <option value="500001">500001 — Hyderabad Hub (Telangana)</option>
                    <option value="600001">600001 — Chennai Hub (Tamil Nadu)</option>
                  </select>
                </div>
              </div>

              {/* Package Dimensions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Package Dimensions (cm) & Physical Weight (kg)
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Length (cm)</span>
                    <input
                      type="number"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(Math.max(1, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Width (cm)</span>
                    <input
                      type="number"
                      value={widthCm}
                      onChange={(e) => setWidthCm(Math.max(1, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Height (cm)</span>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Weight (kg)</span>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(1, Number(e.target.value)))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Consignment Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Spare auto parts, packaged electronics"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              {/* Dynamic Estimated Pricing Breakdown */}
              <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                  <span>DYNAMIC ESTIMATED FREIGHT RATE</span>
                  <span className="text-base text-brand-700">₹{estimatedPriceRupees}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-2 border-t border-brand-100">
                  <div>Est. Distance: {estDistanceKm} km</div>
                  <div>Volumetric Wt: {volumetricWeight} kg</div>
                  <div>Billable Wt: {billableWeight} kg</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button onClick={() => setActiveTab('shipments')} variant="outline" size="md">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" icon={ArrowRight}>
                  Publish to Marketplace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Live Telemetry & Polling View */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Polling Header Indicator */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-bold text-navy-900 uppercase">
                  TanStack Telemetry Polling (5-10s interval)
                </div>
                <div className="text-xs text-slate-500">
                  Auto-refreshed at {lastPollTime} • Corridor: National Highway 48
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPolling(!isPolling)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  isPolling
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {isPolling ? 'Polling: ACTIVE' : 'Polling: PAUSED'}
              </button>
            </div>
          </div>

          {/* Active Consignment Detail */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-500">Active Consignment</span>
                <div className="text-lg font-mono font-bold text-navy-900">
                  {selectedConsignment ? selectedConsignment.trackingNumber : 'TRK-8821-MUM-BLR'}
                </div>
              </div>
              <Badge variant="accent" size="sm">
                IN TRANSIT (ON TIME)
              </Badge>
            </div>

            {/* Milestones */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-navy-900">Shipment Created & Quoted</div>
                  <div className="text-slate-500 text-[11px]">Today, 08:30 IST • Mumbai Hub</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-navy-900">Picked Up by Driver (Vikram Kumar)</div>
                  <div className="text-slate-500 text-[11px]">Today, 09:30 IST • Tata 407</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <div className="font-bold text-brand-700">
                    In Transit on Pune-Bengaluru Corridor
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Current GPS checkpoint: Pune Bypass Expressway • Speed: 62 km/h
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs opacity-50">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Delivered to Consignee</div>
                  <div className="text-slate-500 text-[11px]">
                    Estimated Arrival: Today, 18:30 IST
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
