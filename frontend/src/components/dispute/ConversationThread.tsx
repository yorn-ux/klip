'use client';

import{ useState } from 'react';
import { Send, Loader2, AlertCircle, User, Shield } from 'lucide-react';
import { UserIdentity } from './types';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isAdmin?: boolean;
}

interface ConversationThreadProps {
  caseId: string;
  messages: Message[];
  user: UserIdentity;
  canComment: boolean;
  getAuthToken: () => string | null;
  onNewMessage: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ConversationThread({ caseId, messages, user, canComment, getAuthToken, onNewMessage }: ConversationThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    setError('');
    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/disputes/${caseId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newMessage })
      });
      
      if (response.ok) {
        setNewMessage('');
        onNewMessage();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to comment on this case</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === user.fullName ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.isAdmin ? 'bg-purple-100 text-purple-600' : 
                msg.sender === user.fullName ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {msg.isAdmin ? <Shield size={14} /> : <User size={14} />}
              </div>
              
              {/* Message Bubble */}
              <div className={`flex-1 max-w-[70%] ${msg.sender === user.fullName ? 'items-end' : ''}`}>
                <div className={`rounded-xl p-3 ${
                  msg.isAdmin ? 'bg-purple-50 border border-purple-100' :
                  msg.sender === user.fullName ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-700">{msg.sender}</span>
                    {msg.isAdmin && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded-full">Admin</span>
                    )}
                    <span className="text-[9px] text-slate-400">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{msg.text}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Input Area */}
      {canComment && (
        <div className="border-t border-slate-200 pt-4">
          <div className="flex gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="self-end p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-2 text-rose-600 text-xs">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}