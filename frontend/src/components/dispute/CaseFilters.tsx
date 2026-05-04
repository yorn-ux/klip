'use client';

import { Search,  ChevronDown, Calendar } from 'lucide-react';

interface CaseFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  showRoleFilter?: boolean;
  roleFilter?: string;
  onRoleChange?: (value: string) => void;
}

export default function CaseFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  showRoleFilter = false,
  roleFilter = 'all',
  onRoleChange
}: CaseFiltersProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case ID, title, or party..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
          />
        </div>
        
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
        </select>
        
        {/* Role Filter (for non-admin) */}
        {showRoleFilter && onRoleChange && (
          <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
          >
            <option value="all">All Cases</option>
            <option value="initiator">As Initiator</option>
            <option value="counterparty">As Counterparty</option>
          </select>
        )}
        
        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount-high">Highest Amount</option>
          <option value="amount-low">Lowest Amount</option>
          <option value="risk">Highest Risk</option>
        </select>
        
        {/* Date Range - Optional */}
        <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition">
          <Calendar size={14} />
          <span>Date Range</span>
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
}