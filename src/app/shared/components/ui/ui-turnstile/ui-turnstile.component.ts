import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { environment } from '../../../../../environments/environment';
import { ThemeService } from '../../../../core/theme/theme.service';
import { TranslationService } from '../../../../core/i18n/translation.service';

export type TurnstileAction = 'register' | 'forgot-password' | 'resend-verification';

interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly action: string;
  readonly theme: 'light' | 'dark';
  readonly language: string;
  readonly callback: (token: string) => void;
  readonly 'expired-callback': () => void;
  readonly 'error-callback': () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cloudflare Turnstile.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget (managed mode), wrapped once so every protected form renders and resets
 * it the same way. Verification itself always happens server-side — this component only collects the
 * token; the backend rejects the request if the token is missing or invalid regardless of whether this
 * widget was ever shown.
 */
@Component({
  selector: 'ui-turnstile',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './ui-turnstile.component.html',
  styleUrl: './ui-turnstile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiTurnstileComponent {
  private readonly theme = inject(ThemeService);
  private readonly translation = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  readonly action = input.required<TurnstileAction>();

  readonly tokenChange = output<string>();
  readonly expired = output<void>();
  readonly errored = output<void>();

  protected readonly isConfigured = !!environment.turnstileSiteKey;
  protected readonly failedToLoad = signal(false);

  private widgetId: string | null = null;

  constructor() {
    if (this.isConfigured) {
      afterNextRender(() => void this.initialize());
    }

    this.destroyRef.onDestroy(() => {
      if (this.widgetId) {
        window.turnstile?.remove(this.widgetId);
      }
    });
  }

  /** Clears the current token and re-renders a fresh challenge — call after a failed submit. */
  reset(): void {
    if (this.widgetId) {
      window.turnstile?.reset(this.widgetId);
    }
  }

  private async initialize(): Promise<void> {
    try {
      await loadTurnstileScript();
    } catch {
      this.failedToLoad.set(true);
      this.errored.emit();
      return;
    }

    this.widgetId = window.turnstile!.render(this.container().nativeElement, {
      sitekey: environment.turnstileSiteKey,
      action: this.action(),
      theme: this.theme.isDark() ? 'dark' : 'light',
      language: this.translation.language(),
      callback: (token) => this.tokenChange.emit(token),
      'expired-callback': () => this.expired.emit(),
      'error-callback': () => {
        this.failedToLoad.set(true);
        this.errored.emit();
      },
    });
  }
}
