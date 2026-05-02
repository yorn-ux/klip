'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Mail,
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function RecoverPage() {
  const { showToast } = useNotificationStore();

  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ email: '' });

  // --- Handlers ---
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(
        `${API_URL}/api/v1/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Recovery failed');
      }

      setSuccess(
        'If an account exists with that email, you will receive reset instructions.'
      );

      showToast('Recovery email sent', 'success');

      setFormData({ email: '' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-amber-100">

      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Link
          href="/"
          className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          <ShieldCheck size={12} className="text-emerald-500" />
          Secure
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">

          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-xl mb-6">
              <span className="text-amber-400 text-2xl font-black">K</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Recover Account</h1>
            <p className="text-slate-500 mt-2">
              Enter your email to reset your password
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
              <AlertCircle size={18} />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
              <CheckCircle2 size={18} />
              <p className="font-medium">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRecover} className="space-y-5">

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700 ml-1"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ email: e.target.value })
                  }
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <ArrowRight className="animate-spin" size={20} />
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Login */}
          <div className="mt-10 text-center text-sm text-slate-500">
            Remember your password?{' '}
            <Link
              href="/auth/login"
              className="text-slate-900 font-bold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-50">
        <p className="text-[11px] text-slate-400 uppercase tracking-widest">
          © 2025 Klip Secure Infrastructure
        </p>

        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="text-[11px] text-slate-400 hover:text-slate-900 uppercase tracking-widest font-bold"
          >
            Privacy
          </Link>
          <Link
            href="/support"
            className="text-[11px] text-slate-400 hover:text-slate-900 uppercase tracking-widest font-bold"
          >
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}