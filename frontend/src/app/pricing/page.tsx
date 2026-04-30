'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Pricing</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Transparent pricing for every partner. No hidden fees.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Influencer', fee: '0.85%' },
              { name: 'Business', fee: '0.55%' },
              { name: 'Enterprise', fee: 'Custom' },
            ].map((plan, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-4xl font-bold text-amber-500 mb-4">{plan.fee}</p>
                <p className="text-slate-500 text-sm">per transaction</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all"
          >
            Start Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
