// ============================================================================
// SOCKET.IO CLIENT - Real-time WebSocket Connection Manager
// ============================================================================

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

/**
 * Socket.io client manager class
 * Handles connection, authentication, and event management
 */
class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to Socket.io server with JWT authentication
   * @param token - JWT authentication token
   * @returns Socket instance
   */
  connect(token: string): Socket {
    // If already connected, return existing socket
    if (this.socket?.connected) {
      console.log('✅ Socket.io already connected');
      return this.socket;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('🔌 Connecting to Socket.io server:', SOCKET_URL);

    // Create new socket connection with JWT token
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      console.log('✅ Socket.io connected successfully', {
        socketId: this.socket?.id,
        transport: this.socket?.io.engine.transport.name,
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket.io disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server disconnected the socket, need to reconnect manually
        console.log('🔄 Server disconnected socket, attempting reconnection...');
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            this.socket.connect();
          }
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error('❌ Socket.io connection error:', error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached. Please refresh the page.');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket.io reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.io reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket.io reconnection failed completely');
    });

    // Error handler
    this.socket.on('error', (error) => {
      console.error('❌ Socket.io error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.io server');
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Get current socket instance
   * @returns Socket instance or null if not connected
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Listen to a Socket.io event
   * @param event - Event name
   * @param callback - Callback function
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('Socket.io not connected. Cannot listen to event:', event);
      return;
    }
    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   * @param event - Event name
   * @param callback - Optional callback function to remove
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  /**
   * Emit a Socket.io event
   * @param event - Event name
   * @param data - Data to send
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('Socket.io not connected. Cannot emit event:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Join a room
   * @param room - Room name
   */
  joinRoom(room: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket.io not connected. Cannot join room:', room);
      return;
    }
    this.emit('join-room', room);
  }

  /**
   * Leave a room
   * @param room - Room name
   */
  leaveRoom(room: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket.io not connected. Cannot leave room:', room);
      return;
    }
    this.emit('leave-room', room);
  }

  /**
   * Join an order room for real-time updates
   * @param orderId - Order ID
   */
  joinOrder(orderId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket.io not connected. Cannot join order:', orderId);
      return;
    }
    this.emit('join-order', orderId);
    console.log('📦 Joined order room:', orderId);
  }

  /**
   * Leave an order room
   * @param orderId - Order ID
   */
  leaveOrder(orderId: string): void {
    if (!this.socket?.connected) return;
    this.emit('leave-order', orderId);
    console.log('📦 Left order room:', orderId);
  }

  /**
   * Join a chat room
   * @param threadId - Chat thread ID
   */
  joinChat(threadId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket.io not connected. Cannot join chat:', threadId);
      return;
    }
    this.emit('join-chat', threadId);
    console.log('💬 Joined chat room:', threadId);
  }

  /**
   * Leave a chat room
   * @param threadId - Chat thread ID
   */
  leaveChat(threadId: string): void {
    if (!this.socket?.connected) return;
    this.emit('leave-chat', threadId);
    console.log('💬 Left chat room:', threadId);
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;
