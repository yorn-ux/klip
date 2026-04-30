'use client';

import { 
  ArrowRight, Lock, FileCheck, 
  Scale, Shield, CheckCircle, 
  Zap, 
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
      <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center transition-transform group-hover:rotate-12">
        <span className="text-white font-black text-lg">K</span>
      </div>
      <span className="text-xl font-bold tracking-tighter text-slate-900">KLIP</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white font-sans antialiased">
      
      {/* --- Navigation --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/"><KlipLogo /></Link>
          
           <div className="hidden md:flex items-center gap-10">
             {['Protocol', 'Security', 'Enterprise'].map((item) => (
               <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                 {item}
               </a>
             ))}
           </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign in</Link>
            <Link href="/register" className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-44 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-xs font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Infrastructure for Secured Partnerships
            </div>
            
            <h1 className="text-6xl md:text-8xl font-medium tracking-tight text-slate-900 mb-8 leading-[0.95]">
              Securing the world’s <span className="text-slate-400">creators.</span>
            </h1>
            
            <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
              The institutional-grade escrow protocol designed to eliminate counterparty risk for brands, agencies, and elite creators.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="px-8 py-4 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-all flex items-center gap-2">
                Start a Secure Project <ArrowRight size={18} />
              </Link>
              <Link href="/demo" className="px-8 py-4 bg-white border border-slate-200 text-slate-900 font-medium rounded-full hover:border-slate-400 transition-all">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- Trust Bar --- */}
      <section className="py-10 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-8 grayscale opacity-60">
          <span className="font-bold text-xl tracking-tighter">NIKE</span>
          <span className="font-bold text-xl tracking-tighter">VOGUE</span>
          <span className="font-bold text-xl tracking-tighter">ADIDAS</span>
          <span className="font-bold text-xl tracking-tighter">CARTIER</span>
          <span className="font-bold text-xl tracking-tighter">DIOR</span>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section id="security" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-16">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl">
                <Shield size={24} className="text-slate-900" />
              </div>
              <h3 className="text-xl font-bold">Tier-1 Protection</h3>
              <p className="text-slate-500 leading-relaxed">Funds are held in segregated, multi-signature vaults, isolated from operational capital.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl">
                <Zap size={24} className="text-slate-900" />
              </div>
              <h3 className="text-xl font-bold">Instant Settlement</h3>
              <p className="text-slate-500 leading-relaxed">Once verification criteria are met, capital is disbursed immediately via our deterministic protocol.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl">
                <Scale size={24} className="text-slate-900" />
              </div>
              <h3 className="text-xl font-bold">Neutral Arbitration</h3>
              <p className="text-slate-500 leading-relaxed">Expert dispute resolution layer for high-stakes partnerships and complex brand mandates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Protocol Visualization --- */}
      <section id="protocol" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-[48px] p-12 md:p-24 border border-slate-200">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold tracking-tight mb-6">The KLIP Protocol</h2>
              <p className="text-slate-500 text-lg mb-12">We’ve replaced "trust" with cryptographic verification. Here is how your money moves.</p>
              
              <div className="space-y-12">
                {[
                  { title: 'Lock', desc: 'Agreement is signed and funds are committed to the secure vault.', icon: Lock },
                  { title: 'Verify', desc: 'Proof of work is submitted and validated via our secure gateway.', icon: FileCheck },
                  { title: 'Release', desc: 'Capital is instantly routed to the creator with an immutable audit trail.', icon: CheckCircle },
                ].map((step, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        0{i + 1}
                      </div>
                      {i !== 2 && <div className="w-px h-full bg-slate-200 my-2" />}
                    </div>
                    <div className="pb-8">
                      <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                      <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-32 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-5xl font-bold tracking-tight mb-8">Modernize your <br/>partnership workflow.</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="px-10 py-5 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              Get Started for Free
            </Link>
            <Link href="/demo" className="px-10 py-5 bg-white border border-slate-200 text-slate-900 font-semibold rounded-full hover:bg-slate-50 transition-all">
              Contact Sales
            </Link>
          </div>
          <p className="mt-8 text-sm text-slate-400">Join 10,000+ creators and brands worldwide.</p>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="pt-24 pb-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
              <KlipLogo />
              <p className="mt-6 text-slate-500 max-w-xs leading-relaxed">
                Building the trust infrastructure for the global creator economy. 
                Secured. Transparent. Professional.
              </p>
            </div>
             <div>
               <h5 className="font-bold text-sm mb-6 uppercase tracking-widest text-slate-400">Product</h5>
               <ul className="space-y-4 text-sm text-slate-600">
                 <li className="hover:text-slate-900 cursor-pointer">
                   <Link href="/security-protocol" className="hover:text-slate-900 transition-colors">
                     Security Protocol
                   </Link>
                 </li>
                 <li className="hover:text-slate-900 cursor-pointer">
                   <Link href="/enterprise-api" className="hover:text-slate-900 transition-colors">
                     Enterprise API
                   </Link>
                 </li>
                 <li className="hover:text-slate-900 cursor-pointer">
                   <Link href="/arbitration" className="hover:text-slate-900 transition-colors">
                     Arbitration Enclave
                   </Link>
                 </li>
               </ul>
             </div>
             <div>
               <h5 className="font-bold text-sm mb-6 uppercase tracking-widest text-slate-400">Legal</h5>
               <ul className="space-y-4 text-sm text-slate-600">
                 <li className="hover:text-slate-900 cursor-pointer">
                   <Link href="/terms" className="hover:text-slate-900 transition-colors">
                     Terms of Service
                   </Link>
                 </li>
                 <li className="hover:text-slate-900 cursor-pointer">
                   <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                     Privacy Policy
                   </Link>
                 </li>
                 <li className="hover:text-slate-900 cursor-pointer">
                   <Link href="/compliance" className="hover:text-slate-900 transition-colors">
                     Compliance
                   </Link>
                 </li>
               </ul>
             </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-slate-100 gap-6">
            <p className="text-sm text-slate-400">© 2026 KLIP Technologies Inc. All rights reserved.</p>
             <div className="flex gap-6">
               <a href="https://twitter.com/klip" target="_blank" rel="noopener noreferrer" className="w-5 h-5 bg-slate-200 rounded-full hover:bg-slate-900 cursor-pointer transition-colors" />
               <a href="https://linkedin.com/company/klip" target="_blank" rel="noopener noreferrer" className="w-5 h-5 bg-slate-200 rounded-full hover:bg-slate-900 cursor-pointer transition-colors" />
               <a href="https://github.com/klip" target="_blank" rel="noopener noreferrer" className="w-5 h-5 bg-slate-200 rounded-full hover:bg-slate-900 cursor-pointer transition-colors" />
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}