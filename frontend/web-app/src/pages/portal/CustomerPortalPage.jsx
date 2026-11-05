import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'new' | 'tracking'
  const { user } = useAuth();

  // Shipments state
  const [shipments, setShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State for Booking
  const [senderName, setSenderName] = useState(user?.fullName || '');
  const [senderPhone, setSenderPhone] = useState(user?.phone?.replace('+91', '') || '9820012345');
  const [pickupAddress, setPickupAddress] = useState('Plot 44, MIDC Industrial Area');
  const [pickupCity, setPickupCity] = useState('Mumbai');
  const [pickupState, setPickupState] = useState('Maharashtra');
  const [pickupPinCode, setPickupPinCode] = useState('400001');

  const [recipientName, setRecipientName] = useState('Deepak Verma');
  const [recipientPhone, setRecipientPhone] = useState('9845012345');
  const [deliveryAddress, setDeliveryAddress] = useState('Electronic City Phase 1');
  const [deliveryCity, setDeliveryCity] = useState('Bengaluru');
  const [deliveryState, setDeliveryState] = useState('Karnataka');
  const [deliveryPinCode, setDeliveryPinCode] = useState('560001');

  const [category, setCategory] = useState('PARCEL');
  const [packageDescription, setPackageDescription] = useState('Industrial components & machinery spares');
  const [weightKg, setWeightKg] = useState(15);
  const [lengthCm, setLengthCm] = useState(40);
  const [widthCm, setWidthCm] = useState(30);
  const [heightCm, setHeightCm] = useState(20);

  // Price estimate from backend
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);

  // Live Telemetry Tab state
  const [telemetryTrackingNumber, setTelemetryTrackingNumber] = useState('');
  const [telemetryData, setTelemetryData] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState('');

  // Fetch real customer shipments
  const fetchShipments = useCallback(async () => {
    setLoadingShipments(true);
    try {
      const res = await apiClient.get('/api/v1/shipments');
      const items = res.data?.data?.items || [];
      setShipments(items);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
    } finally {
      setLoadingShipments(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Dynamic price estimate calculation from API
  useEffect(() => {
    if (pickupPinCode?.length === 6 && deliveryPinCode?.length === 6 && weightKg > 0) {
      const timer = setTimeout(async () => {
        setEstimating(true);
        try {
          const res = await apiClient.post('/api/v1/shipments/estimate-price', {
            pickupPinCode,
            deliveryPinCode,
            weightKg: Number(weightKg),
            category,
          });
          setEstimatedPrice(res.data?.data);
        } catch {
          // Keep previous estimate if failure
        } finally {
          setEstimating(false);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [pickupPinCode, deliveryPinCode, weightKg, category]);

  // Create Shipment Submit
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setBooking(true);
    setError('');
    setSuccessMsg('');

    try {
      const cleanSenderPhone = senderPhone.startsWith('+91') ? senderPhone : `+91${senderPhone}`;
      const cleanRecipientPhone = recipientPhone.startsWith('+91') ? recipientPhone : `+91${recipientPhone}`;

      const payload = {
        senderName: senderName.trim(),
        senderPhone: cleanSenderPhone,
        pickupAddress: pickupAddress.trim(),
        pickupCity: pickupCity.trim(),
        pickupState: pickupState.trim(),
        pickupPinCode: pickupPinCode.trim(),

        recipientName: recipientName.trim(),
        recipientPhone: cleanRecipientPhone,
        deliveryAddress: deliveryAddress.trim(),
        deliveryCity: deliveryCity.trim(),
        deliveryState: deliveryState.trim(),
        deliveryPinCode: deliveryPinCode.trim(),

        category,
        packageDescription: packageDescription.trim(),
        weightKg: Number(weightKg),
        lengthCm: Number(lengthCm),
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
      };

      const res = await apiClient.post('/api/v1/shipments', payload);
      const createdShipment = res.data?.data;

      setSuccessMsg(
        `Consignment ${createdShipment.trackingNumber} booked successfully! Dispatched to corridor matching engine.`
      );
      await fetchShipments();
      setActiveTab('shipments');
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to book consignment. Please check inputs.'
      );
    } finally {
      setBooking(false);
    }
  };

  // Cancel Shipment
  const handleCancelShipment = async (shipmentId) => {
    if (!window.confirm('Are you sure you want to cancel this consignment?')) return;
    try {
      await apiClient.post(`/api/v1/shipments/${shipmentId}/cancel`, {
        reason: 'Customer initiated cancellation from portal',
      });
      setSuccessMsg('Consignment cancelled successfully.');
      fetchShipments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel consignment.');
    }
  };

  // Retry Matching
  const handleRetryMatching = async (shipmentId) => {
    try {
      await apiClient.post(`/api/v1/shipments/${shipmentId}/retry-matching`);
      setSuccessMsg('Marketplace matching cascade re-triggered.');
      fetchShipments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to re-trigger matching.');
    }
  };

  // Search Telemetry
  const handleSearchTelemetry = async (trkNum) => {
    const num = trkNum || telemetryTrackingNumber;
    if (!num.trim()) return;
    setTelemetryLoading(true);
    setTelemetryError('');
    try {
      const res = await apiClient.get(`/api/v1/tracking/${num.trim().toUpperCase()}`);
      setTelemetryData(res.data?.data);
    } catch (err) {
      setTelemetryError(
        err.response?.status === 404
          ? `No telemetry tracking records found for ${num}`
          : 'Unable to retrieve tracking telemetry.'
      );
      setTelemetryData(null);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const navItems = [
    { id: 'shipments', label: 'My Consignments', icon: Package },
    { id: 'new', label: 'Create Consignment', icon: PlusCircle },
    { id: 'tracking', label: 'Live Telemetry', icon: RefreshCw },
  ];

  // Helper status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success" size="xs">DELIVERED</Badge>;
      case 'IN_TRANSIT':
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return <Badge variant="brand" size="xs">{status}</Badge>;
      case 'CONFIRMED':
      case 'ASSIGNED':
        return <Badge variant="accent" size="xs">{status}</Badge>;
      case 'MATCHING':
      case 'CREATED':
        return <Badge variant="warning" size="xs">MATCHING ENGINE</Badge>;
      case 'CANCELLED':
      case 'DELIVERY_FAILED':
        return <Badge variant="danger" size="xs">{status}</Badge>;
      default:
        return <Badge variant="slate" size="xs">{status}</Badge>;
    }
  };

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

      {/* Tab 1: Shipments List */}
      {activeTab === 'shipments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
            <div>
              <h2 className="text-base font-bold text-navy-900">Your Consignments</h2>
              <p className="text-xs text-slate-500">Live operational data backed by LogiSphere PostgreSQL</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchShipments}
                disabled={loadingShipments}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-navy-900 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingShipments ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Book Consignment</span>
              </button>
            </div>
          </div>

          {loadingShipments && shipments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading your consignments...
            </div>
          ) : shipments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {shipments.map((s) => {
                const priceInRupees = s.estimatedPricePaise
                  ? (s.estimatedPricePaise / 100).toFixed(2)
                  : 'N/A';
                return (
                  <div
                    key={s.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-navy-900">
                          {s.trackingNumber}
                        </span>
                        {getStatusBadge(s.status)}
                        <span className="text-xs text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Pickup Hub</span>
                          <strong>{s.pickupCity} ({s.pickupPinCode})</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Delivery Hub</span>
                          <strong>{s.deliveryCity} ({s.deliveryPinCode})</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Weight & Category</span>
                          <strong>{s.weightKg} kg • {s.category}</strong>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        Description: <em>{s.packageDescription}</em>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">Quoted Corridor Price</div>
                        <div className="text-lg font-bold text-navy-900">₹{priceInRupees}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTelemetryTrackingNumber(s.trackingNumber);
                            setActiveTab('tracking');
                            handleSearchTelemetry(s.trackingNumber);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg flex items-center gap-1"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </button>

                        {s.status === 'UNMATCHED' && (
                          <button
                            type="button"
                            onClick={() => handleRetryMatching(s.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                          >
                            Retry Matching
                          </button>
                        )}

                        {['CREATED', 'MATCHING', 'CONFIRMED'].includes(s.status) && (
                          <button
                            type="button"
                            onClick={() => handleCancelShipment(s.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-navy-900">No Consignments Booked Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven't created any consignments. Book your first freight delivery across India's smart corridor hubs.
              </p>
              <div className="pt-2">
                <Button onClick={() => setActiveTab('new')} variant="primary" size="sm" icon={PlusCircle}>
                  Book Your First Consignment
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Create Consignment */}
      {activeTab === 'new' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleCreateShipment} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-card">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Book Consignment Shipment</h2>
              <p className="text-xs text-slate-500">
                All bookings are persisted to PostgreSQL and dispatched to eligible verified carriers.
              </p>
            </div>

            {/* Sender / Pickup Section */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Origin / Pickup Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sender Phone (+91)</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pickup Street Address</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={pickupState}
                    onChange={(e) => setPickupState(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">PIN Code (6-digit)</label>
                  <input
                    type="text"
                    value={pickupPinCode}
                    onChange={(e) => setPickupPinCode(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Recipient / Delivery Section */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent-600" />
                <span>Destination / Consignee Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recipient Phone (+91)</label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Delivery Street Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={deliveryState}
                    onChange={(e) => setDeliveryState(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">PIN Code (6-digit)</label>
                  <input
                    type="text"
                    value={deliveryPinCode}
                    onChange={(e) => setDeliveryPinCode(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Package Specifications */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand-600" />
                <span>Package Specifications</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PARCEL">Standard Parcel</option>
                    <option value="DOCUMENT">Document / Courier</option>
                    <option value="CORPORATE">Corporate Shipment</option>
                    <option value="BULK">Bulk Freight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Length (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Width (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Package Contents Description</label>
                <input
                  type="text"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="e.g. Mechanical components, electronic accessories"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Price Preview & Submit */}
            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] text-slate-500">Estimated Delivery Price</div>
                <div className="text-xl font-bold text-navy-900">
                  {estimating ? (
                    <span className="text-xs text-slate-400 font-normal">Calculating rate...</span>
                  ) : estimatedPrice ? (
                    `₹${(estimatedPrice.estimatedPricePaise / 100).toFixed(2)}`
                  ) : (
                    '—'
                  )}
                </div>
                {estimatedPrice && (
                  <div className="text-[10px] text-slate-400">
                    Est. Distance: {estimatedPrice.estimatedDistanceKm} km
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={booking}
                icon={ArrowRight}
              >
                {booking ? 'Booking Consignment...' : 'Confirm & Dispatch Booking'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Live Telemetry */}
      {activeTab === 'tracking' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">Live Consignment Telemetry</h2>
              <p className="text-xs text-slate-500">
                Query append-only milestone events directly from Tracking Service
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchTelemetry();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={telemetryTrackingNumber}
                onChange={(e) => setTelemetryTrackingNumber(e.target.value)}
                placeholder="Enter Consignment Tracking Number (e.g. LSP-20261105-XXXXXX)"
                required
                className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 font-mono"
              />
              <button
                type="submit"
                disabled={telemetryLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center gap-1.5"
              >
                <Search className={`w-3.5 h-3.5 ${telemetryLoading ? 'animate-spin' : ''}`} />
                <span>Search</span>
              </button>
            </form>

            {telemetryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {telemetryError}
              </div>
            )}

            {telemetryData && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Tracking Number</span>
                    <span className="font-mono font-bold text-sm text-navy-900">
                      {telemetryData.trackingNumber}
                    </span>
                  </div>
                  {getStatusBadge(telemetryData.currentStatus)}
                </div>

                {/* Milestone events */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Milestone Progression Timeline
                  </div>
                  {telemetryData.timeline && telemetryData.timeline.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {telemetryData.timeline.map((item, idx) => (
                        <div key={item.id || idx} className="relative">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-600 ring-4 ring-white" />
                          <div className="text-xs">
                            <span className="font-bold text-navy-900">{item.status}</span>
                            <span className="text-slate-400 ml-2">
                              {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                            </span>
                            {item.location && (
                              <div className="text-slate-600 mt-0.5">{item.location}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No milestone events logged yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
