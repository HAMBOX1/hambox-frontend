import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CookieConsentBannerComponent } from './shared/components/cookie-consent-banner/cookie-consent-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieConsentBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('hambox');
}
