'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, Zap, Loader2, 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InfluencerDashboard() {
  const router = useRouter();
  const [identity, setIdentity] = useState({ operator_id: '', fullName: '', email: '', avatar_url: '' });
  const [balance, setBalance] = useState<{ amount: number; currency: string } | null>(null);
  const [activeVault, setActiveVault] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const KES_TO_USD = 0.0076; 

   // Get auth token via helper that checks expiry
   const getAuthToken = useCallback(() => {
     try {
       // dynamic import to avoid SSR issues
       // eslint-disable-next-line @typescript-eslint/no-var-requires
       const { getAccessToken } = require('@/lib/token');
       return getAccessToken();
     } catch (err) {
       // fallback: read raw localStorage
       const localToken = localStorage.getItem('access_token');
       if (localToken) return localToken;
       if (typeof document === 'undefined') return null;
       const getCookie = (name: string) => {
         const value = `; ${document.cookie}`;
         const parts = value.split(`; ${name}=`);
         if (parts.length === 2) return parts.pop()?.split(';').shift();
         return null;
       };
       return getCookie('access_token');
     }
   }, []);

  const fetchData = useCallback(async (opId: string) => {
    if (!opId) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }
      
      const headers = { 'Authorization': `Bearer ${token}` };

      const [balRes, vaultRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/wallet/balance`, { headers }),
        fetch(`${API_URL}/api/v1/vaults/latest?operator_id=${opId}&role=influencer`, { headers }),
      ]);

      if (balRes.ok) {
        const balanceData = await balRes.json();
        setBalance(balanceData);
      }
      
      if (vaultRes.ok) {
        const vaultData = await vaultRes.json();
        setActiveVault(vaultData);
      }
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, getAuthToken, router]);

  // Check authentication and get user data
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      
      if (!token) {
        setIsCheckingAuth(false);
        router.replace('/auth/login');
        return;
      }
      
      // Try to get user from localStorage first
      let storedUser = localStorage.getItem('klip_user');
      let userData = null;
      
      if (storedUser) {
        try {
          userData = JSON.parse(storedUser);
        } catch (err) {
          console.error("Failed to parse user data:", err);
        }
      }
      
      // If not in localStorage, fetch from API
      if (!userData) {
        try {
          const response = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            userData = await response.json();
            // Store for future use
            localStorage.setItem('klip_user', JSON.stringify(userData));
            localStorage.setItem('user_role', userData.role?.toLowerCase() || 'influencer');
          } else {
            // Token invalid
            localStorage.removeItem('access_token');
            setIsCheckingAuth(false);
            router.replace('/auth/login');
            return;
          }
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setIsCheckingAuth(false);
          router.replace('/auth/login');
          return;
        }
      }
      
      if (userData) {
        setIdentity({ 
          operator_id: userData.operator_id || userData.id || '', 
          fullName: userData.full_name || userData.fullName || 'Creator',
          email: userData.email || '',
          avatar_url: userData.avatar_url || ''
        });
        setIsCheckingAuth(false);
      } else {
        router.replace('/auth/login');
      }
    };
    
    checkAuth();
  }, [API_URL, getAuthToken, router]);

  // Fetch dashboard data once we have operator_id
  useEffect(() => {
    if (!isCheckingAuth && identity.operator_id) {
      fetchData(identity.operator_id);
    }
  }, [isCheckingAuth, identity.operator_id, fetchData]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-rose-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Simple Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white">
              <Zap size={18} />
            </div>
             <span className="font-semibold text-lg">Klip</span>
          </div>
          
          {/* User Menu */}
          <Link href="/settings" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
              {identity.avatar_url ? (
                <img src={identity.avatar_url} alt={identity.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-500 flex items-center justify-center text-white text-sm font-medium">
                  {identity.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">{identity.fullName.split(' ')[0]}</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Welcome back,</p>
          <h1 className="text-2xl font-semibold text-gray-900">{identity.fullName}</h1>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Available Balance</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-semibold">
                KES {balance?.amount?.toLocaleString() ?? '0'}
              </span>
              <span className="text-sm text-gray-400">
                ≈ ${balance?.amount ? (balance.amount * KES_TO_USD).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Project Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Active Project</h2>
            <Link href="/vaults" className="text-xs text-rose-600 hover:text-rose-700">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-8 flex justify-center border border-gray-100">
              <Loader2 className="animate-spin text-rose-500" size={24} />
            </div>
          ) : activeVault ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs text-gray-400">Project ID: {activeVault.vault_id}</span>
                  <h3 className="text-lg font-semibold mt-1">{activeVault.title}</h3>
                </div>
                {activeVault.vault_id && (
                  <Link 
                    href={`/vaults/${activeVault.vault_id}`}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ArrowUpRight size={18} className="text-gray-400" />
                  </Link>
                )}
              </div>

              {/* Simple Status */}
              <div className="flex gap-4">
                <StatusDot 
                  label="Locked" 
                  active={activeVault.status_code >= 2} 
                  completed={activeVault.status_code >= 2}
                />
                <StatusDot 
                  label="Working" 
                  active={activeVault.status_code === 3} 
                  completed={activeVault.status_code > 3}
                />
                <StatusDot 
                  label="Review" 
                  active={activeVault.status_code === 4} 
                  completed={activeVault.status_code > 4}
                />
                <StatusDot 
                  label="Paid" 
                  active={activeVault.status_code === 5}
                  completed={activeVault.status_code === 5}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <p className="text-gray-500">No active projects</p>
              <Link href="/vaults/create" className="text-sm text-rose-500 hover:text-rose-600 mt-2 inline-block">
                Create your first project →
              </Link>
            </div>
          )}
        </div>

        {/* Balance Alert - Only if needed */}
        {balance?.amount === 0 && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Low balance</h3>
                <p className="text-sm text-amber-700">Add funds to create new projects</p>
              </div>
               <Link 
                 href="/wallet" 
                 className="text-sm text-amber-800 hover:text-amber-900 font-medium"
               >
                 Deposit →
               </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Status Dot Component
function StatusDot({ label, active, completed }: { label: string; active?: boolean; completed?: boolean }) {
  let dotColor = 'bg-gray-200'; // default
  if (active) dotColor = 'bg-rose-500';
  if (completed) dotColor = 'bg-emerald-500';

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}