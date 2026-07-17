import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

interface GoogleCredentialResponse {
  readonly credential: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * Thin wrapper around Google Identity Services (loaded on demand, not bundled)
 * for exchanging a Google account choice for an ID token via the Sign-In popup.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private scriptPromise: Promise<void> | null = null;
  private initialized = false;
  private currentCallback: ((idToken: string) => void) | null = null;

  get isConfigured(): boolean {
    return !!environment.googleClientId;
  }

  async signIn(onCredential: (idToken: string) => void): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Google sign-in is not configured.');
    }

    await this.loadScript();
    this.currentCallback = onCredential;

    if (!this.initialized) {
      window.google!.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response) => this.currentCallback?.(response.credential),
      });
      this.initialized = true;
    }

    window.google!.accounts.id.prompt();
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = GSI_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
