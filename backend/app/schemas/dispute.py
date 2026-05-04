from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone
import uuid
from decimal import Decimal

# --- ENUMS ---
Role = Literal['influencer', 'business', 'admin', 'operator']
DisputeStatus = Literal['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'ESCALATED']
DisputeVerdict = Literal['influencer', 'business', 'split', 'dismissed', 'partial']
TicketStatus = Literal['PENDING', 'ACTIVE', 'RESOLVED', 'CLOSED']
TicketPriority = Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
TicketCategory = Literal['technical', 'billing', 'dispute', 'general', 'account', 'escalation']

# --- SUB-MODELS ---
class EvidenceSchema(BaseModel):
    """Evidence file schema"""
    name: str 
    size: str 
    type: str 
    url: str 
    uploaded_at: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class TimelineEvent(BaseModel):
    """Timeline event schema"""
    event: str
    date: str 
    notes: Optional[str] = None
    comment: Optional[str] = None
    files: Optional[int] = None
    user: Optional[str] = None
    user_role: Optional[str] = None
    admin_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ResponseMessage(BaseModel):
    """Admin response to support ticket"""
    admin: str
    admin_id: Optional[str] = None
    message: str
    timestamp: str
    
    model_config = ConfigDict(from_attributes=True)

class CommentCreate(BaseModel):
    """Schema for adding a comment to a dispute"""
    text: str = Field(..., min_length=1, max_length=2000)
    
    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Comment cannot be empty')
        return v.strip()

# --- DISPUTE MODELS ---

class DisputeBase(BaseModel):
    """Base dispute schema"""
    vault_title: str = Field(..., alias="vaultTitle", min_length=1, max_length=200)
    amount: float = Field(..., gt=0, description="Amount in dispute")
    currency: str = Field(default="KES", pattern="^(KES|USDT)$")
    initiator: str = Field(..., min_length=1)
    counterparty: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=10, max_length=5000)
    risk_score: int = Field(default=0, alias="riskScore", ge=0, le=100)
    
    model_config = ConfigDict(populate_by_name=True)

class DisputeCreate(DisputeBase):
    """Schema for creating a new dispute"""
    counterparty_id: str = Field(..., alias="counterpartyId")
    vault_id: Optional[str] = Field(None, alias="vaultId")

class DisputeUpdate(BaseModel):
    """Schema for updating a dispute"""
    status: Optional[DisputeStatus] = None
    assigned_admin: Optional[str] = Field(None, alias="assignedAdmin")
    
    model_config = ConfigDict(populate_by_name=True)

class VerdictSubmit(BaseModel):
    """Schema for submitting a verdict"""
    verdict: DisputeVerdict
    notes: Optional[str] = Field(None, max_length=2000)
    release_amount: Optional[float] = Field(None, gt=0, description="Partial release amount")
    
    @field_validator('release_amount')
    @classmethod
    def validate_release_amount(cls, v: Optional[float], info) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError('Release amount must be greater than 0')
        return v

class DisputeResponse(DisputeBase):
    """Complete dispute response schema"""
    id: str
    initiator_id: str
    counterparty_id: str
    assigned_admin: Optional[str] = Field(None, alias="assignedAdmin")
    vault_id: Optional[str] = Field(None, alias="vaultId")
    status: DisputeStatus = "OPEN"
    evidence: List[EvidenceSchema] = []
    timeline: List[TimelineEvent] = []
    verdict: Optional[DisputeVerdict] = None
    verdict_details: Optional[str] = Field(None, alias="verdictDetails")
    release_amount: Optional[float] = Field(None, alias="releaseAmount")
    refund_amount: Optional[float] = Field(None, alias="refundAmount")
    days_open: int = Field(0, alias="daysOpen")
    is_urgent: bool = Field(False, alias="isUrgent")
    created_at: datetime = Field(..., alias="createdAt")
    resolved_at: Optional[datetime] = Field(None, alias="resolvedAt")
    
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

class DisputeSummary(BaseModel):
    """Dispute statistics for dashboard"""
    total: int
    open: int
    under_review: int = Field(..., alias="underReview")
    resolved: int
    win_rate: float = Field(..., alias="winRate")
    total_amount: float = Field(..., alias="totalAmount")
    
    model_config = ConfigDict(populate_by_name=True)

# --- SUPPORT TICKET MODELS ---

class SupportTicketBase(BaseModel):
    """Base support ticket schema"""
    subject: str = Field(..., min_length=1, max_length=200)
    category: TicketCategory
    message: str = Field(..., min_length=10, max_length=5000)

class SupportTicketCreate(SupportTicketBase):
    """Schema for creating a support ticket"""
    priority: TicketPriority = Field(default="MEDIUM")
    attachments: Optional[List[str]] = None

class SupportTicketUpdate(BaseModel):
    """Schema for updating a support ticket (admin only)"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    response: Optional[str] = Field(None, max_length=5000)
    assigned_agent: Optional[str] = Field(None, alias="assignedAgent")
    
    model_config = ConfigDict(populate_by_name=True)

class SupportTicketResponse(SupportTicketBase):
    """Complete support ticket response schema"""
    id: str
    operator_id: str = Field(..., alias="operatorId")
    status: TicketStatus = "PENDING"
    priority: TicketPriority = "MEDIUM"
    attachments: List[str] = []
    responses: List[ResponseMessage] = []
    assigned_agent: Optional[str] = Field(None, alias="assignedAgent")
    resolution_notes: Optional[str] = Field(None, alias="resolutionNotes")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    resolved_at: Optional[datetime] = Field(None, alias="resolvedAt")
    
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

class SupportTicketSummary(BaseModel):
    """Support ticket statistics"""
    total: int
    pending: int
    active: int
    resolved: int
    avg_response_time: str = Field(..., alias="avgResponseTime")
    
    model_config = ConfigDict(populate_by_name=True)

# --- ADMIN QUEUE MODELS ---

class AdminQueueStats(BaseModel):
    """Admin queue statistics"""
    pending: int
    in_review: int = Field(..., alias="inReview")
    urgent_cases: int = Field(..., alias="urgentCases")
    resolved_today: int = Field(..., alias="resolvedToday")
    avg_resolution_time: str = Field(..., alias="avgResolutionTime")
    
    model_config = ConfigDict(populate_by_name=True)

class AssignedCase(BaseModel):
    """Case assigned to admin"""
    id: str
    vault_title: str = Field(..., alias="vaultTitle")
    amount: float
    status: DisputeStatus
    days_open: int = Field(..., alias="daysOpen")
    risk_score: int = Field(..., alias="riskScore")
    created_at: datetime = Field(..., alias="createdAt")
    
    model_config = ConfigDict(populate_by_name=True)

# --- FILTERS & PAGINATION ---

class DisputeFilters(BaseModel):
    """Filters for disputes list"""
    status: Optional[DisputeStatus] = None
    role: Optional[Role] = None
    search: Optional[str] = Field(None, max_length=100)
    sort_by: Literal['newest', 'oldest', 'amount_high', 'amount_low', 'risk'] = Field(default='newest', alias="sortBy")
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    
    model_config = ConfigDict(populate_by_name=True)

class TicketFilters(BaseModel):
    """Filters for support tickets"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    search: Optional[str] = Field(None, max_length=100)
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    
    model_config = ConfigDict(populate_by_name=True)

class PaginatedResponse(BaseModel):
    """Generic paginated response"""
    items: List[Any]
    total: int
    limit: int
    offset: int
    has_more: bool = Field(..., alias="hasMore")
    
    model_config = ConfigDict(populate_by_name=True)

# --- HEALTH & STATS MODELS ---

class DisputeHealthResponse(BaseModel):
    """Health check response for dispute protocol"""
    status: str
    service: str
    version: str
    timestamp: str
    
    model_config = ConfigDict(from_attributes=True)

class DisputeStatsResponse(BaseModel):
    """General dispute statistics"""
    total_disputes: int = Field(..., alias="totalDisputes")
    resolved: int
    pending: int
    total_amount_locked: float = Field(..., alias="totalAmountLocked")
    success_rate: float = Field(..., alias="successRate")
    
    model_config = ConfigDict(populate_by_name=True)

# --- ERROR RESPONSES ---

class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    detail: str
    status_code: int = Field(..., alias="statusCode")
    
    model_config = ConfigDict(populate_by_name=True)

# --- EXPORTS ---
__all__ = [
    # Enums
    "Role",
    "DisputeStatus", 
    "DisputeVerdict",
    "TicketStatus",
    "TicketPriority",
    "TicketCategory",
    
    # Sub-models
    "EvidenceSchema",
    "TimelineEvent",
    "ResponseMessage",
    "CommentCreate",
    
    # Dispute models
    "DisputeBase",
    "DisputeCreate",
    "DisputeUpdate",
    "VerdictSubmit",
    "DisputeResponse",
    "DisputeSummary",
    
    # Support ticket models
    "SupportTicketBase",
    "SupportTicketCreate",
    "SupportTicketUpdate",
    "SupportTicketResponse",
    "SupportTicketSummary",
    
    # Admin models
    "AdminQueueStats",
    "AssignedCase",
    
    # Filters & pagination
    "DisputeFilters",
    "TicketFilters",
    "PaginatedResponse",
    
    # Health & stats
    "DisputeHealthResponse",
    "DisputeStatsResponse",
    
    # Error
    "ErrorResponse"
]