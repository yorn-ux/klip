'use client';

import { 
  ArrowRight, Lock, FileCheck, 
  Scale, Shield, CheckCircle, 
   Users, Briefcase,
  Award, Clock, Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function ProfessionalLandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const KlipLogo = () => (
    <div className="flex items-center gap-2 group">
      <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center transition-all group-hover:shadow-lg">
        <span className="text-white font-bold text-lg">K</span>
      </div>
      <span className="text-xl font-semibold tracking-tight text-slate-900">KLIP</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white font-sans antialiased">
      
      {/* --- Navigation --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm py-3' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/"><KlipLogo /></Link>
          
          <div className="hidden md:flex items-center gap-8">
             {['Platform', 'Security', 'Pricing', 'Enterprise'].map((item) => (
               <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                 {item}
               </a>
             ))}
           </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">Sign in</Link>
            <Link href="/register" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 -z-10" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Enterprise-grade escrow platform
            </div>
            
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Secure payments for{' '}
              <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                creator partnerships
              </span>
            </h1>
            
            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-xl">
              KLIP provides institutional-grade escrow and payment infrastructure for brands, agencies, and creators. Reduce counterparty risk and get paid faster.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm">
                Start a project <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:border-slate-300 transition-all">
                Schedule a demo
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-12 pt-4">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                ))}
              </div>
              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">10,000+</span> creators and brands
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Trust Bar --- */}
      <section className="py-8 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-medium text-slate-400 text-center mb-4 tracking-wider">TRUSTED BY LEADING BRANDS</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 grayscale opacity-60">
            <span className="font-semibold text-slate-500 text-lg tracking-tighter">NIKE</span>
            <span className="font-semibold text-slate-500 text-lg tracking-tighter">VOGUE</span>
            <span className="font-semibold text-slate-500 text-lg tracking-tighter">ADIDAS</span>
            <span className="font-semibold text-slate-500 text-lg tracking-tighter">CARTIER</span>
            <span className="font-semibold text-slate-500 text-lg tracking-tighter">DIOR</span>
          </div>
        </div>
      </section>

      {/* --- Platform Overview --- */}
      <section id="platform" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">How KLIP works</h2>
            <p className="text-slate-500">A transparent, secure process for every transaction.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Agreement', description: 'Brand and creator define deliverables, timeline, and payment terms on KLIP.', icon: Briefcase },
              { step: '02', title: 'Secure holding', description: 'Funds are deposited into a regulated, segregated escrow account.', icon: Shield },
              { step: '03', title: 'Verification', description: 'Creator submits proof of work. Brand confirms deliverables are met.', icon: FileCheck },
              { step: '04', title: 'Release', description: 'Funds are automatically released to the creator upon confirmation.', icon: Wallet },
              { step: '05', title: 'Dispute resolution', description: 'Neutral arbitration process for any disagreements.', icon: Scale },
              { step: '06', title: 'Audit trail', description: 'Complete transaction records available for accounting and compliance.', icon: CheckCircle },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="text-2xl font-bold text-slate-300 group-hover:text-slate-400 transition-colors">
                  {item.step}
                </div>
                <div>
                  <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl mb-3">
                    <item.icon size={18} className="text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Key Features --- */}
      <section id="security" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Security you can rely on</h2>
            <p className="text-slate-500">Built for the most demanding professional environments.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Multi-signature vaults', description: 'No single point of failure. Multiple approvals required for any transaction.' },
              { icon: Lock, title: 'Bank-grade encryption', description: '256-bit encryption for all data and transactions.' },
              { icon: Clock, title: 'Automated settlement', description: 'Instant payouts upon milestone completion.' },
              { icon: Award, title: 'Regulated partners', description: 'Funds held with regulated financial institutions.' },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon size={18} className="text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Benefits for Each Role --- */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Built for both sides of the partnership</h2>
            <p className="text-slate-500">KLIP serves the unique needs of brands and creators.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Briefcase size={22} className="text-slate-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For brands & agencies</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-slate-600">
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Ensure deliverables before payment release</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Simplify payment operations across multiple creators</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Maintain clear audit trails for compliance</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 text-white">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <Users size={22} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For creators</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm">Eliminate risk of non-payment after work completion</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm">Get paid instantly upon milestone verification</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm">Access to professional dispute resolution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Metrics / Stats --- */}
      <section className="py-16 border-y border-slate-100 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '$250M+', label: 'Transaction volume' },
              { value: '99.9%', label: 'Dispute resolution rate' },
              { value: '< 2min', label: 'Average settlement time' },
              { value: '50+', label: 'Countries served' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Enterprise CTA --- */}
      <section id="enterprise" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-12 md:p-16 text-white">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Enterprise-grade escrow at scale
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                API access, custom workflows, and dedicated support for high-volume partners.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/enterprise" className="px-6 py-3 bg-white text-slate-900 font-medium rounded-xl hover:bg-slate-100 transition-all">
                  Explore enterprise
                </Link>
                <Link href="/contact" className="px-6 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-all">
                  Contact sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Final CTA --- */}
      <section className="py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Ready to secure your partnerships?</h2>
          <p className="text-slate-500 text-lg mb-8">
            Join thousands of professionals using KLIP to transact with confidence.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/register" className="px-8 py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all shadow-sm">
              Start a free project
            </Link>
            <Link href="/demo" className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:border-slate-300 transition-all">
              Watch demo
            </Link>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="pt-20 pb-10 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-16">
            <div className="md:col-span-2">
              <KlipLogo />
              <p className="mt-4 text-sm text-slate-500 max-w-xs leading-relaxed">
                Secure escrow infrastructure for the global creator economy.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-sm mb-5 text-slate-400">Platform</h5>
              <ul className="space-y-3 text-sm">
                <li><Link href="/how-it-works" className="text-slate-500 hover:text-slate-900 transition-colors">How it works</Link></li>
                <li><Link href="/pricing" className="text-slate-500 hover:text-slate-900 transition-colors">Pricing</Link></li>
                <li><Link href="/security" className="text-slate-500 hover:text-slate-900 transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-sm mb-5 text-slate-400">Resources</h5>
              <ul className="space-y-3 text-sm">
                <li><Link href="/help" className="text-slate-500 hover:text-slate-900 transition-colors">Help center</Link></li>
                <li><Link href="/blog" className="text-slate-500 hover:text-slate-900 transition-colors">Blog</Link></li>
                <li><Link href="/developers" className="text-slate-500 hover:text-slate-900 transition-colors">Developers</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-sm mb-5 text-slate-400">Company</h5>
              <ul className="space-y-3 text-sm">
                <li><Link href="/about" className="text-slate-500 hover:text-slate-900 transition-colors">About</Link></li>
                <li><Link href="/careers" className="text-slate-500 hover:text-slate-900 transition-colors">Careers</Link></li>
                <li><Link href="/legal" className="text-slate-500 hover:text-slate-900 transition-colors">Legal</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100 gap-4">
            <p className="text-xs text-slate-400">© 2025 KLIP Technologies Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Terms</Link>
              <Link href="/compliance" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Compliance</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}