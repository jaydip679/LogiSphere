import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ArrowRight,
  Package,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Badge from '../../components/common/Badge';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function DriverPortalPage() {
  const { user } = useAuth();
  const [assignedShipments, setAssignedShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  // Failure modal
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState('CONSIGNEE_UNAVAILABLE');

  // Fetch driver assignments
  const fetchAssigned = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/shipments/driver/assigned');
      setAssignedShipments(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load driver assignments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const activeShipment = assignedShipments.length > 0 ? assignedShipments[0] : null;

  const handleAdvanceMilestone = async (nextStatus) => {
    if (!activeShipment) return;
    setUpdating(true);
    setError('');
    setStatusMessage('');

    try {
      await apiClient.post(`/api/v1/shipments/${activeShipment.id}/milestones`, {
        status: nextStatus,
      });

      setStatusMessage(`Milestone updated to ${nextStatus}. Logged to immutable telemetry ledger.`);
      await fetchAssigned();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update milestone to ${nextStatus}.`);
    } finally {
      setUpdating(false);
    }
  };

  const handleReportFailure = async (e) => {
    e.preventDefault();
    if (!activeShipment) return;
    setUpdating(true);
    setError('');

    try {
      await apiClient.post(`/api/v1/shipments/${activeShipment.id}/milestones`, {
        status: 'DELIVERY_FAILED',
        failureReason,
      });

      setStatusMessage(`Delivery attempt failed marked: ${failureReason}. Dispatched to carrier manager.`);
      setFailureModalOpen(false);
      await fetchAssigned();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record failed delivery attempt.');
    } finally {
      setUpdating(false);
    }
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'ASSIGNED':
      case 'CONFIRMED':
        return { label: 'Confirm Cargo Pickup', nextStatus: 'PICKED_UP' };
      case 'PICKED_UP':
        return { label: 'Depart on Corridor (In Transit)', nextStatus: 'IN_TRANSIT' };
      case 'IN_TRANSIT':
        return { label: 'Out for Doorstep Delivery', nextStatus: 'OUT_FOR_DELIVERY' };
      case 'OUT_FOR_DELIVERY':
        return { label: 'Mark Consignment Delivered', nextStatus: 'DELIVERED' };
      default:
        return null;
    }
  };

  const nextAction = activeShipment ? getNextAction(activeShipment.status) : null;

  return (
    <PortalLayout
      title="Driver Mobile Dispatch View"
      subtitle={`Driver: ${user?.fullName || 'Active Driver'} • Mobile Operations Console`}
      role="DRIVER"
      roleName="Driver Interface"
    >
      <div className="max-w-xl mx-auto space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-600" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage('')} className="text-brand-600 hover:text-brand-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading && !activeShipment ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading assigned assignments...
          </div>
        ) : activeShipment ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Consignment
                </div>
                <div className="text-lg font-mono font-bold text-navy-900">
                  {activeShipment.trackingNumber}
                </div>
              </div>
              <Badge
                variant={
                  activeShipment.status === 'DELIVERED'
                    ? 'success'
                    : activeShipment.status === 'DELIVERY_FAILED'
                    ? 'danger'
                    : 'accent'
                }
                size="sm"
              >
                {activeShipment.status}
              </Badge>
            </div>

            {/* Route & Instructions */}
            <div className="space-y-4 text-xs">
              {/* Origin */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800">Pickup Location</span>
                  <p className="text-slate-600 mt-0.5">
                    {activeShipment.pickupAddress}, {activeShipment.pickupCity} ({activeShipment.pickupPinCode})
                  </p>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Sender: {activeShipment.senderName} ({activeShipment.senderPhone})
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-800">Drop Destination Address</span>
                  <p className="text-slate-600 mt-0.5">
                    {activeShipment.deliveryAddress}, {activeShipment.deliveryCity} ({activeShipment.deliveryPinCode})
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500">
                      Consignee: {activeShipment.recipientName}
                    </span>
                    {activeShipment.recipientPhone && (
                      <a
                        href={`tel:${activeShipment.recipientPhone}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Customer</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payload info */}
            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50/60 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400">Payload Weight</span>
                <div className="font-bold text-slate-800 mt-0.5">{activeShipment.weightKg} kg</div>
              </div>
              <div>
                <span className="text-slate-400">Category</span>
                <div className="font-bold text-slate-800 mt-0.5">{activeShipment.category}</div>
              </div>
            </div>

            {/* Milestone progression action */}
            {nextAction && (
              <div className="pt-2 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Update Transit Milestone
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdvanceMilestone(nextAction.nextStatus)}
                    disabled={updating}
                    className="col-span-2 sm:col-span-1 p-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{updating ? 'Updating...' : nextAction.label}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFailureModalOpen(true)}
                    disabled={updating}
                    className="col-span-2 sm:col-span-1 p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Report Exception</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-navy-900">No Active Consignment Assigned</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are currently active and available on the LogiSphere dispatch network. Once your carrier assigns a consignment to your vehicle, the route details and milestone progression will appear here.
            </p>
            <div className="pt-2">
              <button
                onClick={fetchAssigned}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check for Assignments</span>
              </button>
            </div>
          </div>
        )}

        {/* Exception / Failure Modal */}
        {failureModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-navy-900">Report Delivery Exception</h3>
                <button onClick={() => setFailureModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReportFailure} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Exception *</label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CONSIGNEE_UNAVAILABLE">Consignee Unavailable at Address</option>
                    <option value="INCORRECT_ADDRESS">Address Untraceable / Incomplete</option>
                    <option value="CUSTOMER_REFUSED">Customer Refused Delivery</option>
                    <option value="WEATHER_OR_ROAD_BLOCK">Corridor Road Closure / Severe Weather</option>
                    <option value="VEHICLE_BREAKDOWN">Vehicle Mechanical Breakdown</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFailureModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-1.5 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                  >
                    {updating ? 'Recording...' : 'Submit Exception'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
