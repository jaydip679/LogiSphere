import React, { useState, useEffect, useCallback } from 'react';
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
  PlusCircle,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function CompanyPortalPage() {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'dispatch' | 'fleet' | 'reports'
  const { user } = useAuth();

  // Data states backed by real PostgreSQL
  const [offers, setOffers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dispatch desk selection
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Add Driver Modal / Form
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [addingDriver, setAddingDriver] = useState(false);

  // Add Vehicle Modal / Form
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleType, setVehicleType] = useState('FOUR_WHEELER');
  const [vehicleCapacity, setVehicleCapacity] = useState(2500);
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Fetch pending marketplace offers
  const fetchOffers = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/shipments/offers/inbox');
      setOffers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to fetch offers inbox:', err);
    }
  }, []);

  // Fetch assigned / company shipments
  const fetchShipments = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/shipments');
      const items = res.data?.data?.items || [];
      setShipments(items);
    } catch (err) {
      console.error('Failed to fetch company shipments:', err);
    }
  }, []);

  // Fetch drivers & vehicles from Fleet Service
  const fetchFleet = useCallback(async () => {
    try {
      const [drvRes, vehRes] = await Promise.all([
        apiClient.get('/api/v1/fleet/drivers'),
        apiClient.get('/api/v1/fleet/vehicles'),
      ]);
      setDrivers(drvRes.data?.data || []);
      setVehicles(vehRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch fleet:', err);
    }
  }, []);

  // Initial load & periodic poll
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffers(), fetchShipments(), fetchFleet()]).finally(() => {
      setLoading(false);
    });

    const interval = setInterval(() => {
      fetchOffers();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchOffers, fetchShipments, fetchFleet]);

  // Accept offer
  const handleAcceptOffer = async (offerId) => {
    setError('');
    setSuccessMsg('');
    try {
      await apiClient.post(`/api/v1/shipments/offers/${offerId}/accept`);
      setSuccessMsg('Marketplace offer accepted! Shipment moved to Dispatch Desk.');
      await Promise.all([fetchOffers(), fetchShipments()]);
      setActiveTab('dispatch');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept offer.');
    }
  };

  // Reject offer
  const handleRejectOffer = async (offerId) => {
    setError('');
    setSuccessMsg('');
    try {
      await apiClient.post(`/api/v1/shipments/offers/${offerId}/reject`, {
        reason: 'Declined by logistics carrier',
      });
      setSuccessMsg('Offer declined.');
      fetchOffers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject offer.');
    }
  };

  // Execute Dispatch Assignment
  const handleAssignDispatch = async (e) => {
    e.preventDefault();
    if (!selectedShipmentId || !selectedDriverId || !selectedVehicleId) {
      setError('Please select a shipment, driver, and vehicle.');
      return;
    }

    setAssigning(true);
    setError('');
    setSuccessMsg('');

    try {
      // Find driver user id
      const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
      const driverUserId = selectedDriver?.userId || selectedDriverId;

      await apiClient.post(`/api/v1/shipments/${selectedShipmentId}/assign`, {
        driverId: driverUserId,
        vehicleId: selectedVehicleId,
      });

      setSuccessMsg('Dispatch assigned successfully! Driver locked and shipment activated.');
      setSelectedShipmentId('');
      setSelectedDriverId('');
      setSelectedVehicleId('');
      await Promise.all([fetchShipments(), fetchFleet()]);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Dispatch assignment failed.'
      );
    } finally {
      setAssigning(false);
    }
  };

  // Add Driver
  const handleCreateDriver = async (e) => {
    e.preventDefault();
    setAddingDriver(true);
    setError('');
    setSuccessMsg('');

    try {
      // 1. Create Staff Driver in Auth Service
      const staffRes = await apiClient.post('/api/v1/organizations/staff', {
        fullName: driverName.trim(),
        email: driverEmail.trim().toLowerCase(),
        role: 'DRIVER',
        licenseNumber: driverLicense.trim(),
      });

      const staffUserId = staffRes.data?.data?.user?.id;

      // 2. Register in Fleet Service
      await apiClient.post('/api/v1/fleet/drivers', {
        name: driverName.trim(),
        licenseNumber: driverLicense.trim(),
        userId: staffUserId || null,
      });

      setSuccessMsg(
        `Driver ${driverName} registered successfully! An invitation email with a 6-digit activation code has been sent to ${driverEmail.trim()}. The driver can set their own private password at /activate.`
      );
      setShowAddDriver(false);
      setDriverName('');
      setDriverEmail('');
      setDriverLicense('');
      fetchFleet();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register driver.');
    } finally {
      setAddingDriver(false);
    }
  };

  // Add Vehicle
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    setAddingVehicle(true);
    setError('');
    setSuccessMsg('');

    try {
      await apiClient.post('/api/v1/fleet/vehicles', {
        registrationNumber: vehicleReg.trim().toUpperCase(),
        vehicleType,
        capacityKg: Number(vehicleCapacity),
      });

      setSuccessMsg(`Vehicle ${vehicleReg.toUpperCase()} added to fleet!`);
      setShowAddVehicle(false);
      setVehicleReg('');
      fetchFleet();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add vehicle.');
    } finally {
      setAddingVehicle(false);
    }
  };

  // Generate real CSV report
  const handleDownloadCsv = () => {
    if (shipments.length === 0) {
      setError('No shipment data available to export.');
      return;
    }

    const headers = ['Tracking Number', 'Status', 'Pickup Hub', 'Delivery Hub', 'Weight (kg)', 'Category', 'Created Date'];
    const rows = shipments.map((s) => [
      s.trackingNumber,
      s.status,
      `${s.pickupCity} (${s.pickupPinCode})`,
      `${s.deliveryCity} (${s.deliveryPinCode})`,
      s.weightKg,
      s.category,
      new Date(s.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logisphere_shipments_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItems = [
    { id: 'inbox', label: `Marketplace Offers (${offers.length})`, icon: Inbox },
    { id: 'dispatch', label: 'Dispatch Desk', icon: Send },
    { id: 'fleet', label: `Fleet & Drivers (${drivers.length})`, icon: Truck },
    { id: 'reports', label: 'Analytics & Reports', icon: FileSpreadsheet },
  ];

  // Shipments pending dispatch
  const pendingDispatchShipments = shipments.filter(
    (s) => s.status === 'CONFIRMED' || s.status === 'OFFER_ACCEPTED'
  );

  return (
    <PortalLayout
      title="Carrier Logistics Operations Portal"
      subtitle="Accept marketplace bids, manage vehicle capacity, and orchestrate atomic dispatch"
      role="COMPANY"
      roleName="Logistics Carrier Portal"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Marketplace Offers Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">Incoming Marketplace Consignment Offers</h2>
              <p className="text-xs text-slate-500">
                LogiSphere matching engine routes high-priority shipments with strict 15-minute SLA windows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchOffers}
                className="p-1.5 text-slate-500 hover:text-navy-900 rounded-lg border border-slate-200"
                title="Refresh inbox"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <Badge variant={offers.length > 0 ? 'warning' : 'slate'} size="sm">
                {offers.length} Active Offers
              </Badge>
            </div>
          </div>

          {offers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {offers.map((offer) => {
                const shipment = offer.shipment || {};
                const price = shipment.estimatedPricePaise
                  ? (shipment.estimatedPricePaise / 100).toFixed(2)
                  : '—';
                const expiresAt = offer.expiresAt ? new Date(offer.expiresAt).toLocaleTimeString() : '15m';

                return (
                  <div
                    key={offer.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Inbox className="w-5 h-5 text-brand-600" />
                          <span className="font-mono font-bold text-sm text-navy-900">
                            {shipment.trackingNumber || 'CONSIGNMENT'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expires at {expiresAt}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div>
                          Corridor: <strong>{shipment.pickupCity || 'Origin'} ({shipment.pickupPinCode})</strong> &rarr;{' '}
                          <strong>{shipment.deliveryCity || 'Destination'} ({shipment.deliveryPinCode})</strong>
                        </div>
                        <div>
                          Payload: <strong>{shipment.weightKg} kg</strong> • {shipment.category}
                        </div>
                        <div>
                          Contents: <em>{shipment.packageDescription || 'General Cargo'}</em>
                        </div>
                        <div className="pt-2 text-sm font-bold text-navy-900">
                          Payout Rate: <span className="text-emerald-700">₹{price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRejectOffer(offer.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptOffer(offer.id)}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                      >
                        Accept Consignment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-navy-900">No Pending Marketplace Offers</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Incoming shipment consignments matching your registered corridor hubs will appear here for a 15-minute acceptance window.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Dispatch Desk */}
      {activeTab === 'dispatch' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card">
            <h2 className="text-base font-bold text-navy-900">Consignment Dispatch Desk</h2>
            <p className="text-xs text-slate-500">
              Assign confirmed consignments to available fleet drivers and vehicles with two-phase reservation locking
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assignment Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assign Driver & Vehicle
              </h3>

              <form onSubmit={handleAssignDispatch} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Confirmed Consignment *</label>
                  <select
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose Consignment --</option>
                    {pendingDispatchShipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.trackingNumber} ({s.pickupCity} &rarr; {s.deliveryCity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Driver *</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose Available Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Vehicle *</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose Available Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.vehicleType} - {v.capacityKg} kg)
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={assigning || pendingDispatchShipments.length === 0}
                  className="w-full mt-2"
                >
                  {assigning ? 'Locking Reservation...' : 'Execute Atomic Dispatch'}
                </Button>
              </form>
            </div>

            {/* Active / Confirmed Shipments List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>COMPANY CONSIGNMENTS ({shipments.length})</span>
                  <button onClick={fetchShipments} className="text-slate-500 hover:text-navy-900 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {shipments.length > 0 ? (
                  <div className="divide-y divide-slate-100 text-xs">
                    {shipments.map((s) => (
                      <div key={s.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-navy-900">{s.trackingNumber}</div>
                          <div className="text-slate-500 mt-0.5">
                            {s.pickupCity} &rarr; {s.deliveryCity} • {s.weightKg} kg
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="accent" size="xs">
                            {s.status}
                          </Badge>
                          <div className="text-[11px] text-slate-400">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No consignments assigned to your organization yet. Accept incoming marketplace offers to dispatch orders.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fleet & Drivers */}
      {activeTab === 'fleet' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">Fleet & Personnel Roster</h2>
              <p className="text-xs text-slate-500">
                Manage carrier drivers, contact credentials, and vehicle payload capacity
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddDriver(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Driver</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddVehicle(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Vehicle</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drivers Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>REGISTERED DRIVERS ({drivers.length})</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              {drivers.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {drivers.map((d) => (
                    <div key={d.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-navy-900">{d.name}</div>
                        <div className="text-slate-500 text-[11px]">
                          License: {d.licenseNumber}
                        </div>
                      </div>
                      <Badge variant={d.status === 'AVAILABLE' ? 'success' : 'slate'} size="xs">
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No drivers provisioned yet. Click "Add Driver" to create a driver account.
                </div>
              )}
            </div>

            {/* Vehicles Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>FLEET VEHICLES ({vehicles.length})</span>
                <Truck className="w-4 h-4 text-slate-400" />
              </div>
              {vehicles.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {vehicles.map((v) => (
                    <div key={v.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-navy-900">{v.registrationNumber}</div>
                        <div className="text-slate-500 text-[11px]">
                          Type: {v.vehicleType} • Capacity: {v.capacityKg} kg
                        </div>
                      </div>
                      <Badge variant={v.status === 'AVAILABLE' ? 'success' : 'slate'} size="xs">
                        {v.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No vehicles registered yet. Click "Add Vehicle" to register a fleet truck.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Analytics & Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Total Consignments Handled</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">{shipments.length}</div>
              <div className="text-[11px] text-brand-600 mt-1">Direct from PostgreSQL</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Active Fleet Personnel</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">{drivers.length}</div>
              <div className="text-[11px] text-emerald-600 mt-1">Verified License Records</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Fleet Transport Units</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">{vehicles.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Multi-axle & Light Commercial</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-navy-900">Consignment Data Export</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Download a clean comma-separated values (CSV) export of all your organization's recorded consignments
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={shipments.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Consignment CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-navy-900">Add Fleet Driver</h3>
              <button onClick={() => setShowAddDriver(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Vikram Kumar"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Email (for portal login) *</label>
                <input
                  type="email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  placeholder="driver@apexlogistics.local"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driving License Number *</label>
                <input
                  type="text"
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                  placeholder="MH1420180029"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDriver(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDriver}
                  className="px-4 py-1.5 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg cursor-pointer"
                >
                  {addingDriver ? 'Provisioning...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-navy-900">Add Fleet Vehicle</h3>
              <button onClick={() => setShowAddVehicle(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registration Number (e.g. MH12DE9081) *
                </label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="MH12DE9081"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Classification *</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="FOUR_WHEELER">Four Wheeler (Light)</option>
                  <option value="TRUCK_SMALL">Small Commercial Truck</option>
                  <option value="TRUCK_LARGE">Heavy Cargo Truck</option>
                  <option value="THREE_WHEELER">Three Wheeler Cargo</option>
                  <option value="TWO_WHEELER">Two Wheeler Courier</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Capacity (kg) *</label>
                <input
                  type="number"
                  min="50"
                  value={vehicleCapacity}
                  onChange={(e) => setVehicleCapacity(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="px-4 py-1.5 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg cursor-pointer"
                >
                  {addingVehicle ? 'Registering...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
