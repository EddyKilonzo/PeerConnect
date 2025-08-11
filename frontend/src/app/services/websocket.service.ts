import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatMessage } from '../interfaces';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  private messageSubject = new Subject<WebSocketMessage>();
  public messages$ = this.messageSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private errorSubject = new Subject<string>();
  public errors$ = this.errorSubject.asObservable();

  constructor() {}

  connect(token: string): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${environment.wsUrl}/chat?token=${token}`;

    try {
      this.socket = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.isConnecting = false;
      this.errorSubject.next('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
  }

  sendMessage(message: ChatMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'chat_message',
        data: message
      }));
    } else {
      this.errorSubject.next('WebSocket is not connected');
    }
  }

  sendTypingIndicator(groupId: string, isTyping: boolean): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'typing_indicator',
        data: { groupId, isTyping }
      }));
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.isConnecting = false;
      this.connectionStatusSubject.next(true);
      this.reconnectAttempts = 0;
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        message.timestamp = new Date();
        this.messageSubject.next(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.errorSubject.next('Invalid message format received');
      }
    };

    this.socket.onclose = (event) => {
      this.isConnecting = false;
      this.connectionStatusSubject.next(false);
      console.log('WebSocket disconnected:', event.code, event.reason);

      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      this.isConnecting = false;
      console.error('WebSocket error:', error);
      this.errorSubject.next('WebSocket connection error');
    };
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connect(this.getAuthToken());
      }
    }, delay);
  }

  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.socket) return 'CLOSED';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}
