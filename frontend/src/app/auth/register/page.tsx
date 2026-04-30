'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowRight, Eye, EyeOff, Mail, Lock, 
  Building2, ChevronLeft, ShieldCheck, 
  AlertCircle, CheckCircle2, Copy,
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

// --- Types ---
type UserRole = 'INFLUENCER' | 'BUSINESS';

interface RegistrationData {
  email: string;
  fullName: string;
  operatorId: string;
  recoveryPhrase: string;
}

export default function RegistrationPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  // --- UI State ---
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // --- Form Data ---
  const [formData, setFormData] = useState({
    businessName: '', firstName: '', lastName: '',
    email: '', password: '', role: 'INFLUENCER' as UserRole,
    acceptTerms: false
  });

  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  // --- Password Strength Calculation ---
  useEffect(() => {
    let strength = 0;
    const p = formData.password;
    if (p.length >= 8) strength += 25;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) strength += 25;
    if (/[^A-Za-z0-9]/.test(p)) strength += 50;
    setPasswordStrength(strength);
  }, [formData.password]);

  // --- API Handlers ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
        recoveryPhrase: data.recovery_phrase
      });

      setStep(2); // Move to Recovery Phrase
      showToast("Account created successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!registrationData) return;
    navigator.clipboard.writeText(registrationData.recoveryPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Recovery phrase copied", "success");
  };

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
          {step === 1 ? "Identification" : step === 2 ? "Security Backup" : "Complete"}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[460px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* LOGO AREA */}
          <div className="text-center mb-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-xl mb-6">
              <span className="text-amber-400 text-2xl font-black">K</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {step === 1 ? "Create your account" : "Secure your workspace"}
            </h1>
            <p className="text-slate-500 mt-2">
              {step === 1 ? "Join the next generation of infrastructure" : "This phrase is the only way to recover your account."}
            </p>
          </div>

          {/* STEP 1: REGISTRATION FORM */}
          {step === 1 && (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Role Selector */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                {(['INFLUENCER', 'BUSINESS'] as UserRole[]).map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setFormData({ ...formData, role: r })}
                    className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                      formData.role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {formData.role === 'BUSINESS' ? (
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                    <input 
                      required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                      placeholder="Company Name"
                      value={formData.businessName}
                      onChange={e => setFormData({...formData, businessName: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      required className="w-full px-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                    <input 
                      required className="w-full px-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} required
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                    placeholder="Create secure password"
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button 
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="px-1 space-y-2">
                    <div className="flex gap-1.5 h-1">
                      {[25, 50, 75, 100].map((s) => (
                        <div key={s} className={`flex-1 rounded-full transition-all duration-500 ${passwordStrength >= s ? (passwordStrength <= 50 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 px-1">
                <input 
                  type="checkbox" id="terms" required
                  className="mt-1 h-4 w-4 rounded border-slate-200 text-slate-900 focus:ring-slate-900"
                  onChange={e => setFormData({...formData, acceptTerms: e.target.checked})}
                />
                <label htmlFor="terms" className="text-xs text-slate-500 leading-normal">
                  I agree to the <span className="text-slate-900 font-bold underline cursor-pointer">Terms of Service</span> and understand the risks of digital asset management.
                </label>
              </div>

              <button 
                type="submit" disabled={isLoading || !formData.acceptTerms}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-100"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Generate Secure Account <ArrowRight size={20} /></>}
              </button>
            </form>
          )}

          {/* STEP 2: RECOVERY PHRASE (Post-API) */}
          {step === 2 && registrationData && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex gap-3 items-start">
                <AlertCircle className="text-rose-600 shrink-0" size={20} />
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  Write these 12 words down on paper. If you lose them, Klip cannot recover your account or your funds.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {registrationData.recoveryPhrase.split(' ').map((word, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-300 w-4">{i + 1}</span>
                    <span className="text-sm font-bold text-slate-700">{word}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={copyToClipboard}
                  className="w-full py-3.5 border-2 border-slate-100 hover:bg-slate-50 rounded-2xl font-bold flex justify-center items-center gap-2 transition-colors"
                >
                  {copied ? <CheckCircle2 className="text-emerald-500" size={18} /> : <Copy size={18} />}
                  {copied ? "Copied" : "Copy to Clipboard"}
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2"
                >
                  I've Secured My Phrase <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS / FINAL REDIRECT */}
          {step === 3 && registrationData && (
            <div className="text-center space-y-6 animate-in fade-in scale-95">
              <div className="flex justify-center">
                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Setup Complete</h2>
                <p className="text-slate-500 text-sm mt-1">Operator ID: <span className="font-mono text-slate-900">{registrationData.operatorId}</span></p>
              </div>
              <button 
                onClick={() => router.push('/client/dashboard')}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold"
              >
                Enter Dashboard
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-50">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">© 2026 Klip Secure Infrastructure</p>
        <div className="flex gap-6">
          <Link href="/privacy" className="text-[11px] text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest font-bold">Privacy</Link>
          <Link href="/terms" className="text-[11px] text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest font-bold">Protocol</Link>
        </div>
      </footer>
    </div>
  );
}