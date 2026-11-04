import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Server,
  X,
} from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'overview' | 'services'
  const [reviewModal, setReviewModal] = useState(null); // application object
  const [decisionNotes, setDecisionNotes] = useState('');

  // Pending Carrier Applications State
  const [applications, setApplications] = useState([
    {
      id: 'app_1',
      orgName: 'Apex Express Logistics Pvt Ltd',
      businessEmail: 'compliance@apexlogistics.local',
      operatingHubs: ['Mumbai Central (400001)', 'Bengaluru Hub (560001)'],
      vehiclesCount: 14,
      gstin: '27AABCU9603R1ZM',
      status: 'PENDING_REVIEW',
      submittedAt: 'Today, 09:12 IST',
    },
    {
      id: 'app_2',
      orgName: 'Deccan Freight Corridors Ltd',
      businessEmail: 'ops@deccanfreight.in',
      operatingHubs: ['Hyderabad Hub (500001)', 'Chennai Hub (600001)'],
      vehiclesCount: 22,
      gstin: '36AAACE4521P1ZQ',
      status: 'PENDING_REVIEW',
      submittedAt: 'Yesterday, 16:45 IST',
    },
  ]);

  const [approvedList, setApprovedList] = useState([
    {
      id: 'org_1',
      name: 'Bharat Freight Lines',
      hubs: 'Delhi NCR, Mumbai',
      status: 'ACTIVE',
      onTimeRate: '99.6%',
    },
    {
      id: 'org_2',
      name: 'Southern Cargo Movers',
      hubs: 'Bengaluru, Chennai, Hyderabad',
      status: 'ACTIVE',
      onTimeRate: '98.9%',
    },
  ]);

  const handleDecision = (appId, decision) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    if (decision === 'APPROVED') {
      setApprovedList((prev) => [
        ...prev,
        {
          id: `org_${Date.now()}`,
          name: targetApp.orgName,
          hubs: targetApp.operatingHubs.join(', '),
          status: 'ACTIVE',
          onTimeRate: '100%',
        },
      ]);
    }

    setApplications((prev) => prev.filter((a) => a.id !== appId));
    setReviewModal(null);
    setDecisionNotes('');
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
      {/* Tab 1: Carrier Applications Review */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy-900">
                Pending Logistics Carrier Applications
              </h2>
              <p className="text-xs text-slate-500">
                Carrier organizations require mandatory platform review before active dispatch
                participation
              </p>
            </div>
            <Badge variant="warning" size="sm">
              {applications.length} Pending Review
            </Badge>
          </div>

          {applications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-brand-600" />
                        <h3 className="font-bold text-sm text-navy-900">{app.orgName}</h3>
                      </div>
                      <Badge variant="warning" size="xs">
                        {app.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div>
                        Email: <strong>{app.businessEmail}</strong>
                      </div>
                      <div>
                        GSTIN Registration: <span className="font-mono">{app.gstin}</span>
                      </div>
                      <div>
                        Fleet Size: <strong>{app.vehiclesCount} vehicles registered</strong>
                      </div>
                      <div>
                        Corridors: <strong>{app.operatingHubs.join(' • ')}</strong>
                      </div>
                      <div className="text-slate-400 text-[11px] pt-1">
                        Application submitted: {app.submittedAt}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDecision(app.id, 'REJECTED')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(app.id, 'APPROVED')}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                    >
                      Approve & Grant Dispatch
                    </button>
                  </div>
                </div>
              ))}
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
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              ACTIVE VERIFIED LOGISTICS ORGANIZATIONS ({approvedList.length})
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {approvedList.map((org) => (
                <div
                  key={org.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-navy-900">{org.name}</span>
                    <span className="text-slate-500 ml-2">Corridors: {org.hubs}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 font-medium">SLA: {org.onTimeRate}</span>
                    <Badge variant="success" size="xs">
                      {org.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Platform Metrics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Total Organizations</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">
                {approvedList.length + applications.length}
              </div>
              <div className="text-[11px] text-brand-600 mt-1">Multi-tenant Schema Isolated</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Active Consignments</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">42</div>
              <div className="text-[11px] text-accent-600 mt-1">Across 5 Metro Corridors</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Average On-Time SLA</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">99.4%</div>
              <div className="text-[11px] text-emerald-600 mt-1">Strict SLA Policy</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-xs font-medium text-slate-500">Active Fleet Drivers</div>
              <div className="text-3xl font-extrabold text-navy-900 mt-1">128</div>
              <div className="text-[11px] text-slate-500 mt-1">Verified License Checks</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Downstream Services Health */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">
                Decoupled Microservices Health Probes
              </h3>
              <p className="text-xs text-slate-500">
                API Gateway aggregates probes across all downstream domain services
              </p>
            </div>
            <Badge variant="success" size="sm">
              ALL SYSTEMS OPERATIONAL
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">auth-service</div>
                <div className="text-[11px] text-slate-500">Port 5001 • JWT & RBAC</div>
              </div>
              <Badge variant="success" size="xs">
                UP (200)
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">shipment-service</div>
                <div className="text-[11px] text-slate-500">Port 5002 • Marketplace</div>
              </div>
              <Badge variant="success" size="xs">
                UP (200)
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">fleet-dispatch-service</div>
                <div className="text-[11px] text-slate-500">Port 5003 • Atomic Lock</div>
              </div>
              <Badge variant="success" size="xs">
                UP (200)
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">tracking-service</div>
                <div className="text-[11px] text-slate-500">Port 5004 • GPS Telemetry</div>
              </div>
              <Badge variant="success" size="xs">
                UP (200)
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">notification-service</div>
                <div className="text-[11px] text-slate-500">Port 5005 • SQS Alerts</div>
              </div>
              <Badge variant="success" size="xs">
                UP (200)
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">api-gateway</div>
                <div className="text-[11px] text-slate-500">Port 5000 • Reverse Proxy</div>
              </div>
              <Badge variant="success" size="xs">
                UP (200)
              </Badge>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
