import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from sse_starlette import EventSourceResponse
import time
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class PaymentStatusSSEEvent(BaseModel):
    """SSE Event for payment status updates"""
    event_type: str = "payment_status"
    payment_status: str
    payment_method: str
    payment_intent_id: str
    subscription_id: Optional[str] = None
    confirmation_code: Optional[str] = None
    timestamp: float
    user_id: int

class SSEConnection:
    """Represents a single SSE connection"""
    def __init__(self, user_id: int, queue: asyncio.Queue):
        self.user_id = user_id
        self.queue = queue
        self.created_at = time.time()
        self.last_activity = time.time()

class SSEManager:
    """Manages Server-Sent Event connections and broadcasting"""
    
    def __init__(self):
        self.connections: Dict[int, List[SSEConnection]] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        
    async def add_connection(self, user_id: int, queue: asyncio.Queue) -> None:
        """Add a new SSE connection for a user"""
        if user_id not in self.connections:
            self.connections[user_id] = []
        
        connection = SSEConnection(user_id, queue)
        self.connections[user_id].append(connection)
        
        logger.info(f"Added SSE connection for user {user_id}. Total connections: {len(self.connections[user_id])}")
        
        # Start cleanup task if not already running
        if self.cleanup_task is None:
            self.cleanup_task = asyncio.create_task(self._cleanup_stale_connections())
    
    async def remove_connection(self, user_id: int, connection: SSEConnection) -> None:
        """Remove a specific SSE connection"""
        if user_id in self.connections:
            try:
                self.connections[user_id].remove(connection)
                if not self.connections[user_id]:
                    del self.connections[user_id]
                logger.info(f"Removed SSE connection for user {user_id}")
            except ValueError:
                logger.warning(f"Connection not found for user {user_id}")
    
    async def broadcast_payment_status(self, user_id: int, payment_status: str, 
                                     payment_method: str, payment_intent_id: str,
                                     subscription_id: Optional[str] = None,
                                     confirmation_code: Optional[str] = None) -> None:
        """Broadcast payment status update to user's connections"""
        if user_id not in self.connections:
            logger.info(f"No SSE connections found for user {user_id}")
            return
        
        event = PaymentStatusSSEEvent(
            payment_status=payment_status,
            payment_method=payment_method,
            payment_intent_id=payment_intent_id,
            subscription_id=subscription_id,
            confirmation_code=confirmation_code,
            timestamp=time.time(),
            user_id=user_id
        )
        
        event_data = {
            "event": "payment_status",
            "data": event.dict()
        }
        
        logger.info(f"Broadcasting payment status '{payment_status}' to {len(self.connections[user_id])} connections for user {user_id}")
        
        # Send to all connections for this user
        stale_connections = []
        for connection in self.connections[user_id]:
            try:
                # Send the event data
                await self._send_event_to_connection(connection, event_data)
                connection.last_activity = time.time()
            except Exception as e:
                logger.error(f"Error sending SSE event to user {user_id}: {e}")
                stale_connections.append(connection)
        
        # Remove stale connections
        for connection in stale_connections:
            await self.remove_connection(user_id, connection)
    
    async def _send_event_to_connection(self, connection: SSEConnection, event_data: Dict[str, Any]) -> None:
        """Send event data to a specific connection"""
        try:
            # Format as SSE message
            message = f"event: {event_data['event']}\ndata: {json.dumps(event_data['data'])}\n\n"
            
            # Send to the connection's queue
            logger.debug(f"Queuing event for user {connection.user_id}: {event_data['event']}")
            await connection.queue.put(message)
        except Exception as e:
            logger.error(f"Failed to send event to connection for user {connection.user_id}: {e}")
            raise
    
    async def _cleanup_stale_connections(self) -> None:
        """Periodically cleanup stale connections"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                current_time = time.time()
                stale_threshold = 300  # 5 minutes
                
                for user_id in list(self.connections.keys()):
                    stale_connections = []
                    for connection in self.connections[user_id]:
                        if current_time - connection.last_activity > stale_threshold:
                            stale_connections.append(connection)
                    
                    for connection in stale_connections:
                        await self.remove_connection(user_id, connection)
                        
                if not self.connections:
                    # No more connections, stop cleanup task
                    break
                        
            except Exception as e:
                logger.error(f"Error during SSE cleanup: {e}")
    
    async def create_event_generator(self, user_id: int):
        """Create an async generator for SSE events"""
        queue = asyncio.Queue()
        manager = self  # Capture reference to self for the generator
        
        # Add this connection to our manager first
        connection = SSEConnection(user_id, queue)
        if user_id not in self.connections:
            self.connections[user_id] = []
        
        self.connections[user_id].append(connection)
        
        logger.info(f"Added SSE connection for user {user_id}. Total connections: {len(self.connections[user_id])}")
        
        # Start cleanup task if not already running
        if self.cleanup_task is None:
            self.cleanup_task = asyncio.create_task(self._cleanup_stale_connections())
        
        async def event_generator():
            try:
                # Send initial connection event
                initial_event = {
                    "event": "connected",
                    "data": {"user_id": user_id, "timestamp": time.time()}
                }
                yield f"event: connected\ndata: {json.dumps(initial_event['data'])}\n\n"
                
                # Keep connection alive and process queued messages
                while True:
                    try:
                        # Wait for messages with timeout for keepalive
                        message = await asyncio.wait_for(queue.get(), timeout=30.0)
                        yield message
                    except asyncio.TimeoutError:
                        # Send keepalive ping
                        yield "event: ping\ndata: {}\n\n"
                        
            except asyncio.CancelledError:
                logger.info(f"SSE connection cancelled for user {user_id}")
            except Exception as e:
                logger.error(f"Error in SSE event generator for user {user_id}: {e}")
            finally:
                # Clean up the connection when generator is done
                if user_id in manager.connections:
                    try:
                        await manager.remove_connection(user_id, connection)
                    except Exception as e:
                        logger.error(f"Error cleaning up SSE connection for user {user_id}: {e}")
        
        return event_generator()
    
    def get_connection_count(self, user_id: Optional[int] = None) -> int:
        """Get the number of active connections"""
        if user_id:
            return len(self.connections.get(user_id, []))
        return sum(len(connections) for connections in self.connections.values())

# Global SSE manager instance
sse_manager = SSEManager()
