'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowRight, Eye, EyeOff, Mail, Lock, 
  ChevronLeft, ShieldCheck, AlertCircle, 
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

// --- Types ---
interface VerificationData {
  email: string;
  requiresVerification: boolean;
}

// Role-based dashboard routing - FAST lookup
const getDashboardRoute = (role: string): string => {
  const roleLower = role.toLowerCase();
  // Direct mapping for speed
  if (roleLower === 'admin') return '/admin/dashboard';
  if (roleLower === 'business') return '/business/dashboard';
  return '/client/dashboard'; // Default for influencer and others
};

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  // --- UI State ---
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
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
  const [verificationTimer, setVerificationTimer] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (verificationTimer) clearInterval(verificationTimer);
    };
  }, [verificationTimer]);

  // --- Login Handler - Optimized for speed ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        
        // Start countdown for resend
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) clearInterval(timer);
            return prev - 1;
          });
        }, 1000);
        setVerificationTimer(timer);
        
        showToast("Please verify your email first", "info");
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error(data.detail || "Login failed");

      // STORE TOKEN IMMEDIATELY
      const token = data.access_token;
      localStorage.setItem('access_token', token);
      
      // Get user role from response (already provided by backend)
      const userRole = data.user?.role?.toLowerCase() || 'influencer';
      const userEmail = data.user?.email || formData.email;
      const userName = data.user?.full_name || '';
      
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('user_email', userEmail);
      localStorage.setItem('user_name', userName);
      
      showToast("Login successful!", "success");
      
      // INSTANT REDIRECT - no delay
      const dashboardRoute = getDashboardRoute(userRole);
      router.push(dashboardRoute);
      
    } catch (err: any) {
      showToast(err.message, "error");
      setIsLoading(false);
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
        setVerificationTimer(timer);
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

  // --- Verify Email Code - With instant redirect ---
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
        // Store token immediately
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_email', verificationData?.email || '');
        
        // Get user role - either from response or fetch
        let userRole = 'influencer';
        
        if (data.user?.role) {
          userRole = data.user.role.toLowerCase();
        } else {
          // Fast fetch user data to get role
          const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          if (meRes.ok) {
            const userData = await meRes.json();
            userRole = userData.role?.toLowerCase() || 'influencer';
            localStorage.setItem('user_name', userData.full_name || '');
          }
        }
        
        localStorage.setItem('user_role', userRole);
        
        showToast("Email verified successfully!", "success");
        
        // INSTANT REDIRECT to role-based dashboard
        const dashboardRoute = getDashboardRoute(userRole);
        router.push(dashboardRoute);
      }
      
    } catch (err: any) {
      showToast(err.message, "error");
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-amber-100">
      
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Link href="/" className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <Link href="/auth/register" className="text-sm font-medium text-slate-900 bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
          Create account
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* LOGO AREA */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-xl mb-5">
              <span className="text-amber-400 text-2xl font-black">K</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {verificationData ? "Verify your email" : "Welcome back"}
            </h1>
            <p className="text-slate-500 text-sm mt-1.5">
              {verificationData 
                ? "Enter the 6-digit code sent to your email" 
                : "Sign in to your Klip account"}
            </p>
          </div>

          {/* VERIFICATION FORM (shown when email not verified) */}
          {verificationData ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start">
                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p className="font-medium mb-1">Email not verified</p>
                  <p>We've sent a verification code to <span className="font-mono font-medium">{verificationData.email}</span></p>
                  <p className="mt-1 text-amber-600">Please verify to access your account.</p>
                </div>
              </div>

              <div className="space-y-3">
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                  autoFocus
                />
                
                <button 
                  onClick={handleVerifyEmail}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <>Verify & Continue <ArrowRight size={16} /></>}
                </button>

                <div className="flex gap-3">
                  <button 
                    onClick={resendVerificationCode}
                    disabled={countdown > 0 || isResending}
                    className="flex-1 text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 py-2"
                  >
                    {isResending ? (
                      <Loader2 size={14} className="animate-spin inline mr-1" />
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
                      if (verificationTimer) clearInterval(verificationTimer);
                      setCountdown(0);
                    }}
                    className="flex-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <input 
                  type="email" required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} required
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                  placeholder="Password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-slate-100"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>Sign in <ArrowRight size={18} /></>}
              </button>

              {/* Sign Up Link */}
              <div className="text-center pt-4">
                <p className="text-xs text-slate-400">
                  Don't have an account?{' '}
                  <Link href="/auth/register" className="text-slate-900 font-medium hover:underline">
                    Create account
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
              <ShieldCheck size={12} />
              <span>Secure login with bank-grade encryption</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">© 2025 Klip Secure Infrastructure</p>
        <div className="flex gap-6">
          <Link href="/privacy" className="text-[10px] text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider font-medium">Privacy</Link>
          <Link href="/terms" className="text-[10px] text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider font-medium">Protocol</Link>
        </div>
      </footer>
    </div>
  );
}