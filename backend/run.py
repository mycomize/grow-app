"""
Script to run the FastAPI application with uvicorn.
"""
import uvicorn

if __name__ == "__main__":
    # Run the FastAPI application with uvicorn
    # Host is set to 0.0.0.0 to make it accessible from other devices
    # Port is set to 8000 as this is the standard port for FastAPI
    # Reload is enabled for development to automatically reload on file changes
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
