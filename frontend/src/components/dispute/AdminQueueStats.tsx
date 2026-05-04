'use client';

import { Clock, Scale, CheckCircle2, AlertTriangle, Gavel,} from 'lucide-react';
import { AdminQueue } from './types';

interface AdminQueueStatsProps {
  queue: AdminQueue;
}

export default function AdminQueueStats({ queue }: AdminQueueStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <StatCard 
        label="Pending Review" 
        value={queue.pending} 
        icon={Clock} 
        color="text-amber-600" 
        bgColor="bg-amber-50"
        borderColor="border-amber-200"
        subtitle="Awaiting assignment"
      />
      <StatCard 
        label="In Progress" 
        value={queue.in_review} 
        icon={Scale} 
        color="text-blue-600" 
        bgColor="bg-blue-50"
        borderColor="border-blue-200"
        subtitle="Under arbitration"
      />
      <StatCard 
        label="Urgent Cases" 
        value={queue.urgent_cases} 
        icon={AlertTriangle} 
        color="text-rose-600" 
        bgColor="bg-rose-50"
        borderColor="border-rose-200"
        subtitle="High priority"
      />
      <StatCard 
        label="Resolved Today" 
        value={queue.resolved_today} 
        icon={CheckCircle2} 
        color="text-emerald-600" 
        bgColor="bg-emerald-50"
        borderColor="border-emerald-200"
        subtitle="Completed today"
      />
      <StatCard 
        label="Avg. Resolution" 
        value={queue.avg_resolution_time} 
        icon={Gavel} 
        color="text-purple-600" 
        bgColor="bg-purple-50"
        borderColor="border-purple-200"
        subtitle="Average time"
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bgColor, borderColor, subtitle }: any) {
  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`p-1.5 ${bgColor} rounded-lg border ${borderColor}`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {subtitle && <p className="text-[9px] text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}