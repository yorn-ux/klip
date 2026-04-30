'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Loader2, Mail, Lock, 
  Eye, EyeOff, ChevronLeft, ShieldCheck, 
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/store/useNotificationStore';

// --- Interfaces ---
interface UserSession {
  id: string;
  full_name: string;
  role: 'influencer' | 'business' | 'admin';
  email: string;
  setup_complete: boolean;
  login_timestamp: number;
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  // --- Session Constants ---
  const TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

  // --- Auth Logic Helpers ---
  const clearAuthData = () => {
    localStorage.clear();
    document.cookie = 'klip_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  };

  const isTokenExpired = (timestamp: number) => Date.now() - timestamp > TOKEN_EXPIRY;

  // --- Effects ---
  useEffect(() => {
    const loginTimestamp = localStorage.getItem('login_timestamp');
    if (loginTimestamp && isTokenExpired(parseInt(loginTimestamp))) {
      clearAuthData();
      showToast('Session expired', 'info');
    }
  }, [showToast]);

  // --- Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Login failed');

      // Process Session
      const rawRole = (data.user.role || '').toLowerCase();
      const resolvedRole = ['admin', 'business'].includes(rawRole) ? rawRole : 'influencer';
      const timestamp = Date.now();

      const session: UserSession = {
        id: data.user.id,
        full_name: data.user.full_name || 'User',
        role: resolvedRole as any,
        email: data.user.email,
        setup_complete: data.user.setup_complete || false,
        login_timestamp: timestamp
      };

      // Storage
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('klip_user', JSON.stringify(session));
      localStorage.setItem('login_timestamp', timestamp.toString());

      // Cookies for Middleware
      document.cookie = `klip_token=${data.access_token}; path=/; max-age=1800; SameSite=Lax`;

      showToast(`Welcome, ${session.full_name}`, 'success');

      // Redirect
      const path = resolvedRole === 'admin' ? '/admin' : resolvedRole === 'business' ? '/business' : '/client';
      router.replace(`${path}/dashboard`);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-amber-100">
      
      {/* 1. Header Navigation */}
      <header className="p-6 flex justify-between items-center">
        <Link href="/" className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          <ShieldCheck size={12} className="text-emerald-500" />
          Secure
        </div>
      </header>

      {/* 2. Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          {/* Logo & Intro */}
          <div className="text-center mb-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-xl mb-6">
              <span className="text-amber-400 text-2xl font-black">K</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-slate-500 mt-2">Enter your details to access your workspace</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-sm animate-in zoom-in-95">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <input 
                  id="email"
                  type="email" 
                  required 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none text-slate-900"
                  placeholder="name@company.com"
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
                <Link href="/auth/recover" className="text-xs font-bold text-amber-600 hover:text-amber-700">Forgot?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none text-slate-900"
                  placeholder="••••••••"
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-slate-200"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* 3. Bottom Actions */}
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-slate-900 font-bold hover:underline">
                Create one for free
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="p-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-50">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">© 2025 Klip Secure Infrastructure</p>
        <div className="flex gap-6">
          <Link href="/privacy" className="text-[11px] text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest font-bold">Privacy</Link>
          <Link href="/support" className="text-[11px] text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest font-bold">Support</Link>
        </div>
      </footer>
    </div>
  );
}