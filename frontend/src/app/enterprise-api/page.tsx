'use client';

import { Code, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function EnterpriseAPIPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Enterprise API</h1>
          <p className="text-xl text-slate-500 max-w-3xl">
            Integrate Klip's sovereign protocol directly into your workflow.
            RESTful endpoints, webhooks, and SDKs available.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <Code size={24} className="text-slate-900" />
              <h3 className="text-2xl font-bold">API Documentation</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Full API reference, authentication guides, and example implementations.
            </p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all"
            >
              View Docs <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all"
          >
            Get API Access <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
