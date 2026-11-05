import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Server,
  RefreshCw,
  Clock,
  Check,
  X,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Badge from '../../components/common/Badge';
import apiClient from '../../api/apiClient';

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState('applications');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Data states backed by real PostgreSQL
  const [pendingApplications, setPendingApplications] = useState([]);
  const [approvedOrgs, setApprovedOrgs] = useState([]);
  const [servicesHealth, setServicesHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Rejection modal
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Fetch pending applications
  const fetchPending = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/admin/organizations/pending');
      const items = res.data?.data?.items || [];
      setPendingApplications(items);
    } catch (err) {
      console.error('Failed to load pending carrier applications:', err);
    }
  }, []);

  // Fetch all/approved organizations
  const fetchApproved = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/admin/organizations?status=APPROVED');
      const items = res.data?.data?.items || [];
      setApprovedOrgs(items);
    } catch (err) {
      console.error('Failed to load approved organizations:', err);
    }
  }, []);

  // Fetch downstream health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await apiClient.get('/health');
      setServicesHealth(res.data?.data || null);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPending(), fetchApproved(), fetchHealth()]).finally(() => {
      setLoading(false);
    });
  }, [fetchPending, fetchApproved, fetchHealth]);

  const handleReview = async (orgId, status, reason = null) => {
    setReviewing(true);
    setError('');
    setSuccessMessage('');
    try {
      await apiClient.post(`/api/v1/admin/organizations/${orgId}/review`, {
        status,
        ...(reason ? { rejectionReason: reason } : {}),
      });

      setSuccessMessage(
        status === 'APPROVED'
          ? 'Logistics organization approved. Dispatch and corridor bidding unlocked for this carrier.'
          : 'Logistics organization registration declined.'
      );
      setRejectionTarget(null);
      setRejectionReason('');
      await Promise.all([fetchPending(), fetchApproved()]);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to complete compliance review.'
      );
    } finally {
      setReviewing(false);
    }
  };

  const navItems = [
    { id: 'applications', label: 'Carrier Vetting (Pending)', icon: ShieldCheck },
    { id: 'overview', label: 'Platform Metrics', icon: Activity },
    { id: 'services', label: 'Downstream Services Health', icon: Server },
  ];

  return (
    <PortalLayout
      title="Platform Administration Dashboard"
      subtitle="Verify enterprise carrier compliance, review platform metrics, and monitor microservices health"
      role="ADMIN"
      roleName="Platform Admin"
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

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Carrier Applications Review */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">
                Pending Logistics Carrier Applications
              </h2>
              <p className="text-xs text-slate-500">
                Carrier organizations require mandatory platform review before active dispatch participation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPending}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50"
                title="Refresh queue"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Badge variant={pendingApplications.length > 0 ? 'warning' : 'success'} size="sm">
                {pendingApplications.length} Pending Review
              </Badge>
            </div>
          </div>

          {pendingApplications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingApplications.map((app) => {
                const owner = app.memberships?.[0]?.user;
                const serviceAreas = Array.isArray(app.serviceAreas)
                  ? app.serviceAreas.join(' • ')
                  : 'All Hubs';
                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-brand-600" />
                          <h3 className="font-bold text-sm text-navy-900">{app.name}</h3>
                        </div>
                        <Badge variant="warning" size="xs">
                          {app.status}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div>
                          Contact Email: <strong>{app.contactEmail}</strong>
                        </div>
                        <div>
                          Contact Phone: <strong>{app.contactPhone}</strong>
                        </div>
                        {owner && (
                          <div>
                            Owner / Rep: <strong>{owner.fullName}</strong> ({owner.email})
                          </div>
                        )}
                        <div>
                          Operating Corridors: <strong>{serviceAreas}</strong>
                        </div>
                        <div className="text-slate-400 text-[11px] pt-1">
                          Application submitted: {new Date(app.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setRejectionTarget(app)}
                        disabled={reviewing}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer"
                      >
                        Reject Application
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(app.id, 'APPROVED')}
                        disabled={reviewing}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                      >
                        {reviewing ? 'Processing...' : 'Approve & Grant Dispatch'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-navy-900">All Carrier Reviews Completed</h3>
              <p className="text-xs text-slate-500">
                Zero pending organization onboarding applications in queue.
              </p>
            </div>
          )}

          {/* Active Verified Organizations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Active Verified Logistics Organizations ({approvedOrgs.length})
              </span>
              <button
                onClick={fetchApproved}
                className="text-xs text-slate-500 hover:text-navy-900 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {approvedOrgs.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {approvedOrgs.map((org) => {
                  const areas = Array.isArray(org.serviceAreas)
                    ? org.serviceAreas.join(', ')
                    : 'All Corridors';
                  return (
                    <div
                      key={org.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-navy-900">{org.name}</span>
                        <span className="text-slate-500 ml-2">Corridors: {areas}</span>
                        <div className="text-[11px] text-slate-400">
                          {org.contactEmail} • {org.contactPhone}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success" size="xs">
                          {org.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No approved carrier organizations registered yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Platform Metrics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Total Registered Carriers</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">
                {approvedOrgs.length + pendingApplications.length}
              </div>
              <div className="text-[11px] text-brand-600 mt-1">
                {approvedOrgs.length} Active / {pendingApplications.length} Pending Review
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Downstream Service Nodes</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">
                {servicesHealth?.downstream
                  ? Object.values(servicesHealth.downstream).filter((s) => s === 'UP').length
                  : 0}{' '}
                / 5
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                {servicesHealth?.gateway === 'UP' ? 'API Gateway Operational' : 'Gateway Offline'}
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Gateway Uptime</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">
                {servicesHealth?.uptime ? `${Math.round(servicesHealth.uptime / 60)} min` : 'Active'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Container Health Check Verified</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Downstream Services Health */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-navy-900">Distributed Microservices Health</h2>
              <p className="text-xs text-slate-500">
                Live health check aggregation via API Gateway /health probe
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              <span>Probe Services</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-600" />
                <span className="font-bold text-slate-800">api-gateway (:5000)</span>
              </div>
              <Badge variant={servicesHealth?.gateway === 'UP' ? 'success' : 'danger'} size="xs">
                {servicesHealth?.gateway || 'UNKNOWN'}
              </Badge>
            </div>

            {servicesHealth?.downstream &&
              Object.entries(servicesHealth.downstream).map(([name, status]) => (
                <div key={name} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 capitalize">
                      {name}-service
                    </span>
                  </div>
                  <Badge variant={status === 'UP' ? 'success' : 'danger'} size="xs">
                    {status}
                  </Badge>
                </div>
              ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Last checked: {servicesHealth?.timestamp ? new Date(servicesHealth.timestamp).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-navy-900">
                Reject Organization Application
              </h3>
              <button
                onClick={() => {
                  setRejectionTarget(null);
                  setRejectionReason('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please state the compliance reason for declining{' '}
              <strong>{rejectionTarget.name}</strong>.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete GSTIN registration or non-compliant insurance coverage."
              rows={3}
              required
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionTarget(null);
                  setRejectionReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReview(rejectionTarget.id, 'REJECTED', rejectionReason)}
                disabled={reviewing || !rejectionReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
              >
                {reviewing ? 'Declining...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
