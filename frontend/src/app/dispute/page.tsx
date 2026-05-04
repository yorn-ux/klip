'use client';

import { Gavel, LifeBuoy, History, Loader2, Menu, X, Shield, RefreshCw, Home, BadgeCheck, Bell } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DisputesTab from '@/components/dispute/DisputesTab';
import SupportTab from '@/components/dispute/SupportTab';
import HistoryTab from '@/components/dispute/HistoryTab';
import AdminQueueStats from '@/components/dispute/AdminQueueStats';
import { UserIdentity, SupportTicket, DisputeCase, AdminQueue, NavigationTab, Role } from '@/components/dispute/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const KlipLogo = () => (
  <div className="flex items-center gap-2 group">
    <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center transition-all group-hover:shadow-lg">
      <span className="text-white font-bold text-lg">K</span>
    </div>
    <span className="text-xl font-semibold tracking-tight text-slate-900">KLIP</span>
  </div>
);

export default function GlobalResolutionCenter() {
  const router = useRouter();
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('disputes');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [adminQueue, setAdminQueue] = useState<AdminQueue>({
    pending: 0,
    in_review: 0,
    resolved_today: 0,
    avg_resolution_time: '0h',
    urgent_cases: 0
  });

  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }, [getToken]);

  const handleAuthError = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    router.push('/auth/login?reason=expired');
  }, [router]);

  // Load user from localStorage
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('klip_user');
    const token = getToken();
    
    if (!token || !storedUser) {
      router.push('/auth/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setUser({
        id: parsed.id,
        operator_id: parsed.operator_id || parsed.id,
        role: (parsed.role as Role) || 'influencer',
        fullName: parsed.full_name || parsed.fullName,
        email: parsed.email,
      });
    } catch (err) {
      console.error("Failed to parse user:", err);
      handleAuthError();
    }
  }, [getToken, handleAuthError, router]);

  const fetchData = useCallback(async () => {
    if (!user?.operator_id) return;
    
    setRefreshing(true);
    const headers = getAuthHeaders();

    try {
      // Fetch disputes
      const disputesRes = await fetch(`${API_BASE_URL}/api/v1/dispute/disputes?role=${user.role}`, { 
        headers: Object.keys(headers).length ? headers : undefined 
      });
      if (disputesRes.status === 401) {
        handleAuthError();
        return;
      }
      if (disputesRes.ok) {
        const data = await disputesRes.json();
        setCases(Array.isArray(data) ? data : []);
      }

      // Fetch tickets
      const ticketsRes = await fetch(`${API_BASE_URL}/api/v1/dispute/support?operator_id=${user.operator_id}`, { 
        headers: Object.keys(headers).length ? headers : undefined 
      });
      if (ticketsRes.status === 401) {
        handleAuthError();
        return;
      }
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(Array.isArray(data) ? data : []);
      }

      // Fetch admin queue if admin
      if (user.role === 'admin') {
        const queueRes = await fetch(`${API_BASE_URL}/api/v1/dispute/admin/queue`, { 
          headers: Object.keys(headers).length ? headers : undefined 
        });
        if (queueRes.status === 401) {
          handleAuthError();
          return;
        }
        if (queueRes.ok) {
          const data = await queueRes.json();
          setAdminQueue({
            pending: data.pending || 0,
            in_review: data.in_review || 0,
            resolved_today: data.resolved_today || 0,
            avg_resolution_time: data.avg_resolution_time || '0h',
            urgent_cases: data.urgent_cases || 0
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [user, getAuthHeaders, handleAuthError]);

  useEffect(() => {
    if (user?.operator_id) {
      fetchData();
    }
  }, [user?.operator_id, fetchData]);

  const getRoleColor = (role: Role) => {
    switch(role) {
      case 'admin': return 'bg-purple-600';
      case 'business': return 'bg-amber-600';
      default: return 'bg-emerald-600';
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-slate-900 rounded-2xl rotate-12 animate-pulse" />
          <div className="absolute inset-[3px] bg-slate-800 rounded-xl rotate-12" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-white" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link href="/" className="flex items-center gap-2">
              <KlipLogo />
            </Link>
            
            <div className="ml-2">
              <h1 className="text-sm font-black tracking-tight text-slate-900">
                Resolution<span className="text-amber-600">.Hub</span>
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield size={10} className="text-emerald-500" />
                <span className="text-[8px] font-mono text-slate-400">Arbitration Node</span>
              </div>
            </div>
            
            {user.role === 'admin' && (
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[8px] font-bold border border-purple-200">
                ADMIN
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <TabBtn active={activeTab === 'disputes'} onClick={() => setActiveTab('disputes')} icon={<Gavel size={14}/>} label="Disputes" count={cases.filter(c => c.status !== 'RESOLVED').length} />
            <TabBtn active={activeTab === 'support'} onClick={() => setActiveTab('support')} icon={<LifeBuoy size={14}/>} label="Support" />
            <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={14}/>} label="History" />
          </nav>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button className="p-2 hover:bg-slate-100 rounded-xl transition">
                <Bell size={18} className="text-slate-400" />
              </button>
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </div>

            {/* User Menu */}
            <div className="hidden sm:flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${getRoleColor(user.role)}`}>
                {user.fullName.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-900">{user.fullName.split(' ')[0]}</p>
                <p className="text-[8px] font-mono text-slate-400 uppercase">{user.role}</p>
              </div>
              <BadgeCheck size={10} className="text-emerald-500" />
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={fetchData} 
              className="p-2 hover:bg-slate-100 rounded-xl transition"
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin text-amber-500" : "text-slate-400"} />
            </button>
            
            {/* Home Button */}
            <button 
              onClick={() => router.push('/')}
              className="hidden sm:block p-2 hover:bg-slate-100 rounded-xl transition"
            >
              <Home size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-4">
            <div className="flex flex-col space-y-2">
              <MobileTabBtn active={activeTab === 'disputes'} onClick={() => {setActiveTab('disputes'); setMobileMenuOpen(false);}} icon={<Gavel size={16}/>} label="Disputes" />
              <MobileTabBtn active={activeTab === 'support'} onClick={() => {setActiveTab('support'); setMobileMenuOpen(false);}} icon={<LifeBuoy size={16}/>} label="Support" />
              <MobileTabBtn active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setMobileMenuOpen(false);}} icon={<History size={16}/>} label="History" />
              
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${getRoleColor(user.role)}`}>
                    {user.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin Queue Stats - Only for Admin */}
        {user.role === 'admin' && <AdminQueueStats queue={adminQueue} />}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full border-2 border-amber-200 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-slate-400">Loading disputes & tickets...</p>
          </div>
        ) : (
          <>
            {activeTab === 'disputes' && <DisputesTab user={user} cases={cases} onRefresh={fetchData} getAuthToken={getToken} />}
            {activeTab === 'support' && <SupportTab user={user} onTicketCreated={fetchData} getAuthToken={getToken} />}
            {activeTab === 'history' && <HistoryTab tickets={tickets} />}
          </>
        )}
      </main>
    </div>
  );
}

// Tab Button Components
function TabBtn({ active, onClick, icon, label, count }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${active ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
      {icon} {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">{count}</span>
      )}
    </button>
  );
}

function MobileTabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-3 border-2 ${active ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500'}`}>
      {icon} {label}
    </button>
  );
}