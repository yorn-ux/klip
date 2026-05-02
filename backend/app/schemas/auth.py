from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- USER DATA MODELS ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    operator_id: str
    is_verified: bool = False
    enrolled_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    """Complete user response for API"""
    id: int
    operator_id: str
    email: EmailStr
    full_name: str
    business_name: Optional[str] = None
    role: str
    is_verified: bool
    is_active: bool
    is_suspended: bool
    kyc_status: str
    phone: Optional[str] = None
    country: str
    city: str
    avatar_url: Optional[str] = None
    enrolled_by: Optional[str] = None
    enrolled_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- REQUEST SCHEMAS ---

class RegisterRequest(BaseModel):
    """Normal email/password registration - NO recovery_hash"""
    full_name: str = Field(..., min_length=2, max_length=100, example="Vincent Nyawanda")
    email: EmailStr = Field(..., example="operator@klip.com")
    password: str = Field(..., min_length=8, max_length=100, example="SecurePass123!")
    role: str = Field(default="influencer", example="influencer", description="influencer, business, or operator")
    
    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "password": "securepassword123",
                "role": "influencer"
            }
        }

class InviteRequest(BaseModel):
    """Specific schema for the Admin/Business 'Add Operator' flow."""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: str = Field(default="operator", example="operator")
    
    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Jane Smith",
                "email": "jane@example.com",
                "role": "operator"
            }
        }

class LoginRequest(BaseModel):
    """Login request with email and password"""
    email: EmailStr
    password: str = Field(..., min_length=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }

# --- RESPONSE SCHEMAS ---

class RegisterResponse(BaseModel):
    """Response after registration"""
    success: bool
    operator_id: str
    requires_verification: Optional[bool] = False
    access_token: Optional[str] = None
    detail: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "operator_id": "OP-20260502-ABC123",
                "requires_verification": True,
                "access_token": None,
                "detail": "Verification email sent"
            }
        }

class LoginResponse(BaseModel):
    """Response after successful login"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserBase

class TokenResponse(BaseModel):
    """Alias for LoginResponse for compatibility"""
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: UserBase

class VerificationVerify(BaseModel):
    """Email verification request"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "code": "123456"
            }
        }

class ResendVerificationRequest(BaseModel):
    """Request to resend verification email"""
    email: EmailStr
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }

class ForgotPasswordRequest(BaseModel):
    """Request password reset (if you add this feature later)"""
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Reset password with token"""
    token: str
    new_password: str = Field(..., min_length=8)

class ChangePasswordRequest(BaseModel):
    """Change password for authenticated user"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)

# --- TOKEN SCHEMAS ---

class TokenData(BaseModel):
    """JWT token payload structure"""
    sub: str  # email
    exp: Optional[int] = None
    type: Optional[str] = None
    
    class Config:
        from_attributes = True

class TokenPayload(BaseModel):
    """Decoded token payload"""
    sub: str
    exp: int
    iat: Optional[int] = None
    type: Optional[str] = None

# --- ERROR RESPONSES ---

class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    detail: str
    status_code: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "detail": "Email already registered",
                "status_code": 400
            }
        }

class ValidationErrorResponse(BaseModel):
    """Validation error response"""
    success: bool = False
    detail: str
    errors: Optional[List[dict]] = None

# --- KYC SCHEMAS ---

class KycDocumentUpload(BaseModel):
    """KYC document upload request"""
    operator_id: str
    doc_type: str = Field(..., description="id_card, passport, or business_license")

class KycStatusResponse(BaseModel):
    """KYC status response"""
    operator_id: str
    kyc_status: str
    kyc_notes: Optional[str] = None
    kyc_verified_at: Optional[datetime] = None
    documents_submitted: List[str] = []

# --- HEALTH CHECK ---

class HealthResponse(BaseModel):
    """API health check response"""
    status: str
    timestamp: datetime
    version: str

# Export all schemas
__all__ = [
    "UserBase",
    "UserResponse",
    "RegisterRequest",
    "InviteRequest",
    "LoginRequest",
    "RegisterResponse",
    "LoginResponse",
    "TokenResponse",
    "VerificationVerify",
    "ResendVerificationRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "ChangePasswordRequest",
    "TokenData",
    "TokenPayload",
    "ErrorResponse",
    "ValidationErrorResponse",
    "KycDocumentUpload",
    "KycStatusResponse",
    "HealthResponse",
]