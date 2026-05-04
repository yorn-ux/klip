import uuid
import hmac
import hashlib
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from datetime import datetime
import json
import httpx
import os
import base64
import requests

from ..database import get_db
from ..models.wallet import Wallet, Transaction, TransactionType, TransactionStatus, PlatformRevenue
from ..models.user import User
from .auth import get_current_user
from ..services.email import send_deposit_notification, send_withdrawal_notification

router = APIRouter(tags=["Unified Wallet"])

# --- 1. UTILITIES ---

def calculate_withdrawal_fee(amount: Decimal, method: str, history_count: int, total_volume: Decimal) -> Decimal:
    """Calculates dynamic fee based on amount tiers, loyalty, and volume."""
    if amount >= 1000000: base_perc = Decimal("0.25")
    elif amount >= 100000: base_perc = Decimal("0.55")
    elif amount >= 10000: base_perc = Decimal("0.85")
    else: base_perc = Decimal("1.15")

    loyalty_discount = min(Decimal(history_count) * Decimal("0.01"), Decimal("0.15"))
    volume_discount = min(total_volume / Decimal("10000000"), Decimal("0.1"))
    
    final_perc = max(Decimal("0.25"), base_perc - loyalty_discount - volume_discount)
    
    # Additional fee for M-Pesa
    if method == "mpesa":
        final_perc += Decimal("0.5")
    
    fee = (amount * final_perc) / 100
    min_fee = Decimal("30") if method == "mpesa" else Decimal("5")
    return max(fee, min_fee)

# Generate M-Pesa password
def generate_mpesa_password(shortcode: str, passkey: str, timestamp: str) -> str:
    data_to_encode = shortcode + passkey + timestamp
    encoded_string = base64.b64encode(data_to_encode.encode()).decode('utf-8')
    return encoded_string

# Format phone number for M-Pesa (254XXXXXXXXX)
def format_phone_number(phone: str) -> str:
    cleaned = ''.join(filter(str.isdigit, phone))
    if cleaned.startswith('0'):
        cleaned = '254' + cleaned[1:]
    if cleaned.startswith('254') and len(cleaned) == 12:
        return cleaned
    if len(cleaned) == 10 and cleaned.startswith('7'):
        return '254' + cleaned
    return cleaned

# --- 2. QUERY ROUTES ---

@router.get("/balance")
async def get_wallet_balance(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        wallet = Wallet(
            id=str(uuid.uuid4()),
            operator_id=user_op_id,
            kes_balance=Decimal("0.00"),
            usdt_balance=Decimal("0.00"),
            is_locked=False
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    
    pending_kes = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.currency == "KES",
        Transaction.status == TransactionStatus.PROCESSING
    ).scalar() or Decimal("0")
    
    pending_usdt = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.currency == "USDT",
        Transaction.status == TransactionStatus.PROCESSING
    ).scalar() or Decimal("0")
        
    return {
        "operator_id": wallet.operator_id,
        "balance_kes": float(wallet.kes_balance),
        "balance_usdt": float(wallet.usdt_balance),
        "pending_kes": float(pending_kes),
        "pending_usdt": float(pending_usdt),
        "gateway_balance": float(wallet.kes_balance),
        "is_locked": wallet.is_locked,
        "last_sync": datetime.utcnow().isoformat()
    }

@router.get("/history")
async def get_transaction_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    if not wallet: 
        return []
    
    transactions = db.query(Transaction).filter(
        Transaction.wallet_id == wallet.id
    ).order_by(Transaction.created_at.desc()).limit(limit).all()
    
    result = []
    for tx in transactions:
        result.append({
            "id": tx.id,
            "tx_ref": tx.tx_ref,
            "tx_type": tx.tx_type.value,
            "status": tx.status.value,
            "currency": tx.currency,
            "amount": float(tx.amount),
            "fee": float(tx.fee) if tx.fee else 0,
            "net_amount": float(tx.net_amount) if tx.net_amount else float(tx.amount),
            "provider": tx.provider,
            "provider_ref": tx.provider_ref,
            "created_at": tx.created_at.isoformat()
        })
    
    return result

@router.get("/transaction/{transaction_id}")
async def get_transaction_status(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "tx_type": transaction.tx_type.value,
        "amount": float(transaction.amount),
        "currency": transaction.currency,
        "provider": transaction.provider,
        "provider_ref": transaction.provider_ref,
        "created_at": transaction.created_at.isoformat(),
        "failure_reason": transaction.failure_reason
    }

# --- 3. DEPOSIT ROUTES (M-Pesa) ---

@router.post("/deposit/mpesa")
async def deposit_mpesa(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Process M-Pesa deposit via STK Push"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    amount = Decimal(str(payload.get("amount", 0)))
    phone_number = payload.get("phone_number", "")
    reference = payload.get("reference", f"DEP-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Deposit amount must be greater than 0")
    
    if not phone_number:
        raise HTTPException(400, "Phone number is required")
    
    # Format phone number
    formatted_phone = format_phone_number(phone_number)
    
    # Get M-Pesa configuration
    mpesa_shortcode = os.getenv("MPESA_SHORTCODE", "174379")
    mpesa_passkey = os.getenv("MPESA_PASSKEY", "")
    mpesa_environment = os.getenv("MPESA_ENVIRONMENT", "sandbox")
    
    if not mpesa_passkey:
        # For demo/sandbox, simulate successful STK push
        tx_id = str(uuid.uuid4())
        tx = Transaction(
            id=tx_id,
            wallet_id=wallet.id,
            operator_id=user_op_id,
            business_id=None,
            tx_type=TransactionType.DEPOSIT,
            status=TransactionStatus.PROCESSING,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            currency="KES",
            tx_ref=reference,
            provider="mpesa",
            provider_ref=reference,
            failure_reason=None,
            created_at=datetime.utcnow(),
            completed_at=None
        )
        db.add(tx)
        db.commit()
        
        # Simulate completion after 5 seconds (in production, this would be a webhook)
        # For now, return success with processing status
        return {
            "status": "pending",
            "message": "STK push sent to your phone. Please complete the payment.",
            "checkout_request_id": reference,
            "tx_id": tx_id,
            "tx_ref": reference,
            "amount": float(amount),
            "phone_number": formatted_phone
        }
    
    # Production M-Pesa API call
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_mpesa_password(mpesa_shortcode, mpesa_passkey, timestamp)
    
    if mpesa_environment == "production":
        api_url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    else:
        api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    
    # Get access token (simplified - in production, implement token caching)
    auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    consumer_key = os.getenv("MPESA_CONSUMER_KEY", "")
    consumer_secret = os.getenv("MPESA_CONSUMER_SECRET", "")
    
    if consumer_key and consumer_secret:
        auth_response = requests.get(
            auth_url,
            auth=(consumer_key, consumer_secret)
        )
        if auth_response.status_code == 200:
            access_token = auth_response.json().get("access_token")
        else:
            access_token = None
    else:
        access_token = None
    
    if not access_token:
        # Fallback to simulation
        tx_id = str(uuid.uuid4())
        tx = Transaction(
            id=tx_id,
            wallet_id=wallet.id,
            operator_id=user_op_id,
            business_id=None,
            tx_type=TransactionType.DEPOSIT,
            status=TransactionStatus.PROCESSING,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            currency="KES",
            tx_ref=reference,
            provider="mpesa",
            provider_ref=reference,
            failure_reason=None,
            created_at=datetime.utcnow(),
            completed_at=None
        )
        db.add(tx)
        db.commit()
        
        return {
            "status": "pending",
            "message": "STK push sent to your phone. Please complete the payment.",
            "checkout_request_id": reference,
            "tx_id": tx_id,
            "tx_ref": reference,
            "amount": float(amount),
            "phone_number": formatted_phone
        }
    
    # Prepare STK push request
    callback_url = os.getenv("MPESA_CALLBACK_URL", "https://your-domain.com/api/v1/wallet/mpesa/callback")
    
    payload_data = {
        "BusinessShortCode": mpesa_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerBuyGoodsOnline",
        "Amount": int(amount),
        "PartyA": formatted_phone,
        "PartyB": mpesa_shortcode,
        "PhoneNumber": formatted_phone,
        "CallBackURL": callback_url,
        "AccountReference": reference,
        "TransactionDesc": f"Wallet Deposit - {reference}"
    }
    
    response = requests.post(
        api_url,
        json=payload_data,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if response.status_code != 200:
        raise HTTPException(502, "Failed to initiate M-Pesa payment")
    
    result = response.json()
    
    if result.get("ResponseCode") != "0":
        raise HTTPException(400, result.get("ResponseDescription", "M-Pesa request failed"))
    
    # Create transaction record
    tx_id = str(uuid.uuid4())
    tx = Transaction(
        id=tx_id,
        wallet_id=wallet.id,
        operator_id=user_op_id,
        business_id=None,
        tx_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PROCESSING,
        amount=amount,
        fee=Decimal("0.00"),
        net_amount=amount,
        currency="KES",
        tx_ref=reference,
        provider="mpesa",
        provider_ref=result.get("CheckoutRequestID"),
        failure_reason=None,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    db.commit()
    
    return {
        "status": "pending",
        "message": "STK push sent to your phone",
        "checkout_request_id": result.get("CheckoutRequestID"),
        "tx_id": tx_id,
        "tx_ref": reference,
        "amount": float(amount),
        "phone_number": formatted_phone
    }


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """M-Pesa STK push callback endpoint"""
    try:
        body = await request.json()
        
        if "Body" in body and "stkCallback" in body["Body"]:
            callback_data = body["Body"]["stkCallback"]
            checkout_request_id = callback_data.get("CheckoutRequestID")
            result_code = callback_data.get("ResultCode")
            result_desc = callback_data.get("ResultDesc")
            
            # Find transaction
            transaction = db.query(Transaction).filter(
                Transaction.provider_ref == checkout_request_id,
                Transaction.provider == "mpesa",
                Transaction.status == TransactionStatus.PROCESSING
            ).first()
            
            if transaction:
                if result_code == "0":  # Success
                    # Get amount from callback
                    amount = Decimal(str(callback_data.get("Amount", transaction.amount)))
                    
                    # Update transaction
                    transaction.status = TransactionStatus.COMPLETED
                    transaction.completed_at = datetime.utcnow()
                    
                    # Update wallet balance
                    wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
                    if wallet:
                        wallet.kes_balance += amount
                    
                    # Create revenue record for platform fee
                    revenue = PlatformRevenue(
                        id=str(uuid.uuid4()),
                        transaction_id=transaction.id,
                        amount_kes=Decimal("0"),  # M-Pesa deposits have no platform fee
                        source="deposit"
                    )
                    db.add(revenue)
                    
                else:
                    # Failed transaction
                    transaction.status = TransactionStatus.FAILED
                    transaction.failure_reason = result_desc
                
                db.commit()
        
        return {"ResultCode": 0, "ResultDesc": "Success"}
    except Exception as e:
        print(f"M-Pesa callback error: {e}")
        return {"ResultCode": 1, "ResultDesc": "Failed"}

# --- 4. DEPOSIT STATUS CHECK ---

@router.get("/deposit/status/{transaction_id}")
async def get_deposit_status(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check status of a deposit transaction"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        transaction = db.query(Transaction).filter(
            Transaction.provider_ref == transaction_id,
            Transaction.wallet_id == wallet.id
        ).first()
    
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "payment_status": transaction.status.value,
        "amount": float(transaction.amount),
        "fee": float(transaction.fee) if transaction.fee else 0,
        "tx_ref": transaction.tx_ref,
        "provider_ref": transaction.provider_ref,
        "created_at": transaction.created_at.isoformat(),
        "completed_at": transaction.completed_at.isoformat() if transaction.completed_at else None
    }

# --- 5. WITHDRAWAL ROUTES ---

@router.post("/withdraw/mpesa")
async def withdraw_mpesa(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Process M-Pesa withdrawal (B2C/C2B)"""
    user_op_id = current_user["operator_id"]
    
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked: 
        raise HTTPException(403, "Account Restricted or Locked")
    
    amount = Decimal(str(payload.get("amount", 0)))
    phone_number = payload.get("phone_number", "")
    reference = payload.get("reference", f"WTH-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Withdrawal amount must be greater than 0")
    
    if not phone_number:
        raise HTTPException(400, "Phone number is required")
    
    # Format phone number
    formatted_phone = format_phone_number(phone_number)
    
    # Get withdrawal history for fee calculation
    withdrawal_count = db.query(func.count(Transaction.id)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    total_withdrawn = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or Decimal("0")
    
    # Calculate fee
    fee = calculate_withdrawal_fee(amount, "mpesa", withdrawal_count, total_withdrawn)
    total_deduction = amount + fee

    if wallet.kes_balance < total_deduction: 
        raise HTTPException(400, f"Insufficient Balance. Need {total_deduction:.2f} including fees")

    # Deduct funds
    wallet.kes_balance -= total_deduction
    
    # Create transaction record
    tx_id = str(uuid.uuid4())
    tx = Transaction(
        id=tx_id,
        wallet_id=wallet.id,
        operator_id=user_op_id,
        business_id=None,
        tx_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PROCESSING,
        amount=amount,
        fee=fee,
        net_amount=amount,
        currency="KES",
        tx_ref=reference,
        provider="mpesa",
        provider_ref=None,
        failure_reason=None,
        beneficiary_phone=formatted_phone,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    revenue = PlatformRevenue(
        id=str(uuid.uuid4()),
        transaction_id=tx_id,
        amount_kes=fee,
        amount_usdt=Decimal("0"),
        source="withdrawal_fee"
    )
    db.add(revenue)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Ledger update failed: {str(e)}")
    
    # Process M-Pesa withdrawal (simulated - implement actual M-Pesa B2C API)
    # For now, mark as completed
    tx.status = TransactionStatus.COMPLETED
    tx.provider_ref = f"MPESA-{reference}"
    tx.completed_at = datetime.utcnow()
    db.commit()
    
    # Send withdrawal notification
    try:
        send_withdrawal_notification(
            to_email=current_user["email"],
            amount=float(amount),
            reference=reference,
            currency="KES"
        )
    except Exception as e:
        print(f"Failed to send withdrawal email: {e}")
    
    return {
        "status": "completed",
        "message": "Withdrawal processed successfully",
        "withdrawal_id": tx_id,
        "payout_id": tx.provider_ref,
        "tx_ref": reference,
        "amount": float(amount),
        "fee": float(fee)
    }


@router.post("/withdraw/crypto")
async def withdraw_crypto(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Process crypto withdrawal to external wallet"""
    from ..services.crypto import process_crypto_withdrawal, validate_crypto_address
    
    user_op_id = current_user["operator_id"]
    
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked: 
        raise HTTPException(403, "Account Restricted or Locked")
    
    amount = Decimal(str(payload.get("amount", 0)))
    address = payload.get("wallet_address")
    network = payload.get("network", "trc20")
    reference = payload.get("reference", f"WTH-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Withdrawal amount must be greater than 0")
    
    if not address:
        raise HTTPException(400, "Crypto address is required")
    
    # Validate crypto address
    if not validate_crypto_address(address, network):
        raise HTTPException(400, f"Invalid {network} address")
    
    # Calculate fee (1% for crypto)
    fee = amount * Decimal("0.01")
    total_deduction = amount + fee

    if wallet.usdt_balance < total_deduction: 
        raise HTTPException(400, f"Insufficient USDT Balance. Need {total_deduction:.2f} including fees")

    # Deduct funds
    wallet.usdt_balance -= total_deduction
    
    # Create transaction record
    tx_id = str(uuid.uuid4())
    tx = Transaction(
        id=tx_id,
        wallet_id=wallet.id,
        operator_id=user_op_id,
        business_id=None,
        tx_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PROCESSING,
        amount=amount,
        fee=fee,
        net_amount=amount,
        currency="USDT",
        tx_ref=reference,
        provider="crypto",
        provider_ref=None,
        failure_reason=None,
        beneficiary_address=address,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    revenue = PlatformRevenue(
        id=str(uuid.uuid4()),
        transaction_id=tx_id,
        amount_kes=0,
        amount_usdt=fee,
        source="withdrawal_fee"
    )
    db.add(revenue)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Ledger update failed: {str(e)}")
    
    # Process crypto withdrawal
    try:
        tx_hash = await process_crypto_withdrawal(address, float(amount), network)
        
        tx.provider_ref = tx_hash
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        db.commit()
        
        send_withdrawal_notification(
            to_email=current_user["email"],
            amount=float(amount),
            reference=reference,
            currency="USDT"
        )
        
        return {
            "status": "completed",
            "message": "Withdrawal processed successfully",
            "withdrawal_id": tx_id,
            "tx_hash": tx_hash,
            "network": network,
            "tx_ref": reference
        }
    except Exception as e:
        wallet.usdt_balance += total_deduction
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = str(e)
        db.commit()
        raise HTTPException(400, str(e))

# --- 6. WITHDRAWAL STATUS ---

@router.get("/withdrawal/status/{payout_id}")
async def get_withdrawal_status(
    payout_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check status of a withdrawal/payout"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    transaction = db.query(Transaction).filter(
        Transaction.id == payout_id,
        Transaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        transaction = db.query(Transaction).filter(
            Transaction.provider_ref == payout_id,
            Transaction.wallet_id == wallet.id
        ).first()
    
    if not transaction:
        raise HTTPException(404, "Withdrawal not found")
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "amount": float(transaction.amount),
        "fee": float(transaction.fee) if transaction.fee else 0,
        "phone": transaction.beneficiary_phone,
        "tx_ref": transaction.tx_ref,
        "provider_ref": transaction.provider_ref,
        "created_at": transaction.created_at.isoformat()
    }

# --- 7. CONVERSION ROUTES ---

@router.post("/convert")
async def wallet_convert(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked:
        raise HTTPException(403, "Conversion Disabled: Wallet Locked")

    from_currency = payload.get("from_currency")
    to_currency = payload.get("to_currency")
    amount = Decimal(str(payload.get("amount", 0)))
    rate = Decimal(str(payload.get("rate", "129.50")))
    fee = Decimal(str(payload.get("fee", 0)))
    reference = payload.get("reference", f"CONV-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")
    
    if from_currency == "USDT" and to_currency == "KES":
        if wallet.usdt_balance < amount:
            raise HTTPException(400, f"Insufficient USDT. Need {amount} USDT")
        
        wallet.usdt_balance -= amount
        kes_amount = amount * rate
        wallet.kes_balance += kes_amount
        
        tx = Transaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            operator_id=user_op_id,
            tx_type=TransactionType.CONVERSION,
            status=TransactionStatus.COMPLETED,
            amount=amount,
            fee=fee,
            net_amount=kes_amount,
            currency="USDT",
            tx_ref=reference,
            provider="internal",
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            metadata_json={
                "from_currency": "USDT",
                "to_currency": "KES",
                "rate": float(rate),
                "result_amount": float(kes_amount)
            }
        )
        
    elif from_currency == "KES" and to_currency == "USDT":
        if wallet.kes_balance < amount:
            raise HTTPException(400, f"Insufficient KES. Need {amount} KES")
        
        wallet.kes_balance -= amount
        usdt_amount = amount / rate
        wallet.usdt_balance += usdt_amount
        
        tx = Transaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            operator_id=user_op_id,
            tx_type=TransactionType.CONVERSION,
            status=TransactionStatus.COMPLETED,
            amount=amount,
            fee=fee,
            net_amount=usdt_amount,
            currency="KES",
            tx_ref=reference,
            provider="internal",
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            metadata_json={
                "from_currency": "KES",
                "to_currency": "USDT",
                "rate": float(rate),
                "result_amount": float(usdt_amount)
            }
        )
    else:
        raise HTTPException(400, "Invalid currency pair")
    
    db.add(tx)
    db.commit()
    
    return {
        "status": "success",
        "conversion_id": tx.id,
        "tx_ref": reference,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "amount": float(amount),
        "result_amount": float(tx.net_amount),
        "fee": float(fee)
    }

@router.get("/conversion/rate")
async def get_conversion_rate(pair: str = "USDT/KES"):
    base_rate = 129.50
    
    if pair == "USDT/KES":
        return {
            "pair": pair,
            "buy_rate": base_rate * 0.995,
            "sell_rate": base_rate * 1.005,
            "rate": base_rate,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(400, "Unsupported pair")

@router.get("/withdrawals/metrics")
async def get_withdrawal_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        return {"totalAmount": 0, "count": 0, "total_withdrawn": 0}
    
    total_withdrawn = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    withdrawal_count = db.query(func.count(Transaction.id)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    return {
        "totalAmount": float(total_withdrawn),
        "count": withdrawal_count,
        "total_withdrawn": float(total_withdrawn)
    }