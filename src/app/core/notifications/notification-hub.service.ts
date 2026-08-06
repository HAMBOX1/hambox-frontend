import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

import { AuthContextType } from '../auth/auth-context';
import { AuthSessionService } from '../auth/auth-session.service';
import { ACCOUNT_API } from '../api/api-endpoints';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { UserNotificationApiDto } from '../../features/account/models/account-api.model';

export interface NotificationCreatedEvent {
  readonly notification: UserNotificationApiDto;
  readonly unreadCount: number;
}

export interface NotificationUpdatedEvent {
  readonly notification: UserNotificationApiDto;
  readonly unreadCount: number;
}

export interface NotificationDeletedEvent {
  readonly notificationId: string;
  readonly unreadCount: number;
}

/**
 * SignalR client for the notification bell / Notification Center — same connection pattern as
 * SupportHubService (core/support/support-hub.service.ts), but its own hub/connection: Support's
 * hub only connects when a user opens Support, which would miss every user who never does.
 */
@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private readonly authSession = inject(AuthSessionService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private connection: signalR.HubConnection | null = null;
  private connectionPromise: Promise<void> | null = null;
  private currentContext: AuthContextType | null = null;

  private readonly notificationCreatedSubject = new Subject<NotificationCreatedEvent>();
  private readonly notificationUpdatedSubject = new Subject<NotificationUpdatedEvent>();
  private readonly notificationDeletedSubject = new Subject<NotificationDeletedEvent>();
  private readonly allReadSubject = new Subject<void>();

  readonly notificationCreated$ = this.notificationCreatedSubject.asObservable();
  readonly notificationUpdated$ = this.notificationUpdatedSubject.asObservable();
  readonly notificationDeleted$ = this.notificationDeletedSubject.asObservable();
  readonly allRead$ = this.allReadSubject.asObservable();

  /** Idempotent — safe to call from multiple facades. */
  async connect(context: AuthContextType): Promise<void> {
    if (this.currentContext === context && this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.connection) {
      await this.disconnect();
    }

    this.currentContext = context;

    const base = this.apiBaseUrl.replace(/\/$/, '');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${base}${ACCOUNT_API.notificationsHub}`, {
        accessTokenFactory: () => this.authSession.getAccessToken(context) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    connection.on('NotificationCreated', (notification: UserNotificationApiDto, unreadCount: number) =>
      this.notificationCreatedSubject.next({ notification, unreadCount }),
    );
    connection.on('NotificationUpdated', (notification: UserNotificationApiDto, unreadCount: number) =>
      this.notificationUpdatedSubject.next({ notification, unreadCount }),
    );
    connection.on('NotificationDeleted', (notificationId: string, unreadCount: number) =>
      this.notificationDeletedSubject.next({ notificationId, unreadCount }),
    );
    connection.on('AllNotificationsRead', () => this.allReadSubject.next());

    this.connection = connection;
    this.connectionPromise = connection.start().catch((error) => {
      this.connection = null;
      this.connectionPromise = null;
      this.currentContext = null;
      throw error;
    });

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.connectionPromise = null;
    this.currentContext = null;
    await connection?.stop();
  }
}
