'use client';

import{ useState } from 'react';
import { X, Clock, AlertTriangle, CheckCircle2, Shield, BadgeCheck, Loader2, ThumbsUp, ThumbsDown, MinusCircle,  } from 'lucide-react';
import { UserIdentity, DisputeCase } from './types';
import EvidenceUpload from './EvidenceUpload';
import ConversationThread from './ConversationThread';

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: DisputeCase;
  user: UserIdentity;
  onRefresh: () => void;
  getAuthToken: () => string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CaseDetailModal({ isOpen, onClose, caseData, user, onRefresh, getAuthToken }: CaseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'conversation'>('details');
  const [submitting, setSubmitting] = useState(false);
  const [verdictNote, setVerdictNote] = useState('');
  const [] = useState(false);

  const canSubmitVerdict = user.role === 'admin' && caseData.status !== 'RESOLVED';
  const isInvolved = user.role === 'admin' || caseData.initiator_id === user.operator_id || caseData.counterparty_id === user.operator_id;

  const handleVerdict = async (verdict: string) => {
    if (!confirm(`Submit ${verdict.toUpperCase()} verdict? This action cannot be undone.`)) return;
    
    setSubmitting(true);
    const token = getAuthToken();
    
    try {
      const params = new URLSearchParams();
      params.append('verdict', verdict);
      if (verdictNote) {
        params.append('notes', verdictNote);
      }
      // Note: release_amount can be added here if needed in future
      
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/disputes/${caseData.id}/verdict?${params.toString()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert("Verdict submitted successfully!");
        onRefresh();
        onClose();
      } else {
        alert("Failed to submit verdict.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignToMe = async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/admin/assign/${caseData.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_id: user.operator_id })
      });
      
      if (response.ok) {
        alert("Case assigned to you");
        onRefresh();
      }
    } catch (err) {
      console.error("Assignment failed", err);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = () => {
    switch(caseData.status) {
      case 'RESOLVED': return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 };
      case 'UNDER_REVIEW': return { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock };
      default: return { bg: 'bg-orange-50', text: 'text-orange-700', icon: AlertTriangle };
    }
  };

  const StatusIcon = getStatusBadge().icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-black text-slate-900">{caseData.vaultTitle}</h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${getStatusBadge().bg} ${getStatusBadge().text}`}>
                <StatusIcon size={12} />
                {caseData.status}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">Case #{caseData.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} label="Case Details" />
          <TabButton active={activeTab === 'evidence'} onClick={() => setActiveTab('evidence')} label={`Evidence (${caseData.evidence?.length || 0})`} />
          <TabButton active={activeTab === 'conversation'} onClick={() => setActiveTab('conversation')} label="Conversation" />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Amount & Parties */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-bold text-slate-500">Amount in Dispute</p>
                    <p className="text-2xl font-black text-amber-600">KES {caseData.amount.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-400 mb-1">Initiator</p>
                      <p className="text-sm font-bold text-slate-900">{caseData.initiator}</p>
                      <p className="text-[10px] font-mono text-slate-400">{caseData.initiator_id}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-400 mb-1">Counterparty</p>
                      <p className="text-sm font-bold text-slate-900">{caseData.counterparty}</p>
                      <p className="text-[10px] font-mono text-slate-400">{caseData.counterparty_id}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <p className="text-xs font-bold text-slate-500 mb-2">Dispute Description</p>
                  <p className="text-sm text-slate-700">{caseData.description}</p>
                </div>

                {/* Timeline */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Timeline</h4>
                  <div className="space-y-4">
                    {caseData.timeline.map((event, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{event.event}</p>
                          <p className="text-xs text-slate-400">{new Date(event.date).toLocaleString()}</p>
                          {event.comment && <p className="text-xs text-slate-600 mt-1 italic">"{event.comment}"</p>}
                          {event.files && <p className="text-xs text-amber-600 mt-1">{event.files} file(s) uploaded</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Your Role */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                  <p className="text-xs font-bold text-slate-400 mb-1">Your Role</p>
                  <p className="text-lg font-black text-slate-900">
                    {caseData.initiator_id === user.operator_id ? 'Initiator' : 
                     caseData.counterparty_id === user.operator_id ? 'Counterparty' : 
                     'Arbitrator'}
                  </p>
                  <BadgeCheck size={16} className="mx-auto mt-2 text-emerald-500" />
                </div>

                {/* Risk Score */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 mb-3">Risk Assessment</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700">Risk Score</span>
                    <span className={`text-sm font-bold ${caseData.riskScore > 75 ? 'text-rose-600' : caseData.riskScore > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {caseData.riskScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className={`h-2 rounded-full ${caseData.riskScore > 75 ? 'bg-rose-500' : caseData.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${caseData.riskScore}%` }} />
                  </div>
                </div>

                {/* Admin Actions */}
                {canSubmitVerdict && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 text-center uppercase">Admin Verdict</h4>
                    
                     {!caseData.assignedAdmin && (
                       <button onClick={handleAssignToMe} className="w-full mb-4 bg-purple-600 py-2.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2">
                         <Shield size={14} /> Assign to Me
                       </button>
                     )}
                     
                     {caseData.assignedAdmin === user.operator_id && (
                       <p className="text-xs text-emerald-400 mb-3 text-center">✓ Assigned to you</p>
                     )}
                    
                    <textarea 
                      value={verdictNote}
                      onChange={(e) => setVerdictNote(e.target.value)}
                      placeholder="Add verdict notes..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white mb-3 resize-none focus:border-amber-500 outline-none"
                      rows={3}
                    />
                    
                    <div className="space-y-2">
                      <button onClick={() => handleVerdict('influencer')} disabled={submitting} className="w-full bg-rose-600 py-3 rounded-lg text-xs font-bold hover:bg-rose-700 transition flex items-center justify-center gap-2">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />} Release to Initiator
                      </button>
                      <button onClick={() => handleVerdict('business')} disabled={submitting} className="w-full bg-slate-700 py-3 rounded-lg text-xs font-bold hover:bg-slate-600 transition flex items-center justify-center gap-2">
                        <ThumbsDown size={14} /> Refund to Counterparty
                      </button>
                      <button onClick={() => handleVerdict('split')} disabled={submitting} className="w-full bg-white text-slate-900 py-3 rounded-lg text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-2">
                        <MinusCircle size={14} /> 50/50 Split
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolution Info */}
                {caseData.status === 'RESOLVED' && caseData.verdict && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-bold text-emerald-800">Resolution</h4>
                    </div>
                    <p className="text-sm font-bold text-emerald-900">Verdict: {caseData.verdict}</p>
                     {caseData.verdictDetails && (
                       <p className="text-xs text-emerald-700 mt-2 italic">"{caseData.verdictDetails}"</p>
                     )}
                     {caseData.resolvedAt && (
                       <p className="text-[10px] text-emerald-600 mt-2">Resolved: {new Date(caseData.resolvedAt).toLocaleDateString()}</p>
                     )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <EvidenceUpload 
              caseId={caseData.id}
              existingEvidence={caseData.evidence || []}
              user={user}
              canUpload={isInvolved && caseData.status !== 'RESOLVED'}
              onUploadComplete={onRefresh}
              getAuthToken={getAuthToken}
            />
          )}

          {activeTab === 'conversation' && (
            <ConversationThread 
              caseId={caseData.id}
              messages={caseData.timeline.filter(t => t.comment).map(t => ({
                id: t.date,
                text: t.comment || '',
                sender: t.user || (t.event.includes('Evidence') ? 'System' : 'Unknown'),
                timestamp: t.date,
                isAdmin: t.user_role === 'admin'
              }))}
              user={user}
              canComment={isInvolved && caseData.status !== 'RESOLVED'}
              getAuthToken={getAuthToken}
              onNewMessage={onRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold transition-all border-b-2 -mb-px ${
        active 
          ? 'border-amber-500 text-amber-600' 
          : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}