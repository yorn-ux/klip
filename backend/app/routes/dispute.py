import logging
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, select
from datetime import datetime, timezone
import uuid
import json

# Core Imports
from app.models.dispute import Dispute, SupportTicket
from app.schemas.dispute import (
    Dispute as DisputeSchema, 
    SupportTicketCreate, 
    SupportTicket as SupportSchema
)
from app.database import get_db
from app.routes.auth import get_current_user 

# Note: Prefix is removed from individual routes to be managed at the main app level
router = APIRouter(tags=["Dispute Protocol"])

# --- CONFIGURATION ---
UPLOAD_DIR = "uploads/evidence"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- HELPER FUNCTIONS ---
def save_evidence_file(file: UploadFile, case_id: str) -> dict:
    """Save uploaded evidence file and return file info"""
    try:
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{case_id}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        return {
            "name": file.filename,
            "size": f"{file_size // 1024} KB" if file_size < 1024 * 1024 else f"{file_size // (1024 * 1024)} MB",
            "type": file.content_type or "application/octet-stream",
            "url": f"/uploads/evidence/{unique_filename}"
        }
    except Exception as e:
        logging.error(f"Failed to save evidence file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# --- 1. DISPUTE REGISTRY ---

@router.get("/disputes", response_model=List[DisputeSchema])
def get_disputes(
    role: str = Query("admin"), 
    operator_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetches the dispute registry. 
    Admins see all; users see only cases where they are the initiator or counterparty.
    """
    query = db.query(Dispute)
    
    if role != "admin" and operator_id:
        query = query.filter(or_(
            Dispute.initiator_id == operator_id, 
            Dispute.counterparty_id == operator_id
        ))
    
    return query.order_by(Dispute.created_at.desc()).all()

@router.get("/disputes/{case_id}", response_model=DisputeSchema)
def get_dispute_details(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    return case

# --- 2. EVIDENCE UPLOAD ENDPOINT ---

@router.post("/disputes/{case_id}/evidence")
async def upload_evidence(
    case_id: str,
    evidence: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload evidence files for a dispute case.
    Only involved parties can upload evidence.
    """
    # Verify case exists
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    # Verify user is involved in the case
    user_id = current_user.get("operator_id")
    user_role = current_user.get("role", "").upper()
    
    if user_role != "ADMIN" and case.initiator_id != user_id and case.counterparty_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload evidence for this case")
    
    # Check if case is already resolved
    if case.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Cannot upload evidence to resolved case")
    
    # Save all evidence files
    saved_evidence = []
    for file in evidence:
        if file.size > 0:
            file_info = save_evidence_file(file, case_id)
            saved_evidence.append(file_info)
    
    if not saved_evidence:
        raise HTTPException(status_code=400, detail="No valid files uploaded")
    
    # Update case evidence
    current_evidence = case.evidence or []
    current_evidence.extend(saved_evidence)
    case.evidence = current_evidence
    
    # Add to timeline
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

# --- 3. VERDICT PROTOCOL ---

@router.patch("/disputes/{case_id}/verdict")
def submit_verdict(
    case_id: str, 
    verdict: str = Query(...), 
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Broadcasts the Alpha Node verdict.
    Updates the status and appends the decision to the timeline.
    """
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case entry missing")
    
    if case.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Case already finalized")
    
    case.status = "RESOLVED"
    case.verdict = verdict
    case.verdict_details = notes
    case.resolved_at = datetime.now(timezone.utc)
    
    # Update timeline (Safe append for JSONB columns)
    new_event = {
        "event": f"Verdict Issued: {verdict.upper()}", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "notes": notes
    }
    
    # Re-assigning the list triggers the SQLAlchemy 'modified' flag
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    db.refresh(case)
    return {"status": "SUCCESS", "message": f"Verdict '{verdict}' broadcasted to ledger"}

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
        subject=ticket.subject,
        message=ticket.message,
        operator_id=current_user["operator_id"],
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@router.get("/support", response_model=List[SupportSchema])
def list_support_tickets(
    operator_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Feeds the 'HistoryView' on the Global Resolution Center"""
    query = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    
    if not operator_id and current_user:
        operator_id = current_user.get("operator_id")
    
    if operator_id:
        query = query.filter(SupportTicket.operator_id == operator_id)
    
    return query.all()

# --- 5. USER-SPECIFIC SUPPORT TICKETS ---

@router.get("/support/user/{operator_id}", response_model=List[SupportSchema])
def get_user_support_tickets(
    operator_id: str, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get support tickets for a specific user"""
    if current_user.get("operator_id") != operator_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return db.query(SupportTicket).filter(
        SupportTicket.operator_id == operator_id
    ).order_by(SupportTicket.created_at.desc()).all()

# --- 6. ADMIN ASSIGNMENT ENDPOINT ---

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

# --- 7. SYSTEM MOCKS (REMOVE IN PRODUCTION) ---

@router.get("/admin/notifications/{operator_id}")
def get_mock_notifications(operator_id: str):
    """Silences 404 logs from the frontend sidebar polling - REMOVE IN PRODUCTION"""
    return [
        {
            "id": "1", 
            "type": "info", 
            "message": "Protocol Engine Online", 
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]

# --- 8. HEALTH CHECK ---

@router.get("/health")
def dispute_health_check():
    """Health check endpoint for dispute protocol"""
    return {
        "status": "operational",
        "service": "dispute-protocol",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# --- 9. ADMIN QUEUE STATISTICS ---

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
            "resolved_today": resolved_today,
            "avg_resolution_time": avg_resolution_time
        }
    except Exception as e:
        logging.error(f"Failed to get admin queue: {str(e)}")
        return {
            "pending": 0,
            "in_review": 0,
            "resolved_today": 0,
            "avg_resolution_time": "0h"
        }

# --- 10. ADD COMMENT TO DISPUTE ---

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
    
    # Verify user is involved
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
