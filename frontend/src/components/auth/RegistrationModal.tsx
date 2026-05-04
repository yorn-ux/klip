'use client';

import React, { useState } from 'react';
import { X, Loader2, Mail, User, Briefcase, Lock, Shield, AlertCircle } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (formData: any) => Promise<any>;
  onSuccess?: () => void;
  isDark?: boolean;
}

function RegistrationModal({ isOpen, onClose, onRegister, onSuccess, isDark = false }: RegistrationModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('influencer');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Call the onRegister prop with the form data
      await onRegister({
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        role: role.toLowerCase(),
        password: password
      });
      
      // Reset form on success
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('influencer');
      
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      console.error('Registration failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const roleOptions = [
    { value: 'influencer', label: 'Influencer/Creator', icon: User, color: 'emerald' },
    { value: 'business', label: 'Business', icon: Briefcase, color: 'amber' },
    { value: 'admin', label: 'Administrator', icon: Shield, color: 'purple' },
  ];

  const selectedRole = roleOptions.find(r => r.value === role);

  const getButtonColor = () => {
    if (role === 'admin') return 'bg-purple-600 hover:bg-purple-700';
    if (role === 'business') return 'bg-amber-600 hover:bg-amber-700';
    return 'bg-emerald-600 hover:bg-emerald-700';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-2xl max-w-md w-full shadow-2xl ${isDark ? 'dark' : ''}`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Register New User</h2>
            <p className="text-xs text-slate-400 mt-1">Create a new platform account</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = role === option.value;
                const getColorClass = () => {
                  if (!isSelected) return 'border-slate-200 hover:bg-slate-50';
                  if (option.value === 'admin') return 'border-purple-500 bg-purple-50 text-purple-700';
                  if (option.value === 'business') return 'border-amber-500 bg-amber-50 text-amber-700';
                  return 'border-emerald-500 bg-emerald-50 text-emerald-700';
                };
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${getColorClass()}`}
                  >
                    <Icon size={18} />
                    <span className="text-[10px] font-bold">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {selectedRole?.label === 'Administrator' 
                ? 'Admins have full platform access and can manage users, disputes, and system settings.' 
                : selectedRole?.label === 'Business' 
                ? 'Businesses can create campaigns, manage team members, and access analytics.'
                : 'Influencers can join campaigns, earn rewards, and showcase their work.'}
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Must be at least 8 characters</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${getButtonColor()} text-white disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <User size={18} />}
            {loading ? 'Registering...' : `Register ${selectedRole?.label}`}
          </button>

          <p className="text-[10px] text-center text-slate-400">
            User will receive an email with verification instructions
          </p>
        </form>
      </div>
    </div>
  );
}

export default RegistrationModal;