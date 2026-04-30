'use client';

import { Lock, FileCheck, CheckCircle } from 'lucide-react';

export default function SecurityProtocolPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Security Protocol</h1>
          <p className="text-xl text-slate-500 max-w-3xl">
            We've replaced "trust" with cryptographic verification. Here's how your money moves.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          {[
            {
              step: '01',
              icon: Lock,
              title: 'Lock',
              desc: 'Agreement is signed and funds are committed to the secure vault.',
            },
            {
              step: '02',
              icon: FileCheck,
              title: 'Verify',
              desc: 'Proof of work is submitted and validated via our secure gateway.',
            },
            {
              step: '03',
              icon: CheckCircle,
              title: 'Release',
              desc: 'Capital is instantly routed to the creator with an immutable audit trail.',
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-6 mb-12 last:mb-0">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                  {step.step}
                </div>
              </div>
              <div className="flex-1 pt-4">
                <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-500 text-lg">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
