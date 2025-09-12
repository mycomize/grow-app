import json
import stripe
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from backend.models.user import User, PaymentStatus, PaymentMethod
from backend.database import get_mycomize_db

# Load configuration
def load_config():
    """Load configuration from config.json"""
    import os
    # Get the directory of this file and construct path to config
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(current_dir, 'config', 'config.json')
    
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration file not found at {config_path}"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid configuration file"
        )

# Load config
config = load_config()
stripe.api_key = config.get("stripe_secret_key")
webhook_secret = config.get("stripe_webhook_secret")

router = APIRouter(
    prefix="/webhook",
    tags=["webhook"],
)

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Stripe webhook signature"""
    try:
        stripe.Webhook.construct_event(payload, signature, secret)
        return True
    except ValueError:
        # Invalid payload
        return False
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return False

def update_user_payment_status(
    db: Session,
    user_id: int,
    payment_status: PaymentStatus,
    payment_method: PaymentMethod,
    payment_intent_id: str = None,
    customer_id: str = None
):
    """Update user payment status in database"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"User with ID {user_id} not found for payment update")
        return None
    
    user.payment_status = payment_status
    user.payment_method = payment_method
    if payment_status == PaymentStatus.paid:
        user.payment_date = datetime.now()
    if payment_intent_id:
        user.stripe_payment_intent_id = payment_intent_id
    if customer_id:
        user.stripe_customer_id = customer_id
        
    user.updated_at = datetime.now()
    db.commit()
    print(f"Updated payment status for user {user_id} to {payment_status.value}")
    return user

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_mycomize_db)
):
    """Handle Stripe webhook events"""
    # Get the payload and signature
    payload = await request.body()
    signature = request.headers.get('stripe-signature')

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )

    # Verify webhook signature
    if not verify_webhook_signature(payload, signature, webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )

    try:
        # Parse the event
        event = json.loads(payload)
        print(f"Received Stripe webhook event: {event['type']}")

        # Handle different event types
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            
            # Extract user ID from metadata
            user_id = payment_intent.get('metadata', {}).get('user_id')
            if not user_id:
                print("No user_id found in payment_intent metadata")
                return {"status": "error", "message": "No user_id in metadata"}

            # Update user payment status to paid
            user = update_user_payment_status(
                db=db,
                user_id=int(user_id),
                payment_status=PaymentStatus.paid,
                payment_method=PaymentMethod.stripe,
                payment_intent_id=payment_intent['id'],
                customer_id=payment_intent.get('customer')
            )

            if user:
                print(f"Payment successful for user {user_id}")
                return {"status": "success", "message": "Payment confirmed"}
            else:
                return {"status": "error", "message": "User not found"}

        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            
            # Extract user ID from metadata
            user_id = payment_intent.get('metadata', {}).get('user_id')
            if not user_id:
                print("No user_id found in payment_intent metadata")
                return {"status": "error", "message": "No user_id in metadata"}

            # Update user payment status to failed
            user = update_user_payment_status(
                db=db,
                user_id=int(user_id),
                payment_status=PaymentStatus.failed,
                payment_method=PaymentMethod.stripe,
                payment_intent_id=payment_intent['id'],
                customer_id=payment_intent.get('customer')
            )

            if user:
                print(f"Payment failed for user {user_id}")
                return {"status": "success", "message": "Payment failure recorded"}
            else:
                return {"status": "error", "message": "User not found"}

        elif event['type'] == 'payment_intent.canceled':
            payment_intent = event['data']['object']
            
            # Extract user ID from metadata
            user_id = payment_intent.get('metadata', {}).get('user_id')
            if not user_id:
                print("No user_id found in payment_intent metadata")
                return {"status": "error", "message": "No user_id in metadata"}

            # Reset user payment status to unpaid (in case they had failed status)
            user = update_user_payment_status(
                db=db,
                user_id=int(user_id),
                payment_status=PaymentStatus.unpaid,
                payment_method=None,
                payment_intent_id=payment_intent['id']
            )

            if user:
                print(f"Payment canceled for user {user_id}")
                return {"status": "success", "message": "Payment cancellation recorded"}
            else:
                return {"status": "error", "message": "User not found"}

        else:
            # Event type not handled
            print(f"Unhandled event type: {event['type']}")
            return {"status": "ignored", "message": f"Event type {event['type']} not handled"}

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
