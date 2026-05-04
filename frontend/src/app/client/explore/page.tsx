'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, ShieldCheck, Clock, 
  Zap, RefreshCcw, Filter,
  AlertCircle, Users,
  ChevronRight, Eye
} from 'lucide-react';
import CampaignModal from '@/components/vaults/CampaignModal'; 
import { useNotificationStore } from '@/store/useNotificationStore';

interface Campaign {
  id: string;
  company_name: string;
  title: string;
  budget: number;
  currency: string;
  payout_method: 'M-Pesa' | 'Web3';
  deadline: string;
  category: string;
  is_verified: boolean;
  slots_available?: number;
  applications_count?: number;
}

export default function CampaignBoard() {
  const { showToast } = useNotificationStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedGig, setSelectedGig] = useState<Campaign | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      // Use the CORRECT endpoint from your backend
      const response = await fetch(`${API_URL}/api/v1/vaults/campaigns`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Real campaigns from backend:', data);
      
      // Transform API response to match Campaign interface
      const transformedCampaigns = transformCampaignData(data);
      setCampaigns(transformedCampaigns);
      
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
      showToast(err.message || "Failed to load campaigns", "error");
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const filteredGigs = useMemo(() => {
    return campaigns.filter(gig => {
      const matchesSearch = gig.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            gig.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'All' || gig.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, campaigns]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Campaign Marketplace</h1>
            <p className="text-sm text-gray-500 mt-1">Browse escrow-secured opportunities with guaranteed payouts</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..." 
                className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {['All', 'UGC', 'Reels', 'Video', 'Social Media', 'Design', 'Articles', 'Stories'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500">Active Campaigns</p>
                <p className="text-lg font-semibold text-gray-900">{filteredGigs.length}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500">Avg. Budget</p>
                <p className="text-lg font-semibold text-gray-900">
                  KES {campaigns.length > 0 ? Math.round(campaigns.reduce((acc, c) => acc + (c.budget || 0), 0) / campaigns.length).toLocaleString() : '0'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                <ShieldCheck size={12} /> All Escrow Protected
              </span>
            </div>
          </div>
        </div>

        {/* Grid Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 bg-white border border-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {filteredGigs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGigs.map((gig) => (
                  <CampaignCard 
                    key={gig.id} 
                    gig={gig} 
                    onClick={() => {
                      setSelectedGig(gig);
                      setIsModalOpen(true);
                    }} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-100 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">No campaigns found</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">No active campaigns available at the moment</p>
                <button 
                  onClick={() => {setSearchQuery(''); setActiveTab('All');}} 
                  className="inline-flex items-center gap-2 text-rose-600 text-sm font-medium hover:text-rose-700"
                >
                  <RefreshCcw size={14} /> Reset filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        campaign={selectedGig} 
      />
    </div>
  );
}

function CampaignCard({ gig, onClick }: { gig: Campaign; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-lg p-5 hover:border-rose-200 hover:shadow-md transition-all group cursor-pointer flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 font-semibold text-base">
            {gig.company_name?.[0] || 'B'}
          </div>
          <div>
            <p className="text-xs text-gray-500">{gig.company_name || 'Brand Partner'}</p>
            <h3 className="text-sm font-medium text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-1">
              {gig.title}
            </h3>
          </div>
        </div>
        {gig.is_verified && (
          <ShieldCheck size={16} className="text-emerald-500" />
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
          {gig.category || 'Campaign'}
        </span>
        {gig.deadline && (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs flex items-center gap-1">
            <Clock size={10} /> {gig.deadline}
          </span>
        )}
        {gig.payout_method === 'M-Pesa' ? (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
            M-PESA
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
            Web3
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4 line-clamp-2">
        Collaborate with {gig.company_name} on this {gig.category} campaign. 
        Deliver engaging content and get paid securely.
      </p>

      <div className="flex items-center gap-4 mb-4">
        {gig.slots_available && gig.slots_available > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={12} />
            <span>{gig.slots_available} slots</span>
          </div>
        )}
        {gig.applications_count && gig.applications_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Eye size={12} />
            <span>{gig.applications_count} applied</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Budget</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-900">
              {gig.budget?.toLocaleString() || '0'}
            </span>
            <span className="text-xs text-gray-400">{gig.currency || 'KES'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-emerald-600 text-xs">
          <Zap size={12} className="fill-emerald-600" />
          <span>Escrow</span>
          <ChevronRight size={12} className="text-gray-300 group-hover:text-rose-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

// Transform your backend Campaign model to frontend Campaign interface
function transformCampaignData(campaigns: any[]): Campaign[] {
  if (!Array.isArray(campaigns)) return [];
  
  return campaigns.map((campaign: any) => ({
    id: campaign.id,
    company_name: campaign.company_name || 'Brand Partner',
    title: campaign.title,
    budget: Number(campaign.budget) || 0,
    currency: campaign.currency || 'KES',
    payout_method: campaign.payout_method === 'crypto' ? 'Web3' : 'M-Pesa',
    deadline: campaign.deadline || 'Open',
    category: campaign.category || 'Social Media',
    is_verified: campaign.is_verified === true,
    slots_available: campaign.slots_available || campaign.creator_count || 0,
    applications_count: campaign.applications_count || 0,
  }));
}