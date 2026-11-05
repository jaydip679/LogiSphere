import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, CheckCircle2, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Badge from '../components/common/Badge';
import apiClient from '../api/apiClient';

export default function PublicTrackingPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('trackingNumber') || '';
  const [trackingId, setTrackingId] = useState(initialId);
  const [activeConsignment, setActiveConsignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (idToSearch) => {
    const id = (idToSearch || trackingId).trim().toUpperCase();
    if (!id) return;

    setLoading(true);
    setError('');
    setActiveConsignment(null);

    try {
      const res = await apiClient.get(`/api/v1/tracking/${id}`);
      setActiveConsignment(res.data?.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`No tracking history found for consignment "${id}". Please verify the tracking number.`);
      } else {
        setError(err.response?.data?.message || 'Unable to retrieve tracking telemetry at this moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch(trackingId);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'IN_TRANSIT':
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return 'brand';
      case 'CONFIRMED':
      case 'ASSIGNED':
        return 'accent';
      case 'DELIVERY_FAILED':
        return 'danger';
      default:
        return 'warning';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <Badge variant="brand" size="sm">
              Live Consignment Telemetry
            </Badge>
            <h1 className="text-3xl font-bold text-navy-900 tracking-tight">
              Track Your Consignment
            </h1>
            <p className="text-sm text-slate-600">
              Real-time Indian corridor milestone tracking verified by append-only ledger
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
              placeholder="Enter Consignment Tracking Number (e.g. LSP-20261105-XXXXXX)"
              required
              className="w-full px-3 py-2 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shrink-0 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Searching...' : 'Search Status'}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-sm text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                    Latest status updated directly from LogiSphere tracking ledger
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(activeConsignment.currentStatus)} size="sm">
                    {activeConsignment.currentStatus}
                  </Badge>
                </div>
              </div>

              {/* Milestones Flow */}
              <div className="p-6 sm:p-8">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-6">
                  Milestone Progression Timeline
                </h2>
                {activeConsignment.timeline && activeConsignment.timeline.length > 0 ? (
                  <div className="space-y-6">
                    {activeConsignment.timeline.map((m, idx) => (
                      <div key={m.id || idx} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-emerald-500 text-white shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          {idx < activeConsignment.timeline.length - 1 && (
                            <div className="w-0.5 h-10 mt-1 bg-emerald-400" />
                          )}
                        </div>

                        <div className="flex-1 pt-0.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-sm font-bold text-navy-900">
                              {m.status}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              {m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                          {m.location && (
                            <div className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{m.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No milestone progression events recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Initial / Empty prompt */}
          {!activeConsignment && !error && !loading && (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-navy-900">Ready to Track Consignment</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter your consignment tracking code above to view live corridor progress and delivery milestones.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
