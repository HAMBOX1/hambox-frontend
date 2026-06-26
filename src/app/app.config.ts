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



import { environment } from '../environments/environment';

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

    }),

    {

      provide: API_BASE_URL,

      useValue: environment.apiUrl,

    },

    provideAppInitializer(() => {

      const auth = inject(Auth);

      const cartFacade = inject(CartFacade);

      const theme = inject(ThemeService);

      const translation = inject(TranslationService);
      const currency = inject(CurrencyService);



      theme.init();



      return translation.init().then(async () => {
        await currency.init();

        await auth.restoreSession();

        await translation.syncFromAuthenticatedUser();
        await currency.syncFromAuthenticatedUser();

        await cartFacade.mergeGuestCartIfNeeded();

        await cartFacade.load();

      });

    }),

  ],

};


