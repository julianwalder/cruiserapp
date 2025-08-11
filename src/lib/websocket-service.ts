import { toast } from 'sonner';

export interface WebSocketMessage {
  type: 'post_created' | 'post_updated' | 'post_deleted' | 'response_created' | 'response_updated' | 'post_expired';
  data: any;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private url: string) {}

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Don't attempt connection if no URL is configured (production without WebSocket server)
    if (!this.url) {
      console.log('WebSocket URL not configured, skipping connection');
      return;
    }

    // For Vercel deployment, skip WebSocket connection to avoid errors
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      console.log('Vercel deployment detected, skipping WebSocket connection');
      return;
    }

    try {
      this.ws = new WebSocket(`${this.url}?token=${token}`);
      this.setupEventHandlers();
    } catch (error) {
      console.warn('Failed to create WebSocket connection (server may not be running):', error);
      // Don't schedule reconnect immediately for connection errors
      // Let the onerror handler deal with it
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      // Only attempt reconnection if we're not in a clean close and haven't exceeded attempts
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.warn('WebSocket connection error (server may not be running):', error);
      // Don't log the full error object as it's often empty
      this.isConnected = false;
    };
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message.data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }

    // Show toast notifications for certain events
    this.showToastNotification(message);
  }

  private showToastNotification(message: WebSocketMessage) {
    switch (message.type) {
      case 'post_created':
        if (message.data.authorId !== this.getCurrentUserId()) {
          toast.info(`New ${message.data.type} post: ${message.data.title}`);
        }
        break;
      case 'response_created':
        if (message.data.postAuthorId === this.getCurrentUserId()) {
          toast.info(`New response to your post: ${message.data.responderName}`);
        }
        break;
      case 'post_expired':
        if (message.data.authorId === this.getCurrentUserId()) {
          toast.warning('Your post has expired');
        }
        break;
    }
  }

  private getCurrentUserId(): string | null {
    // Get current user ID from localStorage or context
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
    return null;
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect(this.getStoredToken());
    }, delay);
  }

  private getStoredToken(): string {
    return localStorage.getItem('token') || '';
  }

  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  unsubscribe(eventType: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  isConnectedState(): boolean {
    // If no URL is configured, consider it "connected" to avoid UI issues
    if (!this.url) {
      return true;
    }
    
    // For Vercel deployment, show as connected to avoid UI issues
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return true;
    }
    
    return this.isConnected;
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService(
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'ws://localhost:3003' : '')
);
