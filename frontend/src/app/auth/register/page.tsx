'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowRight, Eye, EyeOff, Mail, Lock, 
  Building2, ChevronLeft, ShieldCheck, 
  AlertCircle, CheckCircle2, Key, 
  Check, X, User, Briefcase
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

// --- Types ---
type UserRole = 'INFLUENCER' | 'BUSINESS';

interface RegistrationData {
  email: string;
  fullName: string;
  operatorId: string;
  role: string;
  requiresVerification: boolean;
}

// --- Password Generation Helper ---
const generateSecurePassword = (): string => {
  const length = 16;
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// --- Password Strength & Match Check ---
interface PasswordValidation {
  hasLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  score: number;
  matches: boolean;
}

const validatePassword = (password: string, confirmPassword: string): PasswordValidation => {
  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  
  let score = 0;
  if (hasLength) score += 25;
  if (hasUppercase) score += 25;
  if (hasNumber) score += 25;
  if (hasSymbol) score += 25;
  
  return {
    hasLength,
    hasUppercase,
    hasNumber,
    hasSymbol,
    score,
    matches: password === confirmPassword && password.length > 0
  };
};

// Role-based dashboard routing
const getDashboardRoute = (role: string): string => {
  const roleLower = role.toLowerCase();
  switch (roleLower) {
    case 'business':
      return '/business/dashboard';
    case 'influencer':
      return '/client/dashboard';
    default:
      return '/client/dashboard';
  }
};

export default function RegistrationPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  // --- UI State ---
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // --- Form Data ---
  const [formData, setFormData] = useState({
    businessName: '', firstName: '', lastName: '',
    email: '', password: '', confirmPassword: '', role: 'INFLUENCER' as UserRole,
    acceptTerms: false
  });

  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Password validation
  const passwordValidation = validatePassword(formData.password, formData.confirmPassword);
  const isPasswordValid = passwordValidation.score === 100 && passwordValidation.matches;
  const isFormValid = formData.acceptTerms && 
    (formData.role === 'BUSINESS' ? formData.businessName.trim() : (formData.firstName.trim() && formData.lastName.trim())) &&
    formData.email.trim() &&
    isPasswordValid;

  // --- Generate Suggested Password ---
  const handleGeneratePassword = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newPassword = generateSecurePassword();
      setFormData(prev => ({ 
        ...prev, 
        password: newPassword,
        confirmPassword: newPassword
      }));
      setIsGenerating(false);
      showToast("Secure password generated", "success");
    }, 150);
  };

  // --- API Handlers ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      showToast("Please ensure your passwords match and meet security requirements", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      const payloadName = formData.role === 'BUSINESS' 
        ? formData.businessName 
        : `${formData.firstName} ${formData.lastName}`;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: payloadName.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          role: formData.role.toLowerCase()
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      setRegistrationData({
        email: formData.email,
        fullName: payloadName,
        operatorId: data.operator_id,
        role: formData.role.toLowerCase(),
        requiresVerification: data.requires_verification || false
      });

      if (data.requires_verification) {
        setStep(2);
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) clearInterval(timer);
            return prev - 1;
          });
        }, 1000);
        showToast("Verification code sent to your email", "success");
      } else {
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user_role', formData.role.toLowerCase());
          const dashboardRoute = getDashboardRoute(formData.role);
          router.push(dashboardRoute);
        } else {
          setStep(3);
          showToast("Account created successfully", "success");
        }
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

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
          email: registrationData?.email,
          code: verificationCode
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed");

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', registrationData?.role || 'influencer');
      }
      
      showToast("Email verified successfully!", "success");
      setStep(3);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerificationCode = async () => {
    if (countdown > 0) {
      showToast(`Please wait ${countdown} seconds before resending`, "info");
      return;
    }
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationData?.email }),
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
        showToast("Failed to resend code. Please try again.", "error");
      }
    } catch (err) {
      showToast("Failed to resend code", "error");
    }
  };

  const handleDashboardRedirect = () => {
    const role = registrationData?.role || 'influencer';
    const dashboardRoute = getDashboardRoute(role);
    router.push(dashboardRoute);
  };

  // Password strength color and label
  const getStrengthLabel = () => {
    if (passwordValidation.score === 100) return { text: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-500' };
    if (passwordValidation.score >= 75) return { text: 'Good', color: 'text-emerald-600', bg: 'bg-emerald-500' };
    if (passwordValidation.score >= 50) return { text: 'Fair', color: 'text-amber-600', bg: 'bg-amber-500' };
    if (passwordValidation.score >= 25) return { text: 'Weak', color: 'text-rose-600', bg: 'bg-rose-500' };
    return { text: 'Very Weak', color: 'text-rose-600', bg: 'bg-rose-500' };
  };
  
  const strength = getStrengthLabel();

  // Role icon and description
  const getRoleInfo = (role: UserRole) => {
    switch(role) {
      case 'BUSINESS':
        return { icon: Briefcase, title: 'Business', description: 'Launch campaigns, manage team, access analytics' };
      case 'INFLUENCER':
      default:
        return { icon: User, title: 'Creator', description: 'Join campaigns, earn rewards, showcase your work' };
    }
  };

  const roleInfo = getRoleInfo(formData.role);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(135deg,_#f8fafc_0%,_#fffbeb_100%)] text-slate-900 flex flex-col font-sans selection:bg-amber-100">
      <header className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/auth/login" className="group flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>Back to Sign In</span>
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
            <ShieldCheck size={12} className={step === 3 ? 'text-emerald-500' : 'text-amber-500'} />
            {step === 1 ? 'Registration' : step === 2 ? 'Verify Email' : 'Complete'}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_35%)]" />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Create account</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {step === 1 ? 'Create your account' : step === 2 ? 'Verify your email' : `Welcome, ${registrationData?.fullName?.split(' ')[0] || 'there'}!`}
                  </h1>
                </div>
                <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:block">
                  Secure setup
                </div>
              </div>

              <p className="mb-8 text-sm leading-6 text-slate-600 sm:text-[15px]">
                {step === 1
                  ? 'Join a modern payment infrastructure with role-based access and secure onboarding.'
                  : step === 2
                  ? 'Enter the 6-digit code sent to your email to complete verification.'
                  : `Your ${registrationData?.role || ''} account is ready for the next step.`}
              </p>

              {step === 1 && (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                    {(['INFLUENCER', 'BUSINESS'] as UserRole[]).map((r) => {
                      const { icon: Icon, title } = getRoleInfo(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r })}
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                            formData.role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{title}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
                    {roleInfo.description}
                  </div>

                  <div className="space-y-4">
                    {formData.role === 'BUSINESS' ? (
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" size={18} />
                        <input
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                          placeholder="Company Name"
                          value={formData.businessName}
                          onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                          placeholder="First Name"
                          value={formData.firstName}
                          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                        <input
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                          placeholder="Last Name"
                          value={formData.lastName}
                          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" size={18} />
                      <input
                        type="email"
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-24 outline-none transition-all focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                          placeholder="Create secure password"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            disabled={isGenerating}
                            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                            title="Generate secure password"
                          >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {formData.password && (
                        <div className="space-y-1.5">
                          <div className="flex h-1 gap-1">
                            {[25, 50, 75, 100].map((s) => (
                              <div
                                key={s}
                                className={`flex-1 rounded-full transition-all duration-300 ${passwordValidation.score >= s ? strength.bg : 'bg-slate-100'}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${strength.color}`}>{strength.text} password</span>
                            {passwordValidation.score === 100 && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Check size={12} /> Secure
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" size={18} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        className={`w-full rounded-2xl border bg-slate-50 py-3.5 pl-12 pr-12 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/10 ${
                          formData.confirmPassword && !passwordValidation.matches
                            ? 'border-rose-300 focus:border-rose-300'
                            : formData.confirmPassword && passwordValidation.matches
                            ? 'border-emerald-300 focus:border-emerald-300'
                            : 'border-slate-200 focus:border-slate-300'
                        }`}
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      {formData.confirmPassword && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                          {passwordValidation.matches ? (
                            <Check size={16} className="text-emerald-500" />
                          ) : (
                            <X size={16} className="text-rose-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {formData.password && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                        <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {passwordValidation.hasLength ? <Check size={12} /> : <div className="h-3 w-3 rounded-full border border-slate-300" />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {passwordValidation.hasUppercase ? <Check size={12} /> : <div className="h-3 w-3 rounded-full border border-slate-300" />}
                          <span>Uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {passwordValidation.hasNumber ? <Check size={12} /> : <div className="h-3 w-3 rounded-full border border-slate-300" />}
                          <span>Number</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasSymbol ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {passwordValidation.hasSymbol ? <Check size={12} /> : <div className="h-3 w-3 rounded-full border border-slate-300" />}
                          <span>Special character</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 px-1">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="mt-0.5 h-4 w-4 rounded border-slate-200 text-slate-900 focus:ring-slate-900"
                      onChange={e => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed text-slate-500">
                      I agree to the <span className="cursor-pointer font-semibold text-slate-900 underline">Terms of Service</span> and understand the platform's security practices.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><span>Create account</span><ArrowRight size={18} /></>}
                  </button>
                </form>
              )}

              {step === 2 && registrationData && (
                <div className="space-y-6">
                  <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <AlertCircle className="mt-0.5 shrink-0 text-blue-600" size={18} />
                    <div className="text-sm leading-6 text-blue-800">
                      <p className="font-semibold">Check your email</p>
                      <p className="mt-1">We sent a 6-digit verification code to <span className="font-mono font-semibold">{registrationData.email}</span>.</p>
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
                    />

                    <button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <><span>Verify Email</span><CheckCircle2 size={16} /></>}
                    </button>

                    <button
                      onClick={resendVerificationCode}
                      disabled={countdown > 0}
                      className="w-full text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code? Click to resend"}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && registrationData && (
                <div className="space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 className="text-emerald-500" size={32} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Account verified!</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Operator ID: <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">{registrationData.operatorId}</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Role: <span className="font-medium capitalize text-slate-600">{registrationData.role}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleDashboardRedirect}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    Go to {registrationData.role === 'business' ? 'Business' : 'Creator'} Dashboard <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden flex-col justify-between rounded-[32px] border border-amber-100/80 bg-slate-900 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.15)] lg:flex">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                Premium onboarding
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">A secure welcome for every kind of team.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Create your account and move into your workspace with a polished, protected experience from the very first step.
              </p>
            </div>

            <div className="space-y-4">
              {[
                'Role-based access for creators and businesses',
                'Protected password setup with instant validation',
                'Fast verification and smooth dashboard entry'
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-amber-400" size={18} />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Trusted by modern operators</p>
              <p className="mt-2">Built for clarity, speed, and confident account creation.</p>
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