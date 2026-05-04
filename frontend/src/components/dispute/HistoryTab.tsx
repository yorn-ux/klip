'use client';

import { useState } from 'react';
import { Search, Ticket, CheckCircle, Clock, AlertCircle, Eye, X } from 'lucide-react';
import { SupportTicket } from './types';

interface HistoryTabProps {
  tickets: SupportTicket[];
}

export default function HistoryTab({ tickets }: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status?.toLowerCase() === statusFilter.toLowerCase();
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
      case 'RESOLVED': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ACTIVE': 
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default: 
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const getFullDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
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
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
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
              <div 
                key={ticket.id} 
                className="p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowModal(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">#{ticket.id}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(ticket.createdAt)}</span>
                      {ticket.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                          ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          ticket.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                          ticket.priority === 'LOW' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {ticket.priority}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{ticket.subject}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{ticket.message}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <span className="text-xs text-slate-400">Category: {ticket.category}</span>
                       {ticket.assignedAgent && (
                         <span className="text-xs text-slate-400">Assigned to: {ticket.assignedAgent}</span>
                       )}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
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

      {/* Detail Modal */}
      {showModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => {
            setShowModal(false);
            setSelectedTicket(null);
          }}
          getFullDate={getFullDate}
        />
      )}
    </div>
  );
}

// Ticket Detail Modal Component
function TicketDetailModal({ ticket, onClose, getFullDate }: { ticket: SupportTicket; onClose: () => void; getFullDate: (date: string) => string }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Ticket size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Support Ticket Details</h3>
              <p className="text-xs text-slate-400 font-mono">#{ticket.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
            <p className="text-sm font-medium text-slate-900 mt-1">{ticket.subject}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <p className="text-sm text-slate-700 mt-1">{ticket.category}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
              <p className="text-sm font-bold mt-1">{ticket.priority || 'MEDIUM'}</p>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <p className="text-sm font-bold mt-1">{ticket.status}</p>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Message</label>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{ticket.message}</p>
          </div>
          
          {ticket.responses && Array.isArray(ticket.responses) && ticket.responses.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Responses</label>
              <div className="space-y-3 mt-2">
                {ticket.responses.map((resp: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold text-purple-600">{resp.admin}</span>
                      <span className="text-xs text-slate-400">{getFullDate(resp.timestamp)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{resp.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {ticket.attachments && Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Attachments</label>
              <div className="space-y-2 mt-2">
                {ticket.attachments.map((attachment: string, idx: number) => (
                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    📎 Attachment {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Created</label>
               <p className="text-xs text-slate-600 mt-1">{getFullDate(ticket.createdAt)}</p>
            </div>
             {ticket.resolvedAt && (
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase">Resolved</label>
                 <p className="text-xs text-slate-600 mt-1">{getFullDate(ticket.resolvedAt)}</p>
               </div>
             )}
          </div>
          
           {ticket.assignedAgent && (
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Assigned Agent</label>
               <p className="text-sm text-slate-700 mt-1">{ticket.assignedAgent}</p>
             </div>
           )}
          
           {ticket.resolutionNotes && (
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Resolution Notes</label>
               <p className="text-sm text-slate-600 mt-1">{ticket.resolutionNotes}</p>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}