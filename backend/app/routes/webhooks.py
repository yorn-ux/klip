import logging
import os
import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, Request, status, Header, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import base64
import requests

from ..database import get_db
from ..models.wallet import Transaction, Wallet, TransactionStatus, TransactionType
from ..models.user import User
from ..services.email import send_deposit_notification, send_withdrawal_notification

logger = logging.getLogger("webhooks")
router = APIRouter(tags=["Webhooks"])

# --- 1. M-PESA WEBHOOK ---

def verify_mpesa_signature(request_body: bytes, signature: str) -> bool:
    """
    Verify M-Pesa webhook signature for authenticity.
    In production, validate using the API key from Safaricom.
    """
    # For production: compare signature with expected hash using your API key
    # For now, return True as Safaricom sandbox doesn't require strict verification
    return True


@router.post("/mpesa/callback")
async def mpesa_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    M-Pesa STK Push callback endpoint for payment confirmation.
    This endpoint is called by Safaricom after user completes payment.
    """
    try:
        body = await request.json()
        logger.info(f"M-Pesa callback received: {json.dumps(body)}")
    except Exception as e:
        logger.error(f"Failed to parse M-Pesa callback: {e}")
        return {"ResultCode": 1, "ResultDesc": "Failed to parse request"}
    
    # Extract callback data
    if "Body" in body and "stkCallback" in body["Body"]:
        callback_data = body["Body"]["stkCallback"]
        checkout_request_id = callback_data.get("CheckoutRequestID")
        result_code = callback_data.get("ResultCode")
        result_desc = callback_data.get("ResultDesc")
        
        logger.info(f"M-Pesa callback - CheckoutRequestID: {checkout_request_id}, ResultCode: {result_code}")
        
        # Find transaction by provider_ref
        transaction = db.query(Transaction).filter(
            Transaction.provider_ref == checkout_request_id,
            Transaction.provider == "mpesa"
        ).first()
        
        if not transaction:
            logger.error(f"Transaction not found for CheckoutRequestID: {checkout_request_id}")
            return {"ResultCode": 1, "ResultDesc": "Transaction not found"}
        
        if result_code == "0":  # Successful payment
            # Extract payment details
            amount = None
            receipt_number = None
            transaction_date = None
            phone_number = None
            
            if "CallbackMetadata" in callback_data:
                metadata = callback_data["CallbackMetadata"]["Item"]
                for item in metadata:
                    if item.get("Name") == "Amount":
                        amount = Decimal(str(item.get("Value", 0)))
                    elif item.get("Name") == "MpesaReceiptNumber":
                        receipt_number = item.get("Value")
                    elif item.get("Name") == "TransactionDate":
                        transaction_date = item.get("Value")
                    elif item.get("Name") == "PhoneNumber":
                        phone_number = item.get("Value")
            
            # Update transaction status
            if transaction.status == TransactionStatus.PROCESSING:
                transaction.status = TransactionStatus.COMPLETED
                transaction.completed_at = datetime.utcnow()
                transaction.provider_ref = receipt_number or transaction.provider_ref
                
                # Update wallet balance
                wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
                if wallet and transaction.tx_type == TransactionType.DEPOSIT:
                    if transaction.currency == "KES":
                        wallet.kes_balance += transaction.amount
                        
                        # Create platform revenue record for deposit (if any fee)
                        from ..models.wallet import PlatformRevenue
                        revenue = PlatformRevenue(
                            id=str(uuid.uuid4()),
                            transaction_id=transaction.id,
                            amount_kes=Decimal("0"),
                            amount_usdt=Decimal("0"),
                            source="deposit"
                        )
                        db.add(revenue)
                
                # Send deposit notification
                user = db.query(User).filter(User.operator_id == transaction.operator_id).first()
                if user:
                    try:
                        send_deposit_notification(
                            to_email=user.email,
                            amount=float(transaction.amount),
                            reference=transaction.tx_ref,
                            currency=transaction.currency
                        )
                    except Exception as e:
                        logger.error(f"Failed to send deposit email: {e}")
                
                db.commit()
                logger.info(f"✅ M-Pesa deposit completed: {receipt_number} for amount {amount}")
                
        else:  # Failed payment
            transaction.status = TransactionStatus.FAILED
            transaction.failure_reason = result_desc
            db.commit()
            logger.warning(f"❌ M-Pesa payment failed: {checkout_request_id} - {result_desc}")
        
        return {"ResultCode": 0, "ResultDesc": "Success"}
    
    logger.warning("Invalid M-Pesa callback structure")
    return {"ResultCode": 1, "ResultDesc": "Invalid callback structure"}


@router.post("/mpesa/b2c-callback")
async def mpesa_b2c_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    M-Pesa B2C callback endpoint for withdrawal confirmations.
    Called by Safaricom when a B2C payment is processed.
    """
    try:
        body = await request.json()
        logger.info(f"M-Pesa B2C callback received: {json.dumps(body)}")
    except Exception as e:
        logger.error(f"Failed to parse M-Pesa B2C callback: {e}")
        return {"Result": {"ResultCode": 1, "ResultDesc": "Failed to parse request"}}
    
    # Parse B2C response
    result_code = body.get("Result", {}).get("ResultCode")
    result_desc = body.get("Result", {}).get("ResultDesc")
    conversation_id = body.get("Result", {}).get("ConversationID")
    originator_conversation_id = body.get("Result", {}).get("OriginatorConversationID")
    transaction_id = body.get("Result", {}).get("TransactionID")
    
    logger.info(f"M-Pesa B2C callback - ConversationID: {conversation_id}, ResultCode: {result_code}")
    
    # Find transaction by provider_ref (conversation_id) or originator_conversation_id
    transaction = db.query(Transaction).filter(
        Transaction.provider_ref == conversation_id
    ).first()
    
    if not transaction:
        transaction = db.query(Transaction).filter(
            Transaction.provider_ref == originator_conversation_id
        ).first()
    
    if not transaction:
        logger.error(f"Transaction not found for B2C callback: {conversation_id}")
        return {"Result": {"ResultCode": 1, "ResultDesc": "Transaction not found"}}
    
    if result_code == "0":  # Success
        transaction.status = TransactionStatus.COMPLETED
        transaction.completed_at = datetime.utcnow()
        transaction.provider_ref = transaction_id or transaction.provider_ref
        db.commit()
        
        # Send withdrawal notification
        user = db.query(User).filter(User.operator_id == transaction.operator_id).first()
        if user:
            try:
                send_withdrawal_notification(
                    to_email=user.email,
                    amount=float(transaction.amount),
                    reference=transaction.tx_ref,
                    currency=transaction.currency
                )
            except Exception as e:
                logger.error(f"Failed to send withdrawal email: {e}")
        
        logger.info(f"✅ M-Pesa B2C withdrawal completed: {transaction_id}")
        
    else:  # Failed M-Pesa withdrawal
        transaction.status = TransactionStatus.FAILED
        transaction.failure_reason = result_desc
        db.commit()
        
        # Refund the wallet
        wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
        if wallet:
            refund_amount = transaction.amount + (transaction.fee or 0)
            if transaction.currency == "KES":
                wallet.kes_balance += refund_amount
            elif transaction.currency == "USDT":
                wallet.usdt_balance += refund_amount
        
        db.commit()
        logger.warning(f"❌ M-Pesa B2C withdrawal failed: {conversation_id} - {result_desc}")
    
    return {"Result": {"ResultCode": 0, "ResultDesc": "Success"}}


# --- 2. CRYPTO WEBHOOK (for deposit confirmations) ---

@router.post("/crypto/deposit")
async def crypto_deposit_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook for crypto deposit confirmations.
    In production, this would connect to blockchain monitors.
    """
    try:
        body = await request.json()
    except:
        body = {}
    
    tx_hash = body.get("tx_hash")
    network = body.get("network", "trc20")
    confirmations = body.get("confirmations", 0)
    amount = body.get("amount")
    address = body.get("address")
    
    logger.info(f"Crypto deposit webhook: {tx_hash}, network: {network}, confirmations: {confirmations}")
    
    if not tx_hash:
        return {"status": "error", "message": "No transaction hash provided"}
    
    # Find transaction by provider_ref (address or hash)
    transaction = db.query(Transaction).filter(
        Transaction.provider_ref == tx_hash
    ).first()
    
    if not transaction:
        # Try finding by pending deposit address
        transaction = db.query(Transaction).filter(
            Transaction.metadata_json.contains({"deposit_address": address}) if address else False
        ).first()
    
    if not transaction:
        logger.warning(f"Transaction not found for crypto deposit: {tx_hash}")
        return {"status": "not_found"}
    
    # Required confirmations based on network
    required_confirmations = {
        "trc20": 19,
        "bep20": 12, 
        "erc20": 12,
        "solana": 32
    }.get(network, 12)
    
    if confirmations >= required_confirmations and transaction.status == TransactionStatus.PROCESSING:
        transaction.status = TransactionStatus.COMPLETED
        transaction.completed_at = datetime.utcnow()
        transaction.provider_ref = tx_hash
        
        # Update wallet balance
        wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
        if wallet and transaction.tx_type == TransactionType.DEPOSIT:
            if transaction.currency == "USDT":
                wallet.usdt_balance += transaction.amount
                
                # Create platform revenue record
                from ..models.wallet import PlatformRevenue
                revenue = PlatformRevenue(
                    id=str(uuid.uuid4()),
                    transaction_id=transaction.id,
                    amount_kes=Decimal("0"),
                    amount_usdt=Decimal("0"),
                    source="deposit"
                )
                db.add(revenue)
            
            # Send deposit notification
            user = db.query(User).filter(User.operator_id == transaction.operator_id).first()
            if user:
                try:
                    send_deposit_notification(
                        to_email=user.email,
                        amount=float(transaction.amount),
                        reference=transaction.tx_ref,
                        currency=transaction.currency
                    )
                except Exception as e:
                    logger.error(f"Failed to send deposit email: {e}")
        
        db.commit()
        logger.info(f"✅ Crypto deposit confirmed: {tx_hash} after {confirmations} confirmations")
    
    return {
        "status": "received", 
        "confirmations": confirmations,
        "required_confirmations": required_confirmations,
        "complete": confirmations >= required_confirmations
    }


# --- 3. GENERAL WEBHOOK HANDLER ---

@router.post("/payment-callback")
async def payment_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Generic payment callback endpoint for third-party payment gateways.
    Accepts various formats and routes to appropriate handler based on provider.
    """
    try:
        body = await request.json()
    except:
        body = {}
    
    provider = body.get("provider") or body.get("source") or body.get("gateway")
    
    if provider == "mpesa" or "CheckoutRequestID" in body:
        return await mpesa_callback(request, db)
    elif provider == "crypto" or "tx_hash" in body:
        return await crypto_deposit_webhook(request, db)
    else:
        logger.warning(f"Unknown payment callback provider: {provider}")
        return {"status": "unhandled", "provider": provider}


# --- 4. WEBHOOK VERIFICATION MIDDLEWARE ---
# (Production use only)

def verify_webhook_signature(
    request_body: bytes,
    signature: str,
    secret: str,
    algorithm: str = "sha256"
) -> bool:
    """
    Verify webhook signature using HMAC.
    """
    if not signature or not secret:
        return False
    
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        request_body,
        hashlib.new(algorithm)
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


# --- 5. WEBHOOK HEALTH CHECK ---

@router.get("/webhook/health")
async def webhook_health_check():
    """
    Health check endpoint for webhook service.
    """
    return {
        "status": "operational",
        "service": "webhook-handler",
        "supported_providers": ["mpesa", "crypto"],
        "timestamp": datetime.utcnow().isoformat()
    }