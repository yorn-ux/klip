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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-amber-100">
      
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Link href="/auth/login" className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Sign In</span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          <ShieldCheck size={12} className={step === 3 ? "text-emerald-500" : "text-amber-500"} />
          {step === 1 ? "Registration" : step === 2 ? "Verify Email" : "Complete"}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* LOGO AREA */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-xl mb-5">
              <span className="text-amber-400 text-2xl font-black">K</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {step === 1 ? "Create your account" : step === 2 ? "Verify your email" : `Welcome, ${registrationData?.fullName?.split(' ')[0] || 'there'}!`}
            </h1>
            <p className="text-slate-500 text-sm mt-1.5">
              {step === 1 
                ? "Join the next generation of payment infrastructure" 
                : step === 2 
                ? "Enter the 6-digit code sent to your email"
                : `Your ${registrationData?.role || ''} account is ready`}
            </p>
          </div>

          {/* STEP 1: REGISTRATION FORM */}
          {step === 1 && (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Role Selector - Only INFLUENCER and BUSINESS */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 rounded-xl border border-slate-100">
                {(['INFLUENCER', 'BUSINESS'] as UserRole[]).map((r) => {
                  const { icon: Icon, title } = getRoleInfo(r);
                  return (
                    <button
                      key={r} type="button"
                      onClick={() => setFormData({ ...formData, role: r })}
                      className={`py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                        formData.role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Role description */}
              <div className="text-center text-xs text-slate-500 bg-slate-50 py-2 rounded-lg">
                {roleInfo.description}
              </div>

              <div className="space-y-4">
                {formData.role === 'BUSINESS' ? (
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                    <input 
                      required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                      placeholder="Company Name"
                      value={formData.businessName}
                      onChange={e => setFormData({...formData, businessName: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      required className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                    <input 
                      required className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                  <input 
                    type="email" required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} required
                      className="w-full pl-12 pr-24 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                      placeholder="Create secure password"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={handleGeneratePassword}
                        disabled={isGenerating}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                        title="Generate secure password"
                      >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Meter */}
                  {formData.password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1 h-1">
                        {[25, 50, 75, 100].map((s) => (
                          <div 
                            key={s} 
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              passwordValidation.score >= s ? strength.bg : 'bg-slate-100'
                            }`} 
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-medium ${strength.color}`}>
                          {strength.text} password
                        </span>
                        {passwordValidation.score === 100 && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check size={12} /> Secure
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} required
                    className={`w-full pl-12 pr-12 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all outline-none ${
                      formData.confirmPassword && !passwordValidation.matches 
                        ? 'border-rose-300 focus:border-rose-300' 
                        : formData.confirmPassword && passwordValidation.matches
                        ? 'border-emerald-300 focus:border-emerald-300'
                        : 'border-transparent focus:border-slate-200'
                    }`}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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

                {/* Password Requirements Checklist */}
                {formData.password && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                    <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {passwordValidation.hasLength ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {passwordValidation.hasUppercase ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                      <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {passwordValidation.hasNumber ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                      <span>Number</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${passwordValidation.hasSymbol ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {passwordValidation.hasSymbol ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                      <span>Special character</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 px-1">
                <input 
                  type="checkbox" id="terms" required
                  className="mt-0.5 h-4 w-4 rounded border-slate-200 text-slate-900 focus:ring-slate-900"
                  onChange={e => setFormData({...formData, acceptTerms: e.target.checked})}
                />
                <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed">
                  I agree to the <span className="text-slate-900 font-medium underline cursor-pointer">Terms of Service</span> and understand the platform's security practices.
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || !isFormValid}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-slate-100"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>Create account <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {/* STEP 2: EMAIL VERIFICATION */}
          {step === 2 && registrationData && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
                <AlertCircle className="text-blue-600 shrink-0" size={18} />
                <div className="text-xs text-blue-800 leading-relaxed">
                  <p className="font-medium mb-1">Check your email</p>
                  <p>We've sent a 6-digit verification code to <span className="font-mono">{registrationData.email}</span></p>
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
                />
                
                <button 
                  onClick={handleVerifyEmail}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <>Verify Email <CheckCircle2 size={16} /></>}
                </button>

                <button 
                  onClick={resendVerificationCode}
                  disabled={countdown > 0}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code? Click to resend"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS - Role-based redirect */}
          {step === 3 && registrationData && (
            <div className="text-center space-y-6 animate-in fade-in scale-95">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" size={32} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Account verified!</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Operator ID: <span className="font-mono text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">{registrationData.operatorId}</span>
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Role: <span className="capitalize font-medium">{registrationData.role}</span>
                </p>
              </div>
              <button 
                onClick={handleDashboardRedirect}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all flex justify-center items-center gap-2"
              >
                Go to {registrationData.role === 'business' ? 'Business' : 'Creator'} Dashboard <ArrowRight size={18} />
              </button>
            </div>
          )}
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