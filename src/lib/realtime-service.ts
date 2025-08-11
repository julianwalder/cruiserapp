import { toast } from 'sonner';

export interface RealtimeMessage {
  type: 'post_created' | 'post_updated' | 'post_deleted' | 'response_created' | 'response_updated' | 'post_expired';
  data: any;
}

export class RealtimeService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isPolling = false;
  private lastCheckTime = 0;
  private token: string = '';

  constructor(private pollInterval: number = 5000) {}

  connect(token: string) {
    this.token = token;
    this.startPolling();
  }

  private startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollInterval);
  }

  private async checkForUpdates() {
    try {
      const response = await fetch('/api/community-board/realtime/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          lastCheckTime: this.lastCheckTime,
        }),
      });

      if (response.ok) {
        const updates = await response.json();
        this.lastCheckTime = Date.now();
        
        updates.forEach((update: RealtimeMessage) => {
          this.handleMessage(update);
        });
      }
    } catch (error) {
      console.warn('Failed to check for real-time updates:', error);
    }
  }

  private handleMessage(message: RealtimeMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message.data);
        } catch (error) {
          console.error('Error in real-time listener:', error);
        }
      });
    }

    // Show toast notifications for certain events
    this.showToastNotification(message);
  }

  private showToastNotification(message: RealtimeMessage) {
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
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.listeners.clear();
  }

  isConnectedState(): boolean {
    return this.isPolling;
  }

  send(message: any) {
    // For polling-based system, we don't send messages directly
    // Messages are sent through regular API calls
    console.log('Realtime message (polling mode):', message);
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();
