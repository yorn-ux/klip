import secrets
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "AETHEL_ENCLAVE_SYSTEM_SECRET_KEY_2026") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 Day session (fallback)
SECURITY_TOKEN_EXPIRE_HOURS = 2        # Lockout links expire in 2 hours

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"], 
    deprecated="auto",
    pbkdf2_sha256__rounds=300000 
)

# --- PASSWORD LOGIC ---
def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

# --- JWT TOKEN LOGIC ---
def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        subject: The user identifier (usually email)
        expires_delta: Optional custom expiration time. If not provided,
                      uses ACCESS_TOKEN_EXPIRE_MINUTES from config.
        additional_claims: Optional additional claims to include in token
    
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject), 
        "iat": datetime.now(timezone.utc), 
        "type": "access"
    }
    
    if additional_claims:
        to_encode.update(additional_claims)
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_security_token(email: str) -> str:
    """Generates a short-lived token specifically for locking accounts."""
    expire = datetime.now(timezone.utc) + timedelta(hours=SECURITY_TOKEN_EXPIRE_HOURS)
    to_encode = {"exp": expire, "sub": email, "type": "security_lock"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_token_expiration(payload: Dict[str, Any]) -> bool:
    """Check if token is expired"""
    exp = payload.get("exp")
    if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
        return False
    return True

# --- OPERATOR ID GENERATION (NO RECOVERY PHRASE) ---
def generate_operator_id() -> str:
    """
    Generate a unique operator ID for users.
    Format: OP-YYYYMMDD-XXXXXX (where X is alphanumeric)
    Example: OP-20260502-ABC123
    """
    date_part = datetime.now(timezone.utc).strftime('%Y%m%d')
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # Removed confusing chars: I, O, 0, 1
    random_part = ''.join(secrets.choice(alphabet) for _ in range(6))
    return f"OP-{date_part}-{random_part}"

# --- SECURITY ALERT FUNCTION - FIXED ---
async def send_security_alert(
    to_email: str, 
    ip_address: str, 
    user_agent: str
) -> bool:
    """
    Background task to notify user of a login and provide a lock link.
    The URL is now dynamically pulled from environment variables.
    """
    try:
        # 1. Create the special security token
        token = create_security_token(to_email)
        
        # 2. Get the Base URL from environment variables - FIXED
        environment = os.getenv("ENVIRONMENT", "production").lower()
        
        # Priority order for base URL:
        # 1. FRONTEND_URL (for lock page) or BACKEND_URL (for API)
        # 2. APP_URL (Render default)
        # 3. Production fallback URL
        base_url = os.getenv("FRONTEND_URL") or os.getenv("BACKEND_URL") or os.getenv("APP_URL")
        
        # For production, ensure we have a valid URL
        if environment == "production":
            if not base_url:
                # Use your actual production Render URL as fallback
                base_url = "https://klip-wtx9.onrender.com"
        else:
            # Development fallback
            if not base_url:
                base_url = "http://localhost:8000"
        
        base_url = base_url.rstrip("/")
        
        # 3. Construct the lock link using the correct base URL
        # Note: This should point to the frontend page that handles account locking
        # If using frontend for lock page, use FRONTEND_URL instead
        lock_link = f"{base_url}/api/v1/auth/lock-account/{token}"
        
        # 4. Print to console for visibility
        print("\n" + "!"*60)
        print(f"🚨 SECURITY ALERT: New Login for {to_email}")
        print(f"🌐 Location: {ip_address}")
        print(f"📱 Device: {user_agent}")
        print(f"🔒 LOCK LINK: {lock_link}")
        print(f"🌍 Environment: {environment}")
        print(f"📡 Base URL used: {base_url}")
        print("!"*60 + "\n")
        
        # 5. Send email with the lock link
        # Uncomment and implement when email service is ready
        # from app.services.email import send_security_alert_email
        # await send_security_alert_email(to_email, ip_address, user_agent, lock_link)
        
        return True
    except Exception as e:
        print(f"Error sending security alert: {e}")
        return False

# --- HELPER FUNCTIONS ---
def generate_verification_code() -> str:
    """Generate a 6-digit verification code for email verification"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def is_token_expired(exp_timestamp: int) -> bool:
    """Check if a token has expired based on its expiration timestamp"""
    return datetime.fromtimestamp(exp_timestamp, tz=timezone.utc) < datetime.now(timezone.utc)

def get_token_expiration_date(expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> datetime:
    """Get the expiration datetime for a new token"""
    return datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

# --- REMOVED FUNCTIONS ---
# generate_recovery_phrase() - COMPLETELY REMOVED - No mnemonic/recovery system

# Export all public functions
__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_security_token",
    "decode_access_token",
    "verify_token_expiration",
    "generate_operator_id",
    "send_security_alert",
    "generate_verification_code",
    "is_token_expired",
    "get_token_expiration_date",
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
]