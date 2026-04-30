'use client';

import { Building2, Users, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-6">About Klip</h1>
          <p className="text-xl text-slate-500 max-w-3xl">
            Building the trust infrastructure for the global creator economy.
            Klip provides institutional-grade escrow protocols that eliminate counterparty risk
            for brands, agencies, and elite creators worldwide.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <Building2 size={32} className="text-slate-900 mb-4" />
              <h3 className="text-xl font-bold mb-3">Our Mission</h3>
              <p className="text-slate-500">
                Secure every partnership. Enable trustless transactions. Protect creators and brands alike.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <Shield size={32} className="text-slate-900 mb-4" />
              <h3 className="text-xl font-bold mb-3">Security First</h3>
              <p className="text-slate-500">
                Multi-signature vaults, 256-bit encryption, and audited smart contracts power every transaction.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <Users size={32} className="text-slate-900 mb-4" />
              <h3 className="text-xl font-bold mb-3">Global Network</h3>
              <p className="text-slate-500">
                Join 10,000+ creators and brands already using Klip to secure partnerships.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all"
          >
            Join Us <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
