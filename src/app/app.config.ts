import { provideHttpClient, withInterceptors } from '@angular/common/http';

import {

  ApplicationConfig,

  inject,

  provideAppInitializer,

  provideBrowserGlobalErrorListeners,

} from '@angular/core';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import {
  HAMBOX_PRIME_DARK_MODE_SELECTOR,
  HamboxPrimePreset,
} from './core/theme/hambox-prime-preset';



import { environment } from '../environments/environment';
import { HAMBOX_API_BASE_URL } from '../environments/api-url';

import { Auth } from './features/auth/services/auth';

import { CartFacade } from './features/cart/services/cart.facade';

import { authInterceptor } from './core/interceptors/auth.interceptor';

import { cartInterceptor } from './core/interceptors/cart.interceptor';

import { errorInterceptor } from './core/interceptors/error.interceptor';

import { localeInterceptor } from './core/interceptors/locale.interceptor';

import { provideHamboxI18n } from './core/i18n/i18n.providers';

import { CurrencyService } from './core/currency/currency.service';
import { TranslationService } from './core/i18n/translation.service';

import { API_BASE_URL } from './core/tokens/api-base-url.token';

import { ThemeService } from './core/theme/theme.service';
import { ThemeEngineService } from './core/theme/theme-engine.service';

import { routes } from './app.routes';



export const appConfig: ApplicationConfig = {

  providers: [

    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHamboxI18n(),

    provideHttpClient(

      withInterceptors([localeInterceptor, errorInterceptor, authInterceptor, cartInterceptor]),

    ),

    provideAnimationsAsync(),

    providePrimeNG({
      ripple: true,
      theme: {
        preset: HamboxPrimePreset,
        options: {
          darkModeSelector: HAMBOX_PRIME_DARK_MODE_SELECTOR,
        },
      },
      // Portal every overlay (Select/MultiSelect/AutoComplete/DatePicker/Popover/Menu/
      // TieredMenu/ContextMenu/Dialog/…) to <body> by default so containers with
      // overflow:hidden/scroll can never clip them. Every PrimeNG overlay component
      // resolves its target via `this.appendTo() || this.config.overlayAppendTo()`,
      // so this one signal is the actual global switch — `overlayOptions` (a
      // different, per-instance-only bag) is not read back by any component and has
      // no global effect.
      overlayAppendTo: 'body',
    }),

    {

      provide: API_BASE_URL,

      useValue: environment.production ? HAMBOX_API_BASE_URL : '',

    },

    provideAppInitializer(() => {

      const auth = inject(Auth);

      const cartFacade = inject(CartFacade);

      const theme = inject(ThemeService);
      const themeEngine = inject(ThemeEngineService);

      const translation = inject(TranslationService);
      const currency = inject(CurrencyService);



      theme.init();
      void themeEngine.init();



      return translation.init().then(async () => {
        await currency.init();

        await auth.restoreSession();

        await translation.syncFromAuthenticatedUser();
        await currency.syncFromAuthenticatedUser();

        if (auth.isAuthenticated()) {
          await cartFacade.mergeGuestCartIfNeeded();
          await cartFacade.load();
        }

      });

    }),

  ],

};


