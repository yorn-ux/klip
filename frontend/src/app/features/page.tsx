'use client';

import { Shield, Zap, Scale, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Platform Features</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Next-generation infrastructure for secure partnerships and escrow management.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Tier-1 Protection',
                desc: 'Funds held in segregated, multi-signature vaults isolated from operational capital.',
              },
              {
                icon: Zap,
                title: 'Instant Settlement',
                desc: 'Capital disbursed immediately via deterministic protocol once verification criteria are met.',
              },
              {
                icon: Scale,
                title: 'Neutral Arbitration',
                desc: 'Expert dispute resolution layer for high-stakes partnerships and complex mandates.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <feature.icon size={32} className="text-slate-900 mb-4" />
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all"
          >
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
