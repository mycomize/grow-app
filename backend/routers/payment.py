import json
import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.schemas.payment import (
    PaymentStatusResponse,
    CreatePaymentIntentRequest,
    CreatePaymentIntentResponse,
    PriceResponse
)
from backend.database import get_mycomize_db
from backend.security import get_current_active_user

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

# Load config and initialize Stripe
config = load_config()
stripe.api_key = config.get("stripe_secret_key")

router = APIRouter(
    prefix="/payment",
    tags=["payment"],
    responses={401: {"detail": "Not authenticated"}},
)

@router.get("/status", response_model=PaymentStatusResponse)
async def get_payment_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_mycomize_db)
):
    """Get current user's payment status"""
    # Refresh user data from database
    db.refresh(current_user)
    
    return PaymentStatusResponse(
        payment_status=current_user.payment_status.value,
        payment_method=current_user.payment_method.value if current_user.payment_method else None,
        payment_date=current_user.payment_date
    )

@router.post("/create-intent", response_model=CreatePaymentIntentResponse)
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_mycomize_db)
):
    """Create a Stripe Payment Intent"""
    try:
        # Create or get Stripe customer
        customer = None
        if current_user.stripe_customer_id:
            try:
                customer = stripe.Customer.retrieve(current_user.stripe_customer_id)
            except stripe.error.InvalidRequestError:
                # Customer doesn't exist, create new one
                customer = None
        
        if not customer:
            customer = stripe.Customer.create(
                name=current_user.username,  # Display username prominently in Stripe dashboard
                metadata={
                    'user_id': str(current_user.id),
                    'username': current_user.username
                }
            )
            # Save customer ID to user
            current_user.stripe_customer_id = customer.id
            db.commit()

        # Create Payment Intent
        payment_intent = stripe.PaymentIntent.create(
            amount=request.amount,
            currency=request.currency,
            customer=customer.id,
            metadata={
                'user_id': str(current_user.id),
                'username': current_user.username,
                'plan_id': request.plan_id
            },
            automatic_payment_methods={
                'enabled': True,
            }
        )

        # Save payment intent ID to user (for tracking purposes)
        current_user.stripe_payment_intent_id = payment_intent.id
        db.commit()

        return CreatePaymentIntentResponse(
            payment_intent_id=payment_intent.id,
            client_secret=payment_intent.client_secret,
            publishable_key=config.get("stripe_publishable_key")
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/publishable-key")
async def get_publishable_key():
    """Get Stripe publishable key for frontend"""
    return {"publishable_key": config.get("stripe_publishable_key")}

@router.get("/plans")
async def get_payment_plans():
    """Get available payment plans"""
    plans_config = config.get("payment_plans", {})
    return {"plans": list(plans_config.values())}

@router.get("/price", response_model=PriceResponse)
async def get_price(product_type: str = "opentek-lifetime"):
    """Get product price from Stripe based on product type"""
    try:
        # Map product types to payment plan IDs
        plan_id_map = {
            "opentek-lifetime": "lifetime"
        }
        
        plan_id = plan_id_map.get(product_type)
        if not plan_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown product type: {product_type}"
            )
        
        # Get payment plan configuration
        plans_config = config.get("payment_plans", {})
        plan_config = plans_config.get(plan_id)
        
        if not plan_config:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Payment plan '{plan_id}' not found in configuration"
            )
            
        price_id = plan_config.get("stripe_price_id")
        if not price_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Stripe price ID not configured for plan '{plan_id}'"
            )
        
        # Retrieve price from Stripe
        price = stripe.Price.retrieve(price_id)
        
        return {
            "price_id": price.id,
            "product_id": price.product,
            "product_type": product_type,
            "amount": price.unit_amount,  # Amount in cents
            "currency": price.currency,
            "recurring": price.recurring is not None
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve price information: {str(e)}"
        )
