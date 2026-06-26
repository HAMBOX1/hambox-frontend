import { Injectable } from '@angular/core';

const GUEST_CART_STORAGE_KEY = 'hambox_guest_cart_id';

@Injectable({
  providedIn: 'root',
})
export class GuestCartSessionService {
  getGuestSessionId(): string | null {
    return localStorage.getItem(GUEST_CART_STORAGE_KEY);
  }

  setGuestSessionId(sessionId: string): void {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, sessionId);
  }

  clearGuestSessionId(): void {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  }
}
