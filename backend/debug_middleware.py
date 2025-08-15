"""
Debug middleware for FastAPI to help troubleshoot the bulk-link endpoint

To enable this middleware, set the environment variable:
export DEBUG_BULK_LINK=true

Or run the FastAPI server with:
DEBUG_BULK_LINK=true python -m uvicorn backend.main:app --reload
"""

import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import traceback


class BulkAssignDebugMiddleware(BaseHTTPMiddleware):
    """Middleware to debug bulk-link requests specifically"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        # Debug both individual link and bulk-link requests
        if "/link" in str(request.url) and request.method in ["PUT", "DELETE"]:
            print("\n" + "="*80)
            print("BULK LINK DEBUG MIDDLEWARE")
            print("="*80)
            
            # Log request details
            print(f"URL: {request.url}")
            print(f"Method: {request.method}")
            print(f"Headers: {dict(request.headers)}")
            
            # Read and log request body
            try:
                body = await request.body()
                print(f"Raw Body Length: {len(body)} bytes")
                
                if body:
                    body_str = body.decode('utf-8')
                    print(f"Raw Body: {body_str}")
                    
                    try:
                        body_json = json.loads(body_str)
                        print(f"Parsed JSON:")
                        for key, value in body_json.items():
                            print(f"   {key}: {value} (type: {type(value).__name__})")
                    except json.JSONDecodeError as e:
                        print(f"JSON Parse Error: {e}")
                else:
                    print("Body is empty")
                    
            except Exception as e:
                print(f"Error reading body: {e}")
                print(f"Traceback: {traceback.format_exc()}")
            
            # Create new request with same body for downstream processing
            async def receive():
                return {"type": "http.request", "body": body}
                
            # Set the receive callable on the request scope
            request._receive = receive
            
            print("Calling next middleware/route handler...")
            
            try:
                response = await call_next(request)
                print(f"Response Status: {response.status_code}")
                
                # Log response body for debugging
                if hasattr(response, 'body_iterator'):
                    response_body = b""
                    async for chunk in response.body_iterator:
                        response_body += chunk
                    
                    # Try to decode response
                    try:
                        response_text = response_body.decode('utf-8')
                        print(f"Response Body: {response_text}")
                        
                        # Try to parse as JSON
                        try:
                            response_json = json.loads(response_text)
                            print(f"Response JSON: {json.dumps(response_json, indent=2)}")
                        except json.JSONDecodeError:
                            pass
                            
                    except UnicodeDecodeError:
                        print(f"Response Body (binary): {response_body[:100]}...")
                    
                    # Recreate response with same body
                    from starlette.responses import Response as StarletteResponse
                    response = StarletteResponse(
                        content=response_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type
                    )
                
                print("="*80 + "\n")
                return response
                
            except Exception as e:
                print(f"Error in route handler: {e}")
                print(f"Traceback: {traceback.format_exc()}")
                print("="*80 + "\n")
                raise
        else:
            # For non-bulk-link requests, just pass through
            return await call_next(request)


def add_debug_prints_to_bulk_link():
    """
    Helper function that can be used to add debug prints at various stages
    Call this from within the bulk_link_entities_to_grow function
    """
    import inspect
    
    frame = inspect.currentframe()
    if frame and frame.f_back:
        caller_locals = frame.f_back.f_locals
        caller_name = frame.f_back.f_code.co_name
        
        print(f"DEBUG CHECKPOINT in {caller_name}:")
        
        # Print relevant local variables
        relevant_vars = ['gateway_id', 'gateway', 'grow', 'db_entities', 'updated_entities']
        for var_name in relevant_vars:
            if var_name in caller_locals:
                value = caller_locals[var_name]
                print(f"   {var_name}: {value} (type: {type(value).__name__})")
