# create_admin_neon.py
import os

# REPLACE THIS WITH YOUR ACTUAL NEON DATABASE URL
# Get it from: Neon Dashboard -> Connection Details -> Connection string
DATABASE_URL="postgresql://neondb_owner:npg_cM56yZwourVh@ep-summer-field-anxsa5jh-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"


os.environ['DATABASE_URL'] = DATABASE_URL

import psycopg2
from app.core.security import hash_password

def create_admin():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    admin_email = "root@klip.com"
    admin_password = "Admin123!"
    hashed_pw = hash_password(admin_password)
    
    # Delete existing
    cur.execute("DELETE FROM users WHERE email = %s", (admin_email,))
    
    # Insert admin
    cur.execute("""
        INSERT INTO users (
            operator_id, email, full_name, hashed_password, 
            role, is_verified, is_active, kyc_status, 
            enrolled_by, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """, (
        "ADMIN-001", admin_email, "System Administrator", hashed_pw,
        "ADMIN", True, True, "VERIFIED", "system"
    ))
    
    conn.commit()
    
    # Verify
    cur.execute("SELECT email, role, is_verified FROM users WHERE email = %s", (admin_email,))
    result = cur.fetchone()
    print(f"✅ Admin created: {result}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    create_admin()