import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

import { AuthContextType } from '../auth/auth-context';
import { AuthSessionService } from '../auth/auth-session.service';
import { SUPPORT_API } from '../api/api-endpoints';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { TicketMessageApiDto, TicketStatusApi } from './support-api.model';

export interface TicketUpdatedEvent {
  readonly ticketId: string;
  readonly status: TicketStatusApi;
}

export interface MessageStatusChangedEvent {
  readonly ticketId: string;
  readonly messageId: string;
  readonly isDelivered: boolean;
  readonly isRead: boolean;
}

export interface TypingIndicatorEvent {
  readonly ticketId: string;
  readonly userId: string;
  readonly isTyping: boolean;
}

export interface PresenceChangedEvent {
  readonly userId: string;
  readonly isOnline: boolean;
}

export type SupportHubConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * SignalR client for the Support real-time channel.
 *
 * Two bugs previously made this silently degrade to "refresh to see new messages":
 * 1. `invoke()` checked `connection.state === Connected` and just no-op'd otherwise instead of
 *    waiting — since `connect()` is fired-and-forgotten from a facade constructor while
 *    `joinTicket()` fires moments later from `loadTicket()`, the WebSocket handshake routinely
 *    hadn't finished yet, so `JoinTicket` never reached the server and the connection never
 *    actually joined the group. Fixed by awaiting the in-flight connect promise before invoking.
 * 2. `withAutomaticReconnect()` gets a *new* connection id on reconnect, which drops all prior
 *    server-side group membership — nothing re-joined the ticket groups after a drop. Fixed by
 *    tracking joined ticket ids and re-issuing `JoinTicket` in `onreconnected`.
 */
@Injectable({ providedIn: 'root' })
export class SupportHubService {
  private readonly authSession = inject(AuthSessionService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private connection: signalR.HubConnection | null = null;
  private connectionPromise: Promise<void> | null = null;
  private currentContext: AuthContextType | null = null;
  private readonly joinedTickets = new Set<string>();

  private readonly connectionStateSubject = new BehaviorSubject<SupportHubConnectionState>('disconnected');
  private readonly messageReceivedSubject = new Subject<{ ticketId: string; message: TicketMessageApiDto }>();
  private readonly ticketCreatedSubject = new Subject<string>();
  private readonly ticketUpdatedSubject = new Subject<TicketUpdatedEvent>();
  private readonly messageStatusChangedSubject = new Subject<MessageStatusChangedEvent>();
  private readonly typingIndicatorSubject = new Subject<TypingIndicatorEvent>();
  private readonly presenceChangedSubject = new Subject<PresenceChangedEvent>();

  readonly connectionState$ = this.connectionStateSubject.asObservable();
  readonly messageReceived$ = this.messageReceivedSubject.asObservable();
  readonly ticketCreated$ = this.ticketCreatedSubject.asObservable();
  readonly ticketUpdated$ = this.ticketUpdatedSubject.asObservable();
  readonly messageStatusChanged$ = this.messageStatusChangedSubject.asObservable();
  readonly typingIndicator$ = this.typingIndicatorSubject.asObservable();
  readonly presenceChanged$ = this.presenceChangedSubject.asObservable();

  get connectionState(): SupportHubConnectionState {
    return this.connectionStateSubject.value;
  }

  /** Idempotent — safe to call from multiple facades; re-establishes the connection if the
   * auth context actually changed (e.g. customer session replaced by an admin session). */
  async connect(context: AuthContextType): Promise<void> {
    if (this.currentContext === context && this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.connection) {
      await this.disconnect();
    }

    this.currentContext = context;
    this.connectionStateSubject.next('connecting');

    const base = this.apiBaseUrl.replace(/\/$/, '');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${base}${SUPPORT_API.hub}`, {
        accessTokenFactory: () => this.authSession.getAccessToken(context) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveMessage', (ticketId: string, message: TicketMessageApiDto) =>
      this.messageReceivedSubject.next({ ticketId, message }),
    );
    connection.on('TicketCreated', (ticketId: string) => this.ticketCreatedSubject.next(ticketId));
    connection.on('TicketUpdated', (ticketId: string, status: TicketStatusApi) =>
      this.ticketUpdatedSubject.next({ ticketId, status }),
    );
    connection.on(
      'MessageStatusChanged',
      (ticketId: string, messageId: string, isDelivered: boolean, isRead: boolean) =>
        this.messageStatusChangedSubject.next({ ticketId, messageId, isDelivered, isRead }),
    );
    connection.on('TypingIndicator', (ticketId: string, userId: string, isTyping: boolean) =>
      this.typingIndicatorSubject.next({ ticketId, userId, isTyping }),
    );
    connection.on('PresenceChanged', (userId: string, isOnline: boolean) =>
      this.presenceChangedSubject.next({ userId, isOnline }),
    );

    connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'));
    connection.onreconnected(async () => {
      this.connectionStateSubject.next('connected');
      // A reconnect gets a new connection id server-side — every group membership was dropped.
      await Promise.all(
        Array.from(this.joinedTickets).map((ticketId) =>
          connection.invoke('JoinTicket', ticketId).catch(() => undefined),
        ),
      );
    });
    connection.onclose(() => this.connectionStateSubject.next('disconnected'));

    this.connection = connection;
    this.connectionPromise = connection
      .start()
      .then(() => this.connectionStateSubject.next('connected'))
      .catch((error) => {
        this.connectionStateSubject.next('disconnected');
        throw error;
      });

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.connectionPromise = null;
    this.currentContext = null;
    this.joinedTickets.clear();
    this.connectionStateSubject.next('disconnected');
    await connection?.stop();
  }

  async joinTicket(ticketId: string): Promise<void> {
    this.joinedTickets.add(ticketId);
    await this.invoke('JoinTicket', ticketId);
  }

  async leaveTicket(ticketId: string): Promise<void> {
    this.joinedTickets.delete(ticketId);
    await this.invoke('LeaveTicket', ticketId);
  }

  async typing(ticketId: string): Promise<void> {
    await this.invoke('Typing', ticketId);
  }

  async stopTyping(ticketId: string): Promise<void> {
    await this.invoke('StopTyping', ticketId);
  }

  async markMessageRead(ticketId: string, messageId: string): Promise<void> {
    await this.invoke('MarkMessageRead', ticketId, messageId);
  }

  /** Waits for any in-flight connect() before checking state — this is the fix for the
   * join-race that made live messages depend on a page refresh (see class doc). */
  private async invoke(method: string, ...args: unknown[]): Promise<void> {
    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
      } catch {
        return;
      }
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke(method, ...args);
    }
  }
}
