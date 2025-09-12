import uvicorn
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from .routers.auth import router as auth_router
from .routers.grow import router as grow_router
from .routers.iot import router as iot_router
from .routers.tek import router as tek_router
from .routers.calendar import router as calendar_router
from .routers.payment import router as payment_router
from .routers.webhook import router as webhook_router

app = FastAPI(title="Mycomize Grow API")

# Conditionally add debug middleware for bulk-assign endpoint
if os.getenv("DEBUG_BULK_ASSIGN", "false").lower() == "true" or os.getenv("DEBUG_BULK_LINK", "false").lower() == "true":
    from .debug_middleware import BulkAssignDebugMiddleware
    app.add_middleware(BulkAssignDebugMiddleware)
    print("DEBUG: BulkAssignDebugMiddleware enabled")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:19006",
    "http://localhost:19000",
    "http://localhost:19001",
    "http://localhost:19002",
    "http://localhost:5173",
    "https://mycomize-grow.vercel.app",
    "*",  # During development only - remove in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(grow_router)
app.include_router(iot_router)
app.include_router(tek_router)
app.include_router(calendar_router)
app.include_router(payment_router)
app.include_router(webhook_router)

@app.get("/")
async def root():
    return {"message": "Mycomize Grow API"}

if __name__ == '__main__':
    uvicorn.app(app, log_level="debug")
