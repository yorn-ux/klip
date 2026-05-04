'use client';

import  { useState } from 'react';
import {Search, Ticket, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { SupportTicket } from './types';

interface HistoryTabProps {
  tickets: SupportTicket[];
}

export default function HistoryTab({ tickets }: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'RESOLVED': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'ACTIVE': return <Clock size={14} className="text-amber-500" />;
      default: return <AlertCircle size={14} className="text-rose-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ACTIVE': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Support History</h2>
          <p className="text-sm text-slate-500">View all your previous support tickets</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-amber-400 outline-none w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket size={28} className="text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">No tickets found</h3>
            <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-slate-400">#{ticket.id}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{ticket.subject}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-slate-400">Category: {ticket.category}</span>
                       {ticket.assignedAgent && (
                         <span className="text-xs text-slate-400">Assigned to: {ticket.assignedAgent}</span>
                       )}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Eye size={16} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {tickets.length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-400">Total Tickets</p>
                <p className="text-lg font-bold text-slate-900">{tickets.length}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <p className="text-xs text-slate-400">Resolved</p>
                <p className="text-lg font-bold text-emerald-600">{tickets.filter(t => t.status === 'RESOLVED').length}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <p className="text-xs text-slate-400">Open</p>
                <p className="text-lg font-bold text-amber-600">{tickets.filter(t => t.status !== 'RESOLVED').length}</p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}