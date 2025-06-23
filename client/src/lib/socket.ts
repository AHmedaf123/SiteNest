import { io, Socket } from 'socket.io-client';

// Centralized Socket.IO configuration
const SOCKET_CONFIG = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: false,
};

// Create a singleton Socket.IO instance
let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_CONFIG);

    // Add global error handling
    socketInstance.on('connect_error', (error) => {
      console.log('❌ Socket.IO connection error:', error.message);
    });

    socketInstance.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Socket.IO connected:', socketInstance?.id);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Socket.IO disconnected:', reason);
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      }
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Socket.IO reconnection attempt', attemptNumber);
      }
    });
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// Helper function to safely emit events
export function emitEvent(eventName: string, data?: any): void {
  const socket = getSocket();
  if (socket.connected) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 Emitting event: ${eventName}`, data);
    }
    socket.emit(eventName, data);
  } else {
    console.warn(`⚠️ Cannot emit ${eventName}: Socket not connected (state: ${socket.connected})`);
  }
}

// Helper function to safely listen to events
export function onEvent(eventName: string, callback: (...args: any[]) => void): () => void {
  const socket = getSocket();
  if (process.env.NODE_ENV === 'development') {
    console.log(`👂 Listening for event: ${eventName}`);
  }

  const wrappedCallback = (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📥 Received event: ${eventName}`, args);
    }
    callback(...args);
  };

  socket.on(eventName, wrappedCallback);

  // Return cleanup function
  return () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔇 Unsubscribing from event: ${eventName}`);
    }
    socket.off(eventName, wrappedCallback);
  };
}
