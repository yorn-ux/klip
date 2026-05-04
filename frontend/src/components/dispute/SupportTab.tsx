'use client';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, HelpCircle,  AlertTriangle, Clock, Shield } from 'lucide-react';
import { UserIdentity } from './types';

interface SupportTabProps {
  user: UserIdentity;
  onTicketCreated: () => void;
  getAuthToken: () => string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const FAQS = [
  { question: "How long does a typical dispute take?", answer: "Most disputes are resolved within 2-5 business days." },
  { question: "Why are my funds frozen during a dispute?", answer: "To ensure a fair outcome until a verdict is rendered." },
  { question: "Who are the arbitrators?", answer: "Neutral third-party legal professionals." },
  { question: "How do I upload evidence?", answer: "Go to the dispute case and click 'Upload Evidence'." },
];

const CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'billing', label: 'Payment / Billing' },
  { value: 'account', label: 'Account' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'general', label: 'General' },
];
const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function SupportTab({ user, onTicketCreated, getAuthToken }: SupportTabProps) {
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSending(true);
    setError('');
    const token = getAuthToken();
    
    try {
       const response = await fetch(`${API_BASE_URL}/api/v1/dispute/support`, {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({
           category,
           priority,
           subject,
           message
         })
       });
      
      if (!response.ok) throw new Error('Failed to create ticket');
      
      setSent(true);
      onTicketCreated();
      setTimeout(() => {
        setSent(false);
        setSubject('');
        setMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to create support ticket. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Ticket Submitted</h3>
        <p className="text-sm text-slate-500 mb-6">Our support team will respond within 24 hours.</p>
        <button onClick={() => setSent(false)} className="text-sm text-amber-600 font-medium">Submit Another</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Ticket Form */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Create Support Ticket</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold text-slate-600 mb-1.5 block">Category</label>
                 <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400">
                   {CATEGORIES.map(cat => (
                     <option key={cat.value} value={cat.value}>
                       {cat.label}
                     </option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-600 mb-1.5 block">Priority</label>
                 <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 ${getPriorityColor(priority)}`}>
                   {PRIORITIES.map(pri => (
                     <option key={pri.value} value={pri.value}>
                       {pri.label}
                     </option>
                   ))}
                 </select>
               </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your issue" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400" required />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Please provide detailed information about your issue..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 resize-none" required />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-600 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={sending} className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl text-sm font-bold hover:from-amber-700 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? 'Submitting...' : 'Submit Ticket'}
            </button>

            <p className="text-xs text-center text-slate-400">Submitting as {user.fullName} ({user.role})</p>
          </form>
        </div>
      </div>

      {/* Sidebar - Knowledge Base */}
      <div className="space-y-6">
        {/* System Status */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-emerald-700">System Status</h3>
          </div>
          <p className="text-lg font-bold text-emerald-900">All Systems Operational</p>
          <p className="text-xs text-emerald-600 mt-1"><Clock size={10} className="inline mr-1" /> Response time: &lt; 2 hours</p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-amber-500" />
            <h3 className="text-xs font-bold text-slate-700">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer list-none flex items-center justify-between">
                  {faq.question}
                  <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-xs text-slate-500 mt-2 pl-2 border-l-2 border-amber-200">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-rose-50 rounded-xl border border-rose-100 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-800 mb-1">Emergency Escalation</p>
              <p className="text-xs text-rose-600">For urgent matters, please use the hotline or expect a 2-4 hour response time.</p>
              <p className="text-xs font-medium text-rose-700 mt-2">support@klip.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

