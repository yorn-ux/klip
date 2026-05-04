
export type Role = 'influencer' | 'business' | 'admin' | 'operator';
export type NavigationTab = 'disputes' | 'support' | 'history';

export interface UserIdentity {
  id?: string;
  operator_id: string;
  role: Role;
  fullName: string;
  email: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
  createdAt: string;
  updatedAt?: string;
  message?: string;
  assignedAgent?: string;
  resolvedAt?: string;
  responses?: Array<{
    admin: string;
    timestamp: string;
    message: string;
  }>;
  attachments?: string[];
  resolutionNotes?: string;
}

export interface EvidenceItem {
  name: string;
  size?: string;
  type?: string;
  url: string;
  uploadedAt?: string;
}

export interface TimelineEvent {
  event: string;
  date: string;
  notes?: string;
  comment?: string;
  files?: number;
  user?: string;
  user_role?: string;
}

export interface DisputeCase {
  id: string;
  vaultTitle: string;
  amount: number;
  initiator: string;
  initiator_id: string;
  counterparty: string;
  counterparty_id: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
  riskScore: number;
  description: string;
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
  assignedAdmin?: string;
  verdict?: string;
  verdictDetails?: string;
  resolvedAt?: string;
  daysOpen?: number;
  createdAt?: string;
}

export interface AdminQueue {
  pending: number;
  in_review: number;
  resolved_today: number;
  avg_resolution_time: string;
  urgent_cases: number;
}