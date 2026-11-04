import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ShieldCheck,
  ArrowRight,
  Package,
  X,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function DriverPortalPage() {
  const [currentMilestone, setCurrentMilestone] = useState('IN_TRANSIT');
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState('CONSIGNEE_UNAVAILABLE');
  const [failureNotes, setFailureNotes] = useState('');
  const [deliveryStatusMessage, setDeliveryStatusMessage] = useState('');

  const shipment = {
    trackingNumber: 'TRK-8821-MUM-BLR',
    sender: 'Precision Auto Works, Mumbai Central Hub',
    originAddress: 'Warehouse 4B, MIDC Industrial Area, Mumbai (400001)',
    recipient: 'Southern Electric Tech, Bengaluru',
    destinationAddress: 'Electronic City Phase 1, Hosur Road, Bengaluru (560001)',
    consigneePhone: '+91 98450 11223',
    weight: '45.5 kg',
    vehiclePlate: 'MH-12-DE-9081 (Tata 407)',
  };

  const handleAdvanceMilestone = (nextStatus) => {
    setCurrentMilestone(nextStatus);
    setDeliveryStatusMessage(`Milestone updated to: ${nextStatus}`);
  };

  const handleReportFailure = (e) => {
    e.preventDefault();
    setCurrentMilestone('FAILED_ATTEMPT');
    setDeliveryStatusMessage(
      `Delivery attempt failed: ${failureReason}. Consignment marked for re-attempt.`
    );
    setFailureModalOpen(false);
  };

  return (
    <PortalLayout
      title="Driver Mobile Dispatch View"
      subtitle="Driver: Vikram Kumar (MH-1420180029) • Apex Express Logistics"
      role="DRIVER"
      roleName="Driver Interface"
    >
      <div className="max-w-xl mx-auto space-y-6">
        {deliveryStatusMessage && (
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 flex items-center justify-between">
            <span>{deliveryStatusMessage}</span>
            <button
              onClick={() => setDeliveryStatusMessage('')}
              className="text-brand-600 hover:text-brand-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current Active Consignment Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Consignment
              </div>
              <div className="text-lg font-mono font-bold text-navy-900">
                {shipment.trackingNumber}
              </div>
            </div>
            <Badge
              variant={
                currentMilestone === 'DELIVERED'
                  ? 'success'
                  : currentMilestone === 'FAILED_ATTEMPT'
                    ? 'warning'
                    : 'accent'
              }
              size="sm"
            >
              {currentMilestone}
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
                <p className="text-slate-600 mt-0.5">{shipment.originAddress}</p>
                <div className="text-[11px] text-slate-500 mt-1">Shipper: {shipment.sender}</div>
              </div>
            </div>

            {/* Destination */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-800">Drop Doorstep Address</span>
                <p className="text-slate-600 mt-0.5">{shipment.destinationAddress}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">
                    Consignee: {shipment.recipient}
                  </span>
                  <a
                    href={`tel:${shipment.consigneePhone}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Customer</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle & Payload Info */}
          <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50/60 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400">Assigned Vehicle</span>
              <div className="font-bold text-slate-800 mt-0.5">{shipment.vehiclePlate}</div>
            </div>
            <div>
              <span className="text-slate-400">Payload Weight</span>
              <div className="font-bold text-slate-800 mt-0.5">{shipment.weight}</div>
            </div>
          </div>

          {/* Milestone Action Progression Buttons */}
          <div className="pt-2 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Update Transit Milestone
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAdvanceMilestone('PICKED_UP')}
                disabled={currentMilestone === 'DELIVERED'}
                className={`p-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  currentMilestone === 'PICKED_UP'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                1. Picked Up
              </button>

              <button
                type="button"
                onClick={() => handleAdvanceMilestone('IN_TRANSIT')}
                disabled={currentMilestone === 'DELIVERED'}
                className={`p-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  currentMilestone === 'IN_TRANSIT'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                2. In Transit
              </button>

              <button
                type="button"
                onClick={() => handleAdvanceMilestone('OUT_FOR_DELIVERY')}
                disabled={currentMilestone === 'DELIVERED'}
                className={`p-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  currentMilestone === 'OUT_FOR_DELIVERY'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                3. Out for Delivery
              </button>

              <button
                type="button"
                onClick={() => handleAdvanceMilestone('DELIVERED')}
                className={`p-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  currentMilestone === 'DELIVERED'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                4. Delivered
              </button>
            </div>

            {/* Delivery Failure Option */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setFailureModalOpen(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-2"
              >
                Report Delivery Failure or Customer Unavailable
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Failure Reason Modal */}
      {failureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Report Delivery Failure</h3>
              </div>
              <button
                type="button"
                onClick={() => setFailureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportFailure} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mandatory Failure Reason
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-500"
                  required
                >
                  <option value="CONSIGNEE_UNAVAILABLE">Customer / Consignee Unavailable</option>
                  <option value="INCORRECT_ADDRESS">
                    Incorrect or Incomplete Delivery Address
                  </option>
                  <option value="PACKAGE_DAMAGED">Package Damaged in Transit</option>
                  <option value="CUSTOMER_REJECTED">Customer Refused Delivery / Cancelled</option>
                  <option value="CORRIDOR_DELAY">Corridor Blockage / Extreme Weather</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Incident Notes
                </label>
                <textarea
                  value={failureNotes}
                  onChange={(e) => setFailureNotes(e.target.value)}
                  placeholder="Detail attempts made to reach customer via phone..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button onClick={() => setFailureModalOpen(false)} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Submit Failure Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
