import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TranslationService } from '../i18n/translation.service';

/** Attaches the active UI language to every API request. */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const translation = inject(TranslationService);
  const language = translation.acceptLanguageHeader();

  if (!language || req.headers.has('Accept-Language')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        'Accept-Language': language,
      },
    }),
  );
};
