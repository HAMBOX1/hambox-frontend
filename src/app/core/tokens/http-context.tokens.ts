import { HttpContextToken } from '@angular/common/http';

/** Skips bearer injection and refresh-on-401 handling (login, register, refresh). */
export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
