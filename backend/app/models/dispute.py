from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Index, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import datetime
import uuid
import enum

# --- ENUMS for better type safety ---

class DisputeStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    ESCALATED = "ESCALATED"

class DisputeVerdict(str, enum.Enum):
    INITIATOR = "influencer"      # Release to initiator
    COUNTERPARTY = "business"     # Refund to counterparty
    SPLIT = "split"               # 50/50 split
    DISMISSED = "dismissed"       # Case dismissed
    PARTIAL = "partial"           # Partial release to initiator

class TicketStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TicketCategory(str, enum.Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    DISPUTE = "dispute"
    GENERAL = "general"
    ACCOUNT = "account"
    ESCALATION = "escalation"


class Dispute(Base):
    __tablename__ = "disputes"
    __table_args__ = (
        Index('ix_disputes_status', 'status'),
        Index('ix_disputes_participants', 'initiator_id', 'counterparty_id'),
        Index('ix_disputes_created', 'created_at'),
        Index('ix_disputes_risk', 'risk_score'),
        Index('ix_disputes_vault', 'vault_id'),
        Index('ix_disputes_assigned_admin', 'assigned_admin', 'status'),
        Index('ix_disputes_resolved_at', 'resolved_at'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"DIS-{uuid.uuid4().hex[:8].upper()}")
    
    # Foreign Keys to users
    initiator_id = Column(String, ForeignKey("users.operator_id", ondelete="CASCADE"), nullable=False, index=True)
    counterparty_id = Column(String, ForeignKey("users.operator_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Admin assignment
    assigned_admin = Column(String, ForeignKey("users.operator_id"), nullable=True, index=True)
    
    # Vault reference
    vault_id = Column(String, ForeignKey("vaults.id", ondelete="SET NULL"), nullable=True, index=True)
    vault_title = Column(String, nullable=False)
    
    # Financial details
    amount = Column(Float, default=0.0)
    currency = Column(String, default="KES")
    
    # Dispute details
    reason = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(DisputeStatus), default=DisputeStatus.OPEN)
    risk_score = Column(Integer, default=0)
    
    # Case data
    timeline = Column(JSON, default=[]) 
    evidence = Column(JSON, default=[])
    
    # Verdict
    verdict = Column(SQLEnum(DisputeVerdict), nullable=True)
    verdict_details = Column(Text, nullable=True)
    release_amount = Column(Float, nullable=True)      # Amount released to initiator (for partial verdicts)
    refund_amount = Column(Float, nullable=True)      # Amount refunded to counterparty
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    
    # Computed fields (not stored in DB, calculated on query)
    @property
    def days_open(self) -> int:
        """Calculate number of days dispute has been open"""
        if self.resolved_at:
            return (self.resolved_at - self.created_at).days
        return (datetime.datetime.now(datetime.timezone.utc) - self.created_at).days
    
    @property
    def is_urgent(self) -> bool:
        """Check if dispute is urgent (open > 7 days)"""
        return self.days_open > 7 and self.status != DisputeStatus.RESOLVED

    # --- 🖇️ RELATIONSHIPS ---
    initiator = relationship(
        "User", 
        foreign_keys=[initiator_id],
        back_populates="disputes_initiated"
    )
    
    counterparty = relationship(
        "User", 
        foreign_keys=[counterparty_id],
        back_populates="disputes_involved"
    )
    
    admin = relationship(
        "User", 
        foreign_keys=[assigned_admin],
        back_populates="assigned_disputes"
    )
    
    vault = relationship("Vault", foreign_keys=[vault_id])
    
    def __repr__(self):
        return f"<Dispute {self.id} | {self.status.value} | {self.amount} {self.currency}>"
    
    def to_dict(self) -> dict:
        """Convert dispute to dictionary for API responses"""
        return {
            "id": self.id,
            "vault_title": self.vault_title,
            "amount": self.amount,
            "currency": self.currency,
            "initiator": self.initiator.full_name if self.initiator else None,
            "initiator_id": self.initiator_id,
            "counterparty": self.counterparty.full_name if self.counterparty else None,
            "counterparty_id": self.counterparty_id,
            "reason": self.reason,
            "description": self.description,
            "status": self.status.value,
            "risk_score": self.risk_score,
            "evidence": self.evidence,
            "timeline": self.timeline,
            "assigned_admin": self.assigned_admin,
            "verdict": self.verdict.value if self.verdict else None,
            "verdict_details": self.verdict_details,
            "release_amount": self.release_amount,
            "refund_amount": self.refund_amount,
            "days_open": self.days_open,
            "is_urgent": self.is_urgent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index('ix_tickets_status', 'status'),
        Index('ix_tickets_operator', 'operator_id', 'status'),
        Index('ix_tickets_created', 'created_at'),
        Index('ix_tickets_priority', 'priority'),
        Index('ix_tickets_assigned_agent', 'assigned_agent', 'status'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"SR-{uuid.uuid4().hex[:5].upper()}")
    
    # User reference
    operator_id = Column(String, ForeignKey("users.operator_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Admin assignment
    assigned_agent = Column(String, ForeignKey("users.operator_id"), nullable=True, index=True)
    
    # Ticket details
    category = Column(SQLEnum(TicketCategory), nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.PENDING)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM)
    
    # Attachments
    attachments = Column(JSON, default=[])
    
    # Conversation thread (admin responses)
    responses = Column(JSON, default=[])
    
    # Resolution
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    # --- 🖇️ RELATIONSHIPS ---
    user = relationship(
        "User", 
        foreign_keys=[operator_id],
        back_populates="support_tickets"
    )
    
    agent = relationship(
        "User", 
        foreign_keys=[assigned_agent],
        back_populates="assigned_tickets"
    )
    
    def __repr__(self):
        return f"<SupportTicket {self.id} | {self.status.value} | {self.category.value}>"
    
    def to_dict(self) -> dict:
        """Convert ticket to dictionary for API responses"""
        return {
            "id": self.id,
            "category": self.category.value,
            "subject": self.subject,
            "message": self.message,
            "status": self.status.value,
            "priority": self.priority.value,
            "attachments": self.attachments,
            "responses": self.responses,
            "resolution_notes": self.resolution_notes,
            "assigned_agent": self.assigned_agent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


# --- Additional Model: Dispute Comment (for better organization) ---

class DisputeComment(Base):
    __tablename__ = "dispute_comments"
    __table_args__ = (
        Index('ix_comments_dispute', 'dispute_id'),
        Index('ix_comments_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"CMT-{uuid.uuid4().hex[:6].upper()}")
    dispute_id = Column(String, ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.operator_id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    # Relationship
    dispute = relationship("Dispute", foreign_keys=[dispute_id])
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<DisputeComment {self.id} by {self.user_name}>"