import logging
import os
import time
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, File, Request, Depends, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from pathlib import Path

# --- 1. DATABASE & MODELS ---
from app.database import engine, Base, get_db, SessionLocal
import app.models 

# --- 2. ROUTE IMPORTS ---
from app.routes import (
    auth,
    wallet as wallet_routes,
    vaults,
    business,
    settings,
    dispute,
    webhooks,
    notifications,
    admin
)

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def ensure_public_schema():
    """Ensure the public schema exists and is set in the search path (PostgreSQL only)"""
    is_postgresql = "postgresql" in str(engine.url)
    is_sqlite = "sqlite" in str(engine.url)
    
    if is_sqlite:
        logger.info("SQLite mode - skipping PostgreSQL schema configuration")
        return True
        
    try:
        with SessionLocal() as db:
            result = db.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = 'public'
            """)).fetchone()
            
            if not result:
                logger.info("Creating public schema...")
                db.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
                db.commit()
            
            db.execute(text("SET search_path TO public"))
            db.commit()
            
            logger.info("Public schema configured")
            return True
    except Exception as e:
        logger.warning(f"Schema configuration warning (non-critical): {e}")
        return True

def safe_create_tables():
    """Safely create tables only if they don't exist"""
    try:
        is_postgresql = "postgresql" in str(engine.url)
        is_sqlite = "sqlite" in str(engine.url)
        
        logger.info(f"Database type: {'PostgreSQL' if is_postgresql else 'SQLite' if is_sqlite else 'Unknown'}")
        
        if is_postgresql:
            if not ensure_public_schema():
                logger.warning("Proceeding without schema configuration")
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        logger.info(f"Existing tables in database: {existing_tables}")
        
        all_tables = Base.metadata.tables.keys()
        logger.info(f"Expected tables: {list(all_tables)}")
        
        Base.metadata.create_all(bind=engine, checkfirst=True)
        
        inspector = inspect(engine)
        final_tables = inspector.get_table_names()
        logger.info(f"Database schema verification complete. Final tables: {final_tables}")
        
        return True
    except Exception as e:
        logger.error(f"Error during table creation: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def get_cors_origins() -> List[str]:
    """
    Get CORS allowed origins from environment variables.
    Expected format: "https://domain1.com,https://domain2.com"
    """
    cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
    
    if cors_origins_env:
        origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
        logger.info(f"CORS origins loaded from environment: {origins}")
        return origins
    
    # Fallback defaults for production
    default_origins = [
        "https://klip-three.vercel.app",
        "https://klip.vercel.app",
        "https://klip-wtx9.onrender.com",
    ]
    
    # Add localhost only in development
    if os.getenv("ENVIRONMENT", "production") == "development":
        default_origins.extend(["http://localhost:3000", "http://localhost:3001"])
    
    logger.info(f"CORS origins using defaults: {default_origins}")
    return default_origins

# Create upload directories if they don't exist
UPLOADS_DIR = "uploads"
EVIDENCE_DIR = os.path.join(UPLOADS_DIR, "evidence")
AVATAR_DIR = os.path.join(UPLOADS_DIR, "avatars")
KYC_DIR = os.path.join(UPLOADS_DIR, "kyc")

for directory in [UPLOADS_DIR, EVIDENCE_DIR, AVATAR_DIR, KYC_DIR]:
    Path(directory).mkdir(parents=True, exist_ok=True)
    logger.info(f"Created directory: {directory}")

# LIFESPAN: Startup and Shutdown logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Sovereign Engine Initializing...")
    
    # Log configuration on startup
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'production')}")
    logger.info(f"CORS allowed origins: {get_cors_origins()}")
    
    # Test database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    
    # Initialize database schema
    if not safe_create_tables():
        logger.error("Failed to initialize database schema")
    
    yield
    
    logger.info("Sovereign Engine Offline.")

# Initialize FastAPI app
app = FastAPI(
    title=os.getenv("API_TITLE", "Sovereign Protocol API"),
    description=os.getenv("API_DESCRIPTION", "Klip - Sovereign Financial Protocol"),
    version=os.getenv("API_VERSION", "1.0.0"),
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
)

# --- 3. CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true",
    allow_methods=os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,DELETE,OPTIONS,PATCH").split(","),
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=int(os.getenv("CORS_MAX_AGE", "600")),
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# --- 4. ROUTES ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(wallet_routes.router, prefix="/api/v1/wallet", tags=["Wallet"])
app.include_router(vaults.router, prefix="/api/v1/vaults", tags=["Vaults"])
app.include_router(business.router, prefix="/api/v1/business", tags=["Business"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["Settings"])
app.include_router(dispute.router, prefix="/api/v1/dispute", tags=["Dispute"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(notifications.router, prefix="/api/v1", tags=["Notifications"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

# --- 5. STATIC FILES - Mount uploads directory for serving files ---
# This allows uploaded evidence, avatars, and KYC documents to be accessed
uploads_dir = os.getenv("UPLOADS_DIR", "uploads")
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    logger.info(f"Mounted static files from: {uploads_dir}")
else:
    # Create directory if it doesn't exist
    Path(uploads_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    logger.info(f"Created and mounted static files from: {uploads_dir}")

# Also mount specific subdirectories for clarity
if os.path.exists(EVIDENCE_DIR):
    app.mount("/evidence", StaticFiles(directory=EVIDENCE_DIR), name="evidence")
if os.path.exists(AVATAR_DIR):
    app.mount("/avatars", StaticFiles(directory=AVATAR_DIR), name="avatars")

# --- 6. ROOT ENDPOINTS ---
@app.get("/", tags=["Root"])
async def root():
    return {
        "success": True,
        "service": "Klip API",
        "version": os.getenv("API_VERSION", "1.0.0"),
        "environment": os.getenv("ENVIRONMENT", "production"),
        "status": "operational",
        "documentation": {
            "swagger": "/docs" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
            "redoc": "/redoc" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "unhealthy"
    db_details = {}
    
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1")).scalar()
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        db.close()
        db_status = "healthy"
        db_details = {
            "tables_count": len(tables),
            "status": "connected"
        }
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        db_details = {"error": str(e)}
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "service": "klip-api",
        "version": os.getenv("API_VERSION", "1.0.0"),
        "database": {
            "status": db_status,
            "details": db_details
        },
        "environment": os.getenv("ENVIRONMENT", "production"),
        "uploads": {
            "evidence_dir": EVIDENCE_DIR,
            "avatars_dir": AVATAR_DIR,
            "kyc_dir": KYC_DIR
        }
    }

@app.get("/api/v1", tags=["API Info"])
async def api_info():
    return {
        "success": True,
        "api_version": "v1",
        "base_url": "/api/v1",
        "available_endpoints": [
            "/auth",
            "/wallet",
            "/vaults",
            "/business",
            "/settings",
            "/dispute",
            "/webhooks",
            "/notifications",
            "/admin"
        ]
    }

# --- 7. PRODUCTION EXCEPTION HANDLER ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"System error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": "Internal Server Error",
            "message": "An unexpected error occurred. Our team has been notified."
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("WORKERS", 4))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        log_level=log_level.lower()
    )