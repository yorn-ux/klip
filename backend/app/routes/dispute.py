import logging
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, select, and_
from datetime import datetime, timezone, timedelta
import uuid
import json

# Core Imports
from app.models.dispute import Dispute, SupportTicket
from app.schemas.dispute import (
    DisputeResponse as DisputeSchema,
    SupportTicketCreate,
    SupportTicketResponse as SupportSchema
)
from app.database import get_db
from app.routes.auth import get_current_user 
from app.services.email import send_ticket_response_email, send_dispute_updated_email

router = APIRouter(tags=["Dispute Protocol"])

# --- CONFIGURATION ---
UPLOAD_DIR = "uploads/evidence"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- HELPER FUNCTIONS ---
def save_evidence_file(file: UploadFile, case_id: str) -> dict:
    """Save uploaded evidence file and return file info"""
    try:
        file_ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{case_id}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        
        return {
            "name": file.filename,
            "size": f"{file_size // 1024} KB" if file_size < 1024 * 1024 else f"{file_size // (1024 * 1024)} MB",
            "type": file.content_type or "application/octet-stream",
            "url": f"/uploads/evidence/{unique_filename}",
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to save evidence file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

def calculate_risk_score(dispute: Dispute) -> int:
    """Calculate risk score based on amount, days open, and history"""
    risk = 0
    # Amount-based risk
    if dispute.amount > 1000000:
        risk += 40
    elif dispute.amount > 100000:
        risk += 25
    elif dispute.amount > 10000:
        risk += 10
    
    # Time-based risk (escalates over time)
    days_open = (datetime.now(timezone.utc) - dispute.created_at).days
    risk += min(days_open * 5, 30)
    
    # Party history risk (would need additional queries)
    
    return min(risk, 100)

# --- 1. DISPUTE REGISTRY ---

@router.get("/disputes", response_model=List[DisputeSchema])
def get_disputes(
    role: str = Query("admin"), 
    operator_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Fetches the dispute registry with pagination and filtering.
    Admins see all; users see only cases where they are the initiator or counterparty.
    """
    query = db.query(Dispute)
    
    # Role-based filtering
    if role != "admin" and operator_id:
        query = query.filter(or_(
            Dispute.initiator_id == operator_id, 
            Dispute.counterparty_id == operator_id
        ))
    
    # Status filtering
    if status and status != "all":
        query = query.filter(Dispute.status == status.upper())
    
    # Order by created date descending
    query = query.order_by(Dispute.created_at.desc())
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    disputes = query.all()
    
    # Calculate risk score and days open for each dispute
    for dispute in disputes:
        dispute.risk_score = calculate_risk_score(dispute)
        dispute.days_open = (datetime.now(timezone.utc) - dispute.created_at).days
    
    return disputes

@router.get("/disputes/{case_id}", response_model=DisputeSchema)
def get_dispute_details(
    case_id: str, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific dispute case"""
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    # Check permissions
    user_id = current_user.get("operator_id")
    user_role = current_user.get("role", "").upper()
    
    if user_role != "ADMIN" and case.initiator_id != user_id and case.counterparty_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate additional fields
    case.risk_score = calculate_risk_score(case)
    case.days_open = (datetime.now(timezone.utc) - case.created_at).days
    
    return case

@router.post("/disputes", status_code=status.HTTP_201_CREATED)
def create_dispute(
    dispute_data: DisputeCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """File a new dispute against a counterparty"""
    user_id = current_user.get("operator_id")
    
    # Check if dispute already exists for this vault
    existing = db.query(Dispute).filter(
        Dispute.vault_id == dispute_data.vault_id,
        Dispute.status != "RESOLVED"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="A dispute already exists for this vault")
    
    new_dispute = Dispute(
        id=f"DSP-{uuid.uuid4().hex[:8].upper()}",
        vault_id=dispute_data.vault_id,
        vault_title=dispute_data.vault_title,
        amount=dispute_data.amount,
        initiator_id=user_id,
        initiator=current_user.get("full_name"),
        counterparty_id=dispute_data.counterparty_id,
        counterparty=dispute_data.counterparty_name,
        reason=dispute_data.reason,
        description=dispute_data.description,
        status="OPEN",
        evidence=[],
        timeline=[{
            "event": "Dispute filed",
            "date": datetime.now(timezone.utc).isoformat(),
            "user": current_user.get("full_name")
        }],
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(new_dispute)
    db.commit()
    db.refresh(new_dispute)
    
    # Send notification to counterparty
    # background_tasks.add_task(send_dispute_filed_email, counterparty_email, new_dispute)
    
    return new_dispute

@router.get("/disputes/stats/summary")
def get_dispute_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dispute statistics for dashboard"""
    user_id = current_user.get("operator_id")
    user_role = current_user.get("role", "").upper()
    
    query = db.query(Dispute)
    
    if user_role != "ADMIN":
        query = query.filter(or_(
            Dispute.initiator_id == user_id,
            Dispute.counterparty_id == user_id
        ))
    
    total = query.count()
    open_cases = query.filter(Dispute.status == "OPEN").count()
    under_review = query.filter(Dispute.status == "UNDER_REVIEW").count()
    resolved = query.filter(Dispute.status == "RESOLVED").count()
    
    # Calculate win rate for the user
    if user_role != "ADMIN":
        user_disputes = query.all()
        wins = sum(1 for d in user_disputes if d.verdict == "influencer" and d.initiator_id == user_id)
        wins += sum(1 for d in user_disputes if d.verdict == "business" and d.counterparty_id == user_id)
        win_rate = (wins / len(user_disputes) * 100) if user_disputes else 0
    else:
        win_rate = 0
    
    return {
        "total": total,
        "open": open_cases,
        "under_review": under_review,
        "resolved": resolved,
        "win_rate": round(win_rate, 1),
        "total_amount": float(db.query(func.sum(Dispute.amount)).scalar() or 0)
    }

# --- 2. EVIDENCE UPLOAD ENDPOINT ---

@router.post("/disputes/{case_id}/evidence")
async def upload_evidence(
    case_id: str,
    evidence: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload evidence files for a dispute case. Only involved parties can upload evidence."""
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    user_id = current_user.get("operator_id")
    user_role = current_user.get("role", "").upper()
    
    if user_role != "ADMIN" and case.initiator_id != user_id and case.counterparty_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload evidence for this case")
    
    if case.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Cannot upload evidence to resolved case")
    
    saved_evidence = []
    for file in evidence:
        if file.size > 0:
            file_info = save_evidence_file(file, case_id)
            saved_evidence.append(file_info)
    
    if not saved_evidence:
        raise HTTPException(status_code=400, detail="No valid files uploaded")
    
    current_evidence = case.evidence or []
    current_evidence.extend(saved_evidence)
    case.evidence = current_evidence
    
    # Auto-escalate to UNDER_REVIEW after evidence submission
    if case.status == "OPEN":
        case.status = "UNDER_REVIEW"
    
    new_event = {
        "event": f"Evidence uploaded by {current_user.get('full_name', 'User')}", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "files": len(saved_evidence)
    }
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    db.refresh(case)
    
    return {
        "status": "SUCCESS", 
        "message": f"{len(saved_evidence)} file(s) uploaded successfully",
        "evidence": saved_evidence
    }

@router.delete("/disputes/{case_id}/evidence/{evidence_index}")
def delete_evidence(
    case_id: str,
    evidence_index: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete evidence from a dispute case (admin only)"""
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    user_role = current_user.get("role", "").upper()
    if user_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete evidence")
    
    if case.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Cannot delete evidence from resolved case")
    
    evidence_list = case.evidence or []
    if evidence_index >= len(evidence_list):
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    removed = evidence_list.pop(evidence_index)
    case.evidence = evidence_list
    
    new_event = {
        "event": f"Evidence removed by admin {current_user.get('full_name', 'Admin')}",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "removed": removed.get("name")
    }
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    
    return {"status": "SUCCESS", "message": "Evidence removed"}

# --- 3. VERDICT PROTOCOL ---

@router.patch("/disputes/{case_id}/verdict")
def submit_verdict(
    case_id: str, 
    verdict: str = Query(...), 
    notes: Optional[str] = Query(None),
    release_amount: Optional[float] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Broadcasts the Alpha Node verdict.
    Updates the status and appends the decision to the timeline.
    Supports partial amount release.
    """
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case entry missing")
    
    user_role = current_user.get("role", "").upper()
    if user_role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Only admins can submit verdicts")
    
    if case.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Case already finalized")
    
    case.status = "RESOLVED"
    case.verdict = verdict
    case.verdict_details = notes
    case.resolved_at = datetime.now(timezone.utc)
    
    # Handle partial release
    if release_amount and release_amount < case.amount:
        case.release_amount = release_amount
        case.refund_amount = case.amount - release_amount
    
    new_event = {
        "event": f"Verdict Issued: {verdict.upper()}", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "notes": notes,
        "admin": current_user.get("full_name")
    }
    
    if release_amount:
        new_event["release_amount"] = release_amount
    
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    db.refresh(case)
    
    # TODO: Trigger fund release/refund based on verdict
    
    return {
        "status": "SUCCESS", 
        "message": f"Verdict '{verdict}' broadcasted to ledger",
        "release_amount": release_amount,
        "refund_amount": case.amount - release_amount if release_amount else None
    }

# --- 4. SUPPORT & TICKETING ---

@router.post("/support", response_model=SupportSchema, status_code=201)
def create_support_ticket(
    ticket: SupportTicketCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a support packet (SupportView on Frontend)"""
    new_ticket = SupportTicket(
        id=f"SR-{uuid.uuid4().hex[:6].upper()}",
        category=ticket.category,
        priority=ticket.priority if hasattr(ticket, 'priority') else "MEDIUM",
        subject=ticket.subject,
        message=ticket.message,
        operator_id=current_user["operator_id"],
        status="PENDING",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@router.get("/support", response_model=List[SupportSchema])
def list_support_tickets(
    operator_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Feeds the 'HistoryView' on the Global Resolution Center with pagination and filters"""
    query = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    
    user_role = current_user.get("role", "").upper()
    user_id = current_user.get("operator_id")
    
    # Filter by user (admins see all)
    if user_role != "ADMIN":
        if not operator_id:
            operator_id = user_id
        query = query.filter(SupportTicket.operator_id == operator_id)
    elif operator_id:
        query = query.filter(SupportTicket.operator_id == operator_id)
    
    # Additional filters
    if status and status != "all":
        query = query.filter(SupportTicket.status == status.upper())
    
    if priority and priority != "all":
        query = query.filter(SupportTicket.priority == priority.upper())
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    return query.all()

@router.get("/support/{ticket_id}", response_model=SupportSchema)
def get_support_ticket_details(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific support ticket"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_role = current_user.get("role", "").upper()
    user_id = current_user.get("operator_id")
    
    if user_role != "ADMIN" and ticket.operator_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return ticket

@router.patch("/support/{ticket_id}")
def update_support_ticket(
    ticket_id: str,
    update_data: SupportTicketUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update support ticket status, priority, or add response (admin only)"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_role = current_user.get("role", "").upper()
    if user_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can update tickets")
    
    if update_data.status:
        ticket.status = update_data.status.upper()
    
    if update_data.priority:
        ticket.priority = update_data.priority.upper()
    
    if update_data.response:
        # Add response to timeline
        responses = ticket.responses or []
        responses.append({
            "admin": current_user.get("full_name"),
            "message": update_data.response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        ticket.responses = responses
        ticket.status = "ACTIVE"
    
    ticket.updated_at = datetime.now(timezone.utc)
    ticket.assigned_agent = update_data.assigned_agent or ticket.assigned_agent
    
    db.commit()
    db.refresh(ticket)
    
    # Send email notification to user
    # background_tasks.add_task(send_ticket_response_email, ticket.operator_id, ticket)
    
    return ticket

@router.post("/support/{ticket_id}/close")
def close_support_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close a support ticket (user or admin can close)"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_role = current_user.get("role", "").upper()
    user_id = current_user.get("operator_id")
    
    if user_role != "ADMIN" and ticket.operator_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ticket.status = "RESOLVED"
    ticket.updated_at = datetime.now(timezone.utc)
    
    new_response = {
        "event": "Ticket closed",
        "user": current_user.get("full_name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    responses = ticket.responses or []
    responses.append(new_response)
    ticket.responses = responses
    
    db.commit()
    
    return {"status": "SUCCESS", "message": "Ticket closed"}

# --- 5. ADMIN ASSIGNMENT ENDPOINT ---

@router.post("/admin/assign/{case_id}")
def assign_dispute_to_admin(
    case_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a dispute to an admin (admin only)"""
    role = current_user.get("role", "USER").upper()
    if role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    admin_id = request.get("admin_id")
    if not admin_id:
        raise HTTPException(status_code=400, detail="Admin ID required")
    
    case.assigned_admin = admin_id
    case.status = "UNDER_REVIEW"
    
    new_event = {
        "event": f"Case assigned to admin", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "admin_id": admin_id
    }
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    
    return {"status": "SUCCESS", "message": "Case assigned successfully"}

@router.get("/admin/assigned")
def get_assigned_disputes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get disputes assigned to the current admin"""
    role = current_user.get("role", "USER").upper()
    if role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    admin_id = current_user.get("operator_id")
    
    disputes = db.query(Dispute).filter(
        Dispute.assigned_admin == admin_id,
        Dispute.status != "RESOLVED"
    ).order_by(Dispute.created_at.desc()).all()
    
    return disputes

# --- 6. ADMIN QUEUE STATISTICS ---

@router.get("/admin/queue")
async def get_admin_queue(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get admin queue statistics (pending cases, in review, resolved today)"""
    role = current_user.get("role", "USER").upper()
    if role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        pending = db.execute(
            select(func.count()).select_from(Dispute).where(Dispute.status == "OPEN")
        ).scalar() or 0
        
        in_review = db.execute(
            select(func.count()).select_from(Dispute).where(Dispute.status == "UNDER_REVIEW")
        ).scalar() or 0
        
        # Urgent cases (open for more than 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        urgent_cases = db.execute(
            select(func.count()).select_from(Dispute).where(
                Dispute.status == "OPEN",
                Dispute.created_at <= seven_days_ago
            )
        ).scalar() or 0
        
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        resolved_today = db.execute(
            select(func.count())
            .select_from(Dispute)
            .where(
                Dispute.status == "RESOLVED",
                Dispute.resolved_at >= today_start
            )
        ).scalar() or 0
        
        resolved_disputes = db.execute(
            select(Dispute)
            .where(Dispute.status == "RESOLVED")
            .limit(100)
        ).scalars().all()
        
        total_time = 0
        count = 0
        for dispute in resolved_disputes:
            if dispute.resolved_at and dispute.created_at:
                time_diff = dispute.resolved_at - dispute.created_at
                total_time += time_diff.total_seconds() / 3600
                count += 1
        
        avg_resolution_time = f"{round(total_time / count, 1)}h" if count > 0 else "0h"
        
        return {
            "pending": pending,
            "in_review": in_review,
            "urgent_cases": urgent_cases,
            "resolved_today": resolved_today,
            "avg_resolution_time": avg_resolution_time
        }
    except Exception as e:
        logging.error(f"Failed to get admin queue: {str(e)}")
        return {
            "pending": 0,
            "in_review": 0,
            "urgent_cases": 0,
            "resolved_today": 0,
            "avg_resolution_time": "0h"
        }

# --- 7. ADD COMMENT TO DISPUTE ---

@router.post("/disputes/{case_id}/comments")
def add_comment(
    case_id: str,
    comment: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a dispute case"""
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    user_id = current_user.get("operator_id")
    user_role = current_user.get("role", "").upper()
    
    if user_role != "ADMIN" and case.initiator_id != user_id and case.counterparty_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to comment on this case")
    
    comment_text = comment.get("text")
    if not comment_text:
        raise HTTPException(status_code=400, detail="Comment text is required")
    
    new_event = {
        "event": f"Comment from {current_user.get('full_name', 'User')}", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "comment": comment_text,
        "user_role": user_role
    }
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    
    return {"status": "SUCCESS", "message": "Comment added successfully"}

# --- 8. GET DISPUTE TIMELINE ---

@router.get("/disputes/{case_id}/timeline")
def get_dispute_timeline(
    case_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the timeline of events for a dispute case"""
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    user_id = current_user.get("operator_id")
    user_role = current_user.get("role", "").upper()
    
    if user_role != "ADMIN" and case.initiator_id != user_id and case.counterparty_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return case.timeline or []

# --- 9. HEALTH CHECK & STATUS ---

@router.get("/health")
def dispute_health_check():
    """Health check endpoint for dispute protocol"""
    return {
        "status": "operational",
        "service": "dispute-protocol",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/stats")
def get_dispute_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get general dispute statistics"""
    user_role = current_user.get("role", "").upper()
    
    # Total disputes
    total = db.query(func.count(Dispute.id)).scalar() or 0
    
    # Resolved vs pending
    resolved = db.query(func.count(Dispute.id)).filter(Dispute.status == "RESOLVED").scalar() or 0
    pending = total - resolved
    
    # Total amount in dispute
    total_amount = db.query(func.sum(Dispute.amount)).scalar() or 0
    
    return {
        "total_disputes": total,
        "resolved": resolved,
        "pending": pending,
        "total_amount_locked": float(total_amount),
        "success_rate": round((resolved / total * 100) if total > 0 else 0, 1)
    }