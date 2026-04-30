'use client';

import { Scale, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ArbitrationPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Arbitration Enclave</h1>
          <p className="text-xl text-slate-500 max-w-3xl">
            Neutral dispute resolution for high-stakes partnerships.
            Our expert arbitrators ensure fair outcomes quickly and confidentially.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <ShieldCheck size={32} className="text-slate-900 mb-4" />
              <h3 className="text-xl font-bold mb-3">Impartial Review</h3>
              <p className="text-slate-500">
                Third-party experts review evidence and deliver binding resolutions.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <Scale size={32} className="text-slate-900 mb-4" />
              <h3 className="text-xl font-bold mb-3">Fast Resolution</h3>
              <p className="text-slate-500">
                Disputes resolved within 72 hours. No lengthy court processes.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <FileText size={32} className="text-slate-900 mb-4" />
              <h3 className="text-xl font-bold mb-3">Audit Trail</h3>
              <p className="text-slate-500">
                Every decision recorded on-chain for transparency and immutability.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all"
          >
            Open a Dispute <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
