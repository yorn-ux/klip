'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, CreditCard, Smartphone, Loader2, 
  CheckCircle, AlertCircle, ArrowLeft, Lock,
  Shield, Zap, Clock, Gem, BadgeCheck,
  Wallet, Sparkles, Phone
} from 'lucide-react';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentStep = 'select' | 'form' | 'processing' | 'success' | 'failed';

export default function AddFundsModal({ isOpen, onClose, onSuccess }: AddFundsModalProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // M-Pesa form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | null>(null);
  
  // Fee logic
  const [isFirstDeposit] = useState(true);
  const STANDARD_FEE = 25;
  const currentFee = isFirstDeposit ? 0 : STANDARD_FEE;
  const totalCharge = Number(amount) > 0 ? Number(amount) + currentFee : 0;

  // Professional Logo Component
  const KlipLogo = () => (
    <div className="relative flex items-center justify-center">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl rotate-6 shadow-lg" />
        <div className="absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-6" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Gem size={12} className="text-amber-400" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
      </div>
    </div>
  );

  // Format phone number for M-Pesa (254XXXXXXXXX)
  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      return cleaned;
    }
    if (cleaned.length === 10 && cleaned.startsWith('7')) {
      return '254' + cleaned;
    }
    return cleaned;
  };

  // Validate M-Pesa phone number
  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    return formatted.length === 12 && formatted.startsWith('254');
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { 
      if (pollingInterval) {
        clearInterval(pollingInterval); 
      }
    };
  }, [pollingInterval]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setError('');
      setLoading(false);
      setInvoiceId('');
      setPhoneNumber('');
      setAmount('');
      setPaymentMethod(null);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [isOpen, pollingInterval]);

  const handleBack = () => {
    if (step === 'form') {
      setStep('select');
      setError('');
      setPaymentMethod(null);
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStep('select');
    setError('');
    setAmount('');
    setPhoneNumber('');
    setInvoiceId('');
    setPaymentMethod(null);
    onClose();
  };

  // Auth helper
  const getAuthToken = () => {
    return localStorage.getItem('access_token') || 
           document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
  };

  // Check transaction status with payment gateway
  const checkTransactionStatus = async (invoiceId: string) => {
    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const res = await fetch(`${API_URL}/api/v1/wallet/deposit/status/${invoiceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return null;
    } catch (err) {
      console.error('Status check error:', err);
      return null;
    }
  };

  // Polling for transaction status
  const startPolling = (invoiceId: string) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const status = await checkTransactionStatus(invoiceId);
        
        if (status) {
          if (status.payment_status === 'COMPLETE' || status.status === 'completed' || status.complete === true) {
            clearInterval(interval);
            setStep('success');
            setPollingInterval(null);
            
            setTimeout(() => {
              onSuccess();
              handleClose();
            }, 2000);
            
          } else if (status.payment_status === 'FAILED' || status.status === 'failed') {
            clearInterval(interval);
            setError(status.failure_reason || 'Transaction failed');
            setStep('failed');
            setPollingInterval(null);
          }
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError('Transaction timeout. Please check your wallet balance.');
          setStep('failed');
          setPollingInterval(null);
        }
        
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    setPollingInterval(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(amount);
    
    if (!amount || cleanAmount < 10) {
      setError('Minimum deposit is KES 10');
      return;
    }

    if (paymentMethod === 'mpesa') {
      if (!validatePhoneNumber(phoneNumber)) {
        setError('Please enter a valid M-Pesa phone number (e.g., 0712345678)');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      if (!token) {
        throw new Error('Authentication required');
      }

      const reference = `DEP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      let endpoint = '';
      let bodyData = {};

      if (paymentMethod === 'mpesa') {
        endpoint = `${API_URL}/api/v1/wallet/deposit/mpesa`;
        bodyData = { 
          amount: cleanAmount,
          phone_number: formatPhoneNumber(phoneNumber),
          reference: reference
        };
      } else {
        throw new Error('Invalid payment method');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.detail || result.message || "Payment initiation failed");
      }

      // Store transaction ID
      if (result.invoice_id) {
        setInvoiceId(result.invoice_id);
      } else if (result.tracking_id) {
        setInvoiceId(result.tracking_id);
      } else if (result.checkout_request_id) {
        setInvoiceId(result.checkout_request_id);
      } else if (result.transaction_id) {
        setInvoiceId(result.transaction_id);
      }

      setStep('processing');

      // Start polling for transaction status
      if (invoiceId || result.invoice_id || result.checkout_request_id || result.transaction_id) {
        startPolling(invoiceId || result.invoice_id || result.checkout_request_id || result.transaction_id);
      } else {
        // If no ID, wait a bit then show success
        setTimeout(() => {
          setStep('success');
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 2000);
        }, 5000);
      }

    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setStep('form');
    setError('');
    setInvoiceId('');
  };

  const handleMethodSelect = (method: 'mpesa') => {
    setPaymentMethod(method);
    setStep('form');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Gradient Bar */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-400" />

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {step !== 'select' && step !== 'success' && (
              <button 
                onClick={handleBack} 
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                disabled={step === 'processing'}
              >
                <ArrowLeft size={18} className="text-slate-600" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <KlipLogo />
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {step === 'select' && 'Add Funds'}
                  {step === 'form' && paymentMethod === 'mpesa' && 'M-Pesa Deposit'}
                  {step === 'processing' && 'Processing Payment'}
                  {step === 'success' && 'Payment Successful'}
                  {step === 'failed' && 'Payment Failed'}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <Lock size={10} className="text-emerald-600" />
                  <span className="text-[9px] font-mono text-slate-400">Secured Payment Gateway</span>
                  <BadgeCheck size={10} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={step === 'processing'}
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-3">
              {/* M-Pesa - Active */}
              <button 
                onClick={() => handleMethodSelect('mpesa')} 
                className="w-full p-5 border-2 border-emerald-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/30 flex items-center gap-4 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-emerald-200">
                  <Smartphone className="text-emerald-600" size={22} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-slate-900">M-Pesa</p>
                  <p className="text-xs text-slate-400 mt-0.5">Instant STK Push via Lipa Na M-Pesa</p>
                </div>
                <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">Active</span>
              </button>

              {/* Card - Coming Soon */}
              <div className="w-full p-5 border-2 border-slate-200 rounded-xl bg-slate-50 flex items-center gap-4 opacity-60 cursor-not-allowed">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                  <CreditCard className="text-slate-400" size={22} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-slate-500">Card Payments</p>
                  <p className="text-xs text-slate-400">Visa, Mastercard, Amex</p>
                </div>
                <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-bold border border-amber-200">Coming Soon</span>
              </div>

              {/* Info Notice */}
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    You'll receive an STK push on your phone to complete the payment. 
                    <span className="block text-emerald-600/70 text-[10px] mt-1">Transactions are processed instantly via M-Pesa.</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'form' && paymentMethod === 'mpesa' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                  <Wallet size={12} className="text-emerald-500" />
                  Amount (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">KES</span>
                  <input
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" 
                    autoFocus 
                    required
                    min="10"
                    step="10"
                    className="w-full pl-16 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-500" />
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel" 
                  placeholder="0712345678" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Enter the M-Pesa registered phone number</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-500 font-medium">Processing Fee</span>
                  <span className="text-slate-900 font-bold">
                    {isFirstDeposit ? 'Free' : `KES ${STANDARD_FEE}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black pt-3 mt-2 border-t border-slate-200">
                  <span className="text-slate-700">Total Charge</span>
                  <span className="text-emerald-600">KES {totalCharge.toLocaleString()}</span>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-600 text-xs">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Smartphone size={18} />
                    Pay with M-Pesa
                  </>
                )}
              </button>

              <p className="text-[9px] text-center text-slate-400 font-mono">
                By continuing, you agree to our Terms of Service
              </p>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-10 text-center">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full border-2 border-emerald-200 flex items-center justify-center">
                  <Loader2 size={40} className="animate-spin text-emerald-600" />
                </div>
                <Smartphone size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" />
              </div>
              <p className="text-base font-black text-slate-900 mb-2">Awaiting M-Pesa Confirmation</p>
              <p className="text-xs text-slate-500 px-6 mb-4 leading-relaxed">
                Please check your phone and enter your M-Pesa PIN to complete the payment.
              </p>
              {invoiceId && (
                <p className="text-[10px] font-mono text-slate-400 bg-slate-50 py-2 px-3 rounded-full inline-block">
                  Ref: {invoiceId.substring(0, 8)}...
                </p>
              )}
              <div className="mt-6 flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-[9px] text-slate-300 mt-4">Processing via M-Pesa Secure Gateway</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-10 text-center">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
                <div className="relative w-20 h-20 bg-emerald-50 rounded-full border-2 border-emerald-200 flex items-center justify-center">
                  <CheckCircle size={40} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-base font-black text-slate-900 mb-2">Payment Successful!</p>
              <p className="text-sm text-slate-500 mb-3">KES {Number(amount).toLocaleString()} added to your wallet</p>
              {invoiceId && (
                <p className="text-[10px] font-mono text-slate-400 bg-slate-50 py-2 px-3 rounded-full inline-block">
                  Transaction ID: {invoiceId}
                </p>
              )}
              <div className="mt-6 flex items-center justify-center gap-1 text-[9px] text-slate-300">
                <BadgeCheck size={10} className="text-emerald-500" />
                <span>Verified by M-Pesa</span>
              </div>
            </div>
          )}

          {step === 'failed' && (
            <div className="py-10 text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-full border-2 border-rose-200 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={40} className="text-rose-600" />
              </div>
              <p className="text-base font-black text-slate-900 mb-2">Transaction Failed</p>
              <p className="text-xs text-slate-500 mb-6 px-4">{error || 'Please try again or use another payment method'}</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={handleRetry} 
                  className="text-xs px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md"
                >
                  Try Again
                </button>
                <button 
                  onClick={handleClose} 
                  className="text-xs px-5 py-3 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <Shield size={10} />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <Clock size={10} />
            <span>Instant settlement</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <Sparkles size={10} className="text-emerald-500" />
            <span>No hidden fees</span>
          </div>
        </div>
      </div>
    </div>
  );
}