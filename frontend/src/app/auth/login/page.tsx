'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowRight, Eye, EyeOff, Mail, Lock, 
  ShieldCheck, AlertCircle, 
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

// Role-based dashboard routing
const getDashboardRoute = (role: string): string => {
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') return '/admin/dashboard';
  if (roleLower === 'business') return '/business/dashboard';
  return '/client/dashboard';
};

// Helper to set cookies (for middleware)
const setCookie = (name: string, value: string, hours: number = 1) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
};

interface VerificationData {
  email: string;
  requiresVerification: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  // --- UI State ---
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // --- Form Data ---
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // --- Verification State ---
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // CHECK IF ALREADY LOGGED IN
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');
    
    if (token && userRole && !isRedirecting) {
      setIsRedirecting(true);
      const dashboardRoute = getDashboardRoute(userRole);
      router.replace(dashboardRoute);
    }
  }, [router, isRedirecting]);

  // --- Login Handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRedirecting || isLoading) return;
    
    if (!formData.email || !formData.password) {
      showToast("Please enter both email and password", "error");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        }),
      });

      const data = await response.json();
      
      // Handle unverified email
      if (response.status === 403 && data.detail?.includes("Email not verified")) {
        setVerificationData({
          email: formData.email.toLowerCase().trim(),
          requiresVerification: true
        });
        
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) clearInterval(timer);
            return prev - 1;
          });
        }, 1000);
        
        showToast("Please verify your email first", "info");
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error(data.detail || "Login failed");

      // Store token and user data
      const token = data.access_token;
      const expiresIn = data.expires_in || 3600; // default to 1 hour
      
      // Store in localStorage with expiry
      try {
        const { setAccessToken } = await import('@/lib/token');
        setAccessToken(token, expiresIn);
      } catch (err) {
        // fallback
        localStorage.setItem('access_token', token);
        const exp = Date.now() + expiresIn * 1000;
        localStorage.setItem('access_token_exp', exp.toString());
      }
      
      let userRole = 'influencer';
      if (data.user && data.user.role) {
        userRole = data.user.role.toLowerCase();
      }
      
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('user_email', data.user?.email || formData.email);
      localStorage.setItem('user_name', data.user?.full_name || '');
      localStorage.setItem('user_operator_id', data.user?.operator_id || '');
      
      // ALSO SET COOKIES FOR MIDDLEWARE
      const cookieHours = expiresIn / 3600; // Convert seconds to hours
      setCookie('access_token', token, cookieHours);
      setCookie('user_role', userRole, cookieHours);
      setCookie('user_email', data.user?.email || formData.email, cookieHours);
      
      showToast("Login successful!", "success");
      
      setIsRedirecting(true);
      const dashboardRoute = getDashboardRoute(userRole);
      router.push(dashboardRoute);
      
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(err.message, "error");
      setIsLoading(false);
      setIsRedirecting(false);
    }
  };

  // --- Resend Verification Code ---
  const resendVerificationCode = async () => {
    if (countdown > 0) {
      showToast(`Please wait ${countdown} seconds before resending`, "info");
      return;
    }
    
    setIsResending(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationData?.email }),
      });

      if (res.ok) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) clearInterval(timer);
            return prev - 1;
          });
        }, 1000);
        showToast("New verification code sent to your email", "success");
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to resend code", "error");
      }
    } catch (err) {
      showToast("Failed to resend code", "error");
    } finally {
      setIsResending(false);
    }
  };

  // --- Verify Email Code ---
  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast("Please enter the 6-digit verification code", "error");
      return;
    }

    setIsVerifying(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationData?.email,
          code: verificationCode
        }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Verification failed");

        if (data.access_token) {
        const token = data.access_token;
        const expiresIn = data.expires_in || 3600;
        
        try {
          const { setAccessToken } = await import('@/lib/token');
          setAccessToken(token, expiresIn);
        } catch (err) {
          localStorage.setItem('access_token', token);
          const exp = Date.now() + expiresIn * 1000;
          localStorage.setItem('access_token_exp', exp.toString());
        }
        localStorage.setItem('user_email', verificationData?.email || '');
        
        let userRole = 'influencer';
        
        if (data.user?.role) {
          userRole = data.user.role.toLowerCase();
        } else {
          const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (meRes.ok) {
            const userData = await meRes.json();
            userRole = userData.role?.toLowerCase() || 'influencer';
            localStorage.setItem('user_name', userData.full_name || '');
            localStorage.setItem('user_operator_id', userData.operator_id || '');
          }
        }
        
        localStorage.setItem('user_role', userRole);
        
        const cookieHours = expiresIn / 3600;
        setCookie('access_token', token, cookieHours);
        setCookie('user_role', userRole, cookieHours);
        setCookie('user_email', verificationData?.email || '', cookieHours);
        
        showToast("Email verified successfully!", "success");
        
        setIsRedirecting(true);
        const dashboardRoute = getDashboardRoute(userRole);
        router.push(dashboardRoute);
      }
      
    } catch (err: any) {
      console.error('Verification error:', err);
      showToast(err.message, "error");
      setIsVerifying(false);
      setIsRedirecting(false);
    }
  };

  // If already redirecting, show loading
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-slate-900 mx-auto mb-4" />
          <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(135deg,_#f8fafc_0%,_#fffbeb_100%)] text-slate-900 flex flex-col font-sans selection:bg-amber-100">
      <header className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="group flex items-center gap-3 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-amber-400 shadow-lg shadow-slate-900/10">
              K
            </span>
            <span className="text-base tracking-tight">Klip</span>
          </Link>
          <Link href="/auth/register" className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900">
            Create account
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_35%)]" />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Secure access</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {verificationData ? "Verify your email" : "Welcome back"}
                  </h1>
                </div>
                <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:block">
                  Protected login
                </div>
              </div>

              <p className="mb-8 text-sm leading-6 text-slate-600 sm:text-[15px]">
                {verificationData
                  ? "Enter the 6-digit code sent to your email to continue securely."
                  : "Sign in to your Klip account and manage your workspace with confidence."}
              </p>

              {verificationData ? (
                <div className="space-y-6">
                  <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={18} />
                    <div className="text-sm leading-6 text-amber-800">
                      <p className="font-semibold">Email not verified</p>
                      <p className="mt-1">We sent a verification code to <span className="font-mono font-semibold">{verificationData.email}</span>.</p>
                      <p className="mt-1 text-amber-700">Please verify to access your account.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                      autoFocus
                    />

                    <button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <><span>Verify & Continue</span><ArrowRight size={16} /></>}
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={resendVerificationCode}
                        disabled={countdown > 0 || isResending}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isResending ? (
                          <Loader2 size={14} className="mr-1 inline animate-spin" />
                        ) : countdown > 0 ? (
                          `Resend in ${countdown}s`
                        ) : (
                          "Resend code"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setVerificationData(null);
                          setVerificationCode('');
                          setCountdown(0);
                          setIsRedirecting(false);
                        }}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Back to login
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" size={18} />
                    <input
                      type="email"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      autoComplete="email"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                      placeholder="Password"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-slate-500 transition-colors hover:text-slate-900"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || isRedirecting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><span>Sign in</span><ArrowRight size={18} /></>}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-sm text-slate-500">
                      Don't have an account?{' '}
                      <Link href="/auth/register" className="font-semibold text-slate-900 transition hover:underline">
                        Create account
                      </Link>
                    </p>
                  </div>
                </form>
              )}

              <div className="mt-8 flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <ShieldCheck size={12} className="mr-2 text-amber-500" />
                Secure login with bank-grade encryption
              </div>
            </div>
          </div>

          <div className="hidden flex-col justify-between rounded-[32px] border border-amber-100/80 bg-slate-900 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.15)] lg:flex">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                Premium experience
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">Built for fast, secure team access.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Move from sign-in to action seamlessly while keeping every interaction protected and polished.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Instant access with role-based dashboards",
                "Encrypted sessions and protected credentials",
                "Modern controls for admins, teams, and clients"
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-amber-400" size={18} />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Trusted by modern operators</p>
              <p className="mt-2">Security-first workflows designed for clarity, speed, and control.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60 px-4 py-6 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 md:flex-row">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">© 2025 Klip Secure Infrastructure</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 transition-colors hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 transition-colors hover:text-slate-900">Protocol</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
