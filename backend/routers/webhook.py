import json
import stripe
import secrets
import string
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from backend.models.user import User, PaymentStatus, PaymentMethod
from backend.models.order import Order, PaymentMethodEnum
from backend.schemas.order import OrderCreate
from backend.database import get_mycomize_db
from backend.services.sse_service import sse_manager

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

def generate_confirmation_code() -> str:
    """Generate a random 12-digit alphanumeric confirmation code"""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))

def get_plan_data_from_config(plan_id: str) -> dict:
    """Extract plan details from configuration"""
    payment_plans = config.get("payment_plans", {})
    plan_data = payment_plans.get(plan_id)
    
    if not plan_data:
        print(f"Plan {plan_id} not found in configuration")
        return None
    
    return plan_data

def create_order(
    db: Session,
    user_id: int,
    plan_data: dict,
    confirmation_number: str,
    payment_intent_id: str,
    payment_method: PaymentMethodEnum = PaymentMethodEnum.stripe
) -> Order:
    """Create order record when payment succeeds"""
    try:
        order = Order(
            user_id=user_id,
            plan_id=plan_data["id"],
            plan_name=plan_data["name"],
            plan_description=plan_data.get("description"),
            amount=plan_data["price"],
            currency=plan_data.get("currency", "usd"),
            billing_interval=plan_data["billing_interval"],
            confirmation_number=confirmation_number,
            payment_method=payment_method,
            payment_intent_id=payment_intent_id
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        print(f"Created order {order.id} for user {user_id}, plan {plan_data['id']}, confirmation: {confirmation_number}")
        return order
    
    except Exception as e:
        print(f"Error creating order for user {user_id}: {str(e)}")
        db.rollback()
        raise e

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

# This is only called after webhook has been validated
def update_user_payment_status(
    db: Session,
    user_id: int,
    payment_status: PaymentStatus,
    payment_method: PaymentMethod,
    payment_intent_id: str = None,
    customer_id: str = None,
    plan_id: str = None
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
        # Set plan_id when payment is successful
        if plan_id:
            user.plan_id = plan_id
        else:
            print(f"Warning: No plan_id provided for successful payment of user {user_id}")
            
    if payment_intent_id:
        user.stripe_payment_intent_id = payment_intent_id
    if customer_id:
        user.stripe_customer_id = customer_id
        
    user.updated_at = datetime.now()
    db.commit()
    print(f"Updated payment status for user {user_id} to {payment_status.value}, plan: {user.plan_id}")
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
            
            # Extract user ID and plan ID from metadata
            user_id = payment_intent.get('metadata', {}).get('user_id')
            plan_id = payment_intent.get('metadata', {}).get('plan_id')
            
            if not user_id:
                print("No user_id found in payment_intent metadata")
                return {"status": "error", "message": "No user_id in metadata"}
            
            if not plan_id:
                print("No plan_id found in payment_intent metadata")
                return {"status": "error", "message": "No plan_id in metadata"}

            # Update user payment status to paid
            user = update_user_payment_status(
                db=db,
                user_id=int(user_id),
                payment_status=PaymentStatus.paid,
                payment_method=PaymentMethod.stripe,
                payment_intent_id=payment_intent['id'],
                customer_id=payment_intent.get('customer'),
                plan_id=plan_id
            )

            if user:
                # Generate confirmation code for successful payment
                confirmation_code = generate_confirmation_code()
                
                # Get plan data from configuration
                plan_data = get_plan_data_from_config(plan_id)
                if plan_data:
                    # Create order record
                    try:
                        order = create_order(
                            db=db,
                            user_id=int(user_id),
                            plan_data=plan_data,
                            confirmation_number=confirmation_code,
                            payment_intent_id=payment_intent['id'],
                            payment_method=PaymentMethodEnum.stripe
                        )
                        print(f"Order {order.id} created successfully for user {user_id}")
                    except Exception as e:
                        print(f"Error creating order for user {user_id}: {str(e)}")
                        # Continue with SSE broadcast even if order creation fails
                else:
                    print(f"Warning: Plan data not found for plan_id {plan_id}")
                
                # Broadcast SSE event for payment success with confirmation code
                await sse_manager.broadcast_payment_status(
                    user_id=int(user_id),
                    payment_status="paid",
                    payment_method="stripe",
                    payment_intent_id=payment_intent['id'],
                    confirmation_code=confirmation_code
                )
                print(f"Payment successful for user {user_id}, confirmation code: {confirmation_code}")
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
                # Broadcast SSE event for payment failure
                await sse_manager.broadcast_payment_status(
                    user_id=int(user_id),
                    payment_status="failed",
                    payment_method="stripe",
                    payment_intent_id=payment_intent['id']
                )
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
                # Broadcast SSE event for payment cancellation
                await sse_manager.broadcast_payment_status(
                    user_id=int(user_id),
                    payment_status="unpaid",
                    payment_method="stripe",
                    payment_intent_id=payment_intent['id']
                )
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
