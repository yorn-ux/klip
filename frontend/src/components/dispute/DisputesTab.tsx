'use client';

import  { useState, useMemo } from 'react';
import { 
  Lock, Gavel, AlertTriangle, Search, 
  Clock,  CheckCircle 
} from 'lucide-react';
import CaseDetailModal from './CaseDetailModal';
import { UserIdentity, DisputeCase, } from './types';

interface DisputesTabProps {
  user: UserIdentity;
  cases: DisputeCase[];
  onRefresh: () => void;
  getAuthToken: () => string | null;
}

export default function DisputesTab({ user, cases, onRefresh, getAuthToken }: DisputesTabProps) {
  const [selectedCase, setSelectedCase] = useState<DisputeCase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const stats = useMemo(() => ({
    totalLocked: cases.filter(c => c.status !== 'RESOLVED').reduce((acc, c) => acc + c.amount, 0),
    open: cases.filter(c => c.status !== 'RESOLVED').length,
    highRisk: cases.filter(c => c.riskScore > 75).length,
    resolved: cases.filter(c => c.status === 'RESOLVED').length,
  }), [cases]);

  const getRoleInCase = (caseData: DisputeCase): string => {
    if (user.role === 'admin') return 'Arbitrator';
    if (caseData.initiator_id === user.operator_id) return 'Initiator';
    if (caseData.counterparty_id === user.operator_id) return 'Counterparty';
    return 'Observer';
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = c.vaultTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.initiator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.counterparty?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || c.status?.toLowerCase() === statusFilter.toLowerCase();
      
      const userRole = getRoleInCase(c);
      const matchesRole = roleFilter === 'all' || userRole.toLowerCase() === roleFilter.toLowerCase();
      
      return matchesSearch && matchesStatus && matchesRole;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }
      if (sortBy === 'oldest') {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      }
      if (sortBy === 'amount-high') return b.amount - a.amount;
      if (sortBy === 'amount-low') return a.amount - b.amount;
      if (sortBy === 'risk') return b.riskScore - a.riskScore;
      return 0;
    });
  }, [cases, searchQuery, statusFilter, roleFilter, sortBy, user]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'RESOLVED': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'UNDER_REVIEW': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      default: return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
    }
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Frozen" value={`KES ${stats.totalLocked.toLocaleString()}`} icon={<Lock size={16}/>} color="text-rose-600" bgColor="bg-rose-50" />
        <StatCard label="Active Disputes" value={stats.open} icon={<Gavel size={16}/>} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard label="High Risk" value={stats.highRisk} icon={<AlertTriangle size={16}/>} color="text-orange-600" bgColor="bg-orange-50" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle size={16}/>} color="text-emerald-600" bgColor="bg-emerald-50" />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by case ID, title, or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
          </select>
          
          {/* Role Filter (for non-admin) */}
          {user.role !== 'admin' && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
            >
              <option value="all">All Cases</option>
              <option value="initiator">As Initiator</option>
              <option value="counterparty">As Counterparty</option>
            </select>
          )}
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Highest Amount</option>
            <option value="amount-low">Lowest Amount</option>
            <option value="risk">Highest Risk</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Case</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Parties</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Days Open</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Risk</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No disputes found
                  </td>
                </tr>
              ) : (
                filteredCases.map(c => {
                  const statusStyle = getStatusColor(c.status);
                  const userRole = getRoleInCase(c);
                  const daysOpen = c.daysOpen ?? (c.createdAt
                    ? Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0);
                  
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCase(c)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${c.riskScore > 75 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{c.vaultTitle}</p>
                            <p className="text-xs text-slate-400 font-mono">#{c.id.slice(0,8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">KES {c.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold border-2 border-white">
                              {c.initiator?.charAt(0) || '?'}
                            </div>
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold border-2 border-white">
                              {c.counterparty?.charAt(0) || '?'}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-700">{c.initiator?.split(' ')[0]} vs {c.counterparty?.split(' ')[0]}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Role: {userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{daysOpen}d</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-16">
                            <div className={`h-1.5 rounded-full ${c.riskScore > 75 ? 'bg-rose-500' : c.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${c.riskScore}%` }} />
                          </div>
                          <span className="text-xs font-bold">{c.riskScore}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {c.status === 'UNDER_REVIEW' ? 'IN REVIEW' : c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          caseData={selectedCase}
          user={user}
          onRefresh={onRefresh}
          getAuthToken={getAuthToken}
        />
      )}
    </>
  );
}

function StatCard({ label, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`p-2 ${bgColor} rounded-lg`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}