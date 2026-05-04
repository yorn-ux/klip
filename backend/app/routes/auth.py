import os
import secrets
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.database import get_db
from app.models.user import AccountRole, User
from app.models.notification import Notification
from app.core.security import (
    hash_password,
    verify_password,
    generate_operator_id,
    create_access_token,
    decode_access_token,
    send_security_alert
)
from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    VerificationVerify
)
from app.services.email import (
    send_locked_email,
    send_restored_email,
    send_verification_email,
    send_welcome_email,
)

# Configuration
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "root@klip.com")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(tags=["Authentication"])


async def get_current_user(request: Request, db: Session = Depends(get_db)) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header.split(" ")[1]
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")

        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Token expired")

    except Exception:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    return {
        "id": user.id,
        "operator_id": user.operator_id,
        "email": user.email,
        "sub": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active,
        "kyc_status": getattr(user, 'kyc_status', 'UNVERIFIED'),
        "kyc_notes": getattr(user, 'kyc_notes', 'Documentation requires review.')
    }


@router.get("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    return {
        "valid": True,
        "is_verified": current_user["is_verified"],
        "user": current_user
    }


def create_notification(
    db: Session,
    operator_id: str,
    title: str,
    message: str,
    priority: str = "MEDIUM",
    category: str = "system",
    action_url: str = None
) -> Notification:
    notification = Notification(
        operator_id=operator_id,
        title=title,
        message=message,
        priority=priority,
        category=category,
        action_url=action_url
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/verify")
async def verify_identity(
    operator_id: str = Form(...),
    doc_type: str = Form(...),
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["operator_id"] != operator_id:
        raise HTTPException(status_code=403, detail="Operator ID mismatch")

    MAX_FILE_SIZE = 15 * 1024 * 1024
    content = await document.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Document exceeds 15MB limit")

    upload_dir = "uploads/kyc"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(document.filename)[1]
    safe_filename = f"{operator_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    user = db.query(User).filter(User.operator_id == operator_id).first()
    if user:
        user.kyc_status = "UNDER_REVIEW"
        user.kyc_notes = f"Submitted {doc_type.replace('_', ' ')} for review."
        db.commit()

        create_notification(
            db=db,
            operator_id=operator_id,
            title="KYC Under Review",
            message=f"Your {doc_type.replace('_', ' ')} document has been submitted for review.",
            priority="MEDIUM",
            category="kyc"
        )

        admin_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if admin_user:
            create_notification(
                db=db,
                operator_id=admin_user.operator_id,
                title="New KYC Submission",
                message=f"User {user.full_name} submitted {doc_type.replace('_', ' ')} for review",
                priority="MEDIUM",
                category="kyc"
            )

    return {
        "status": "success",
        "detail": "Documentation submitted for review",
        "kyc_status": "UNDER_REVIEW"
    }


@router.post("/register", response_model=RegisterResponse)
async def register(
    payload: RegisterRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    email_lowered = payload.email.lower().strip()
    is_root_admin = (email_lowered == ADMIN_EMAIL)

    is_privileged_enroller = False
    enroller_identity = "self_enroll"
    auth_header = request.headers.get("Authorization")

    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            token_data = decode_access_token(token)
            req_email = token_data.get("sub")
            enroller = db.query(User).filter(User.email == req_email).first()
            if enroller and (req_email == ADMIN_EMAIL or enroller.role.value in ["ADMIN", "BUSINESS"]):
                is_privileged_enroller = True
                enroller_identity = req_email
        except:
            pass

    existing_user = db.query(User).filter(User.email == email_lowered).first()
    if existing_user:
        if is_privileged_enroller:
            existing_user.role = AccountRole(payload.role.lower())
            existing_user.is_verified = True
            db.commit()

            create_notification(
                db=db,
                operator_id=existing_user.operator_id,
                title="Account Updated",
                message=f"Your role has been updated to {payload.role}",
                priority="LOW",
                category="account"
            )

            token = create_access_token(
                subject=existing_user.email,
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )

            return {
                "success": True,
                "operator_id": existing_user.operator_id,
                "access_token": token,
                "detail": "Identity updated."
            }
        raise HTTPException(status_code=400, detail="Identity already registered.")

    should_bypass = True if (is_root_admin or is_privileged_enroller) else False
    op_id = generate_operator_id()
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)]) if not should_bypass else None

    new_user = User(
        email=email_lowered,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        operator_id=op_id,
        role=AccountRole(payload.role.lower()),
        is_active=True,
        is_verified=should_bypass,
        verification_code=otp,
        verification_code_expires=datetime.now(timezone.utc) + timedelta(hours=24) if otp else None,
        enrolled_by=enroller_identity,
        enrolled_at=func.now() if should_bypass else None
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        create_notification(
            db=db,
            operator_id=op_id,
            title="Welcome to Klip",
            message=f"Welcome {payload.full_name}! Your account has been created successfully.",
            priority="LOW",
            category="welcome"
        )

        if not should_bypass:
            background_tasks.add_task(send_verification_email, email_lowered, otp, payload.full_name)
            return {
                "success": True,
                "operator_id": op_id,
                "requires_verification": True
            }
        else:
            background_tasks.add_task(send_welcome_email, email_lowered, payload.full_name)
            token = create_access_token(
                subject=new_user.email,
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {
                "success": True,
                "operator_id": op_id,
                "access_token": token,
                "requires_verification": False
            }
    except Exception as e:
        db.rollback()
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Database protocol error.")


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account locked. Please contact support.")

    if not user.is_verified:
        if not user.verification_code:
            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            user.verification_code = otp
            user.verification_code_expires = datetime.now(timezone.utc) + timedelta(hours=24)
            db.commit()
            background_tasks.add_task(send_verification_email, user.email, otp, user.full_name)

        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox for verification code.",
            headers={"X-Email-Verification-Required": "true"}
        )

    user.last_login = func.now()
    db.commit()

    token = create_access_token(
        subject=user.email,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    user_agent = request.headers.get("user-agent") or "Unknown Device"
    short_ua = user_agent[:60] + "..." if len(user_agent) > 60 else user_agent

    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="New Login Detected",
        message=f"New login from {request.client.host} ({short_ua}). If this wasn't you, click to freeze your account.",
        priority="LOW",
        category="security",
        action_url="/settings"
    )

    if user.email != ADMIN_EMAIL:
        background_tasks.add_task(
            send_security_alert,
            to_email=user.email,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent") or "Unknown Browser"
        )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "operator_id": user.operator_id,
            "is_verified": user.is_verified,
            "kyc_status": getattr(user, 'kyc_status', 'not_submitted'),
            "setup_complete": user.is_verified
        }
    }


@router.post("/verify-email")
async def verify_email(
    payload: VerificationVerify,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Identity not found.")

    if user.is_verified:
        token = create_access_token(
            subject=user.email,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {
            "success": True,
            "detail": "Already verified.",
            "access_token": token,
            "operator_id": user.operator_id
        }

    if not user.verification_code or user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    if user.verification_code_expires and user.verification_code_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()

    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="Email Verified",
        message="Your email has been successfully verified.",
        priority="LOW",
        category="security"
    )

    background_tasks.add_task(send_welcome_email, user.email, user.full_name)

    token = create_access_token(
        subject=user.email,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "success": True,
        "operator_id": user.operator_id,
        "access_token": token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/resend-verification")
async def resend_verification(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    email = payload.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"success": True, "message": "If account exists, verification email sent"}

    if user.is_verified:
        return {"success": True, "message": "Email already verified"}

    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.verification_code = otp
    user.verification_code_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    background_tasks.add_task(send_verification_email, email, otp, user.full_name)

    return {"success": True, "message": "Verification email sent"}


@router.post("/logout")
async def logout():
    return {"success": True, "detail": "Session terminated."}


@router.post("/lock-account/{token}")
async def lock_account(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=400, detail="Invalid token.")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if user and user.is_active:
        user.is_active = False
        db.commit()

        create_notification(
            db=db,
            operator_id=user.operator_id,
            title="Account Locked",
            message="Your account has been locked for security reasons.",
            priority="HIGH",
            category="security"
        )

        background_tasks.add_task(send_locked_email, to_email=user.email)

    return {"status": "success", "message": "Account locked."}


@router.post("/unlock-account/{user_email}")
async def unlock_account(
    user_email: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_user)
):
    if current_admin.get("role", "").upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized action.")

    user = db.query(User).filter(User.email == user_email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Identity not found.")

    user.is_active = True
    db.commit()

    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="Account Unlocked",
        message="Your account has been unlocked by an administrator.",
        priority="MEDIUM",
        category="security"
    )

    background_tasks.add_task(send_restored_email, to_email=user.email)

    return {"status": "success", "message": f"Identity {user_email} restored."}


@router.get("/lock-account/{token}")
async def lock_account_get(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=400, detail="Invalid or expired token.")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if user and user.is_active:
        user.is_active = False
        db.commit()

        create_notification(
            db=db,
            operator_id=user.operator_id,
            title="Account Locked",
            message="Your account has been locked for security reasons.",
            priority="HIGH",
            category="security"
        )

        background_tasks.add_task(send_locked_email, to_email=user.email)

        return {
            "status": "success",
            "message": "Account has been locked successfully.",
            "email": user.email
        }

    return {
        "status": "info",
        "message": "Account is already locked or not found."
    }


@router.post("/security-lock/self")
async def self_lock_account(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == current_user["email"]).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is already locked")

    lock_token = create_access_token(
        subject=user.email,
        additional_claims={"type": "security_lock"}
    )

    user.is_active = False
    db.commit()

    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="Account Self-Locked",
        message="You have locked your own account for security reasons.",
        priority="HIGH",
        category="security",
        action_url="/auth/locked"
    )

    background_tasks.add_task(send_locked_email, to_email=user.email)

    return {
        "status": "success",
        "message": "Account has been locked",
        "lock_token": lock_token
    }


__all__ = ["router", "get_current_user", "create_notification"]