import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { PageBuilderApiService } from '../../../../features/admin/page-builder/services/page-builder-api.service';

const RECENT_IMAGES_KEY = 'hambox.media-picker.recent';
const MAX_RECENT_IMAGES = 16;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
let nextId = 0;

/**
 * URL-authoritative image field: live thumbnail preview + broken-image detection + a shared "recently
 * used" strip across every media-picker instance in the app, plus direct file upload. Uploads go through
 * `PageBuilderApiService` — this component is currently only used from page-builder section forms; if a
 * second feature needs it, extract a generic media-upload endpoint/service at that point.
 */
@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [FormsModule, TranslatePipe, InputTextModule],
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPickerComponent {
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly placeholder = input('https://…/image.jpg');
  /** Recommended dimensions/format hint shown under the field, e.g. "1920×800px, JPG/PNG/WebP". */
  readonly recommendedSize = input<string | null>(null);

  readonly valueChange = output<string | null>();

  private readonly api = inject(PageBuilderApiService);

  protected readonly fieldId = `media-picker-${++nextId}`;
  protected readonly recentImages = signal<string[]>(loadRecent());
  protected readonly broken = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  /**
   * The value this picker displays. Section-settings forms are mounted once with a frozen `config`
   * input that's never re-fed from outside (see section-settings-panel.component.ts) — plain text
   * inputs get away with that because the DOM keeps the user's keystrokes regardless of the stale
   * signal, but this component drives its preview/value programmatically (upload, recent, clear), so
   * it needs its own local source of truth. `linkedSignal` re-seeds from `value()` if the input ever
   * does change, but otherwise stays whatever we last set it to.
   */
  protected readonly displayValue = linkedSignal(() => this.value());

  protected onInput(value: string): void {
    this.broken.set(false);
    const next = value || null;
    this.displayValue.set(next);
    this.valueChange.emit(next);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.uploadError.set('ADMIN.PICKERS.MEDIA_PICKER.INVALID_TYPE');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.uploadError.set('ADMIN.PICKERS.MEDIA_PICKER.TOO_LARGE');
      return;
    }

    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      const result = await firstValueFrom(this.api.uploadImage(file));
      this.broken.set(false);
      this.displayValue.set(result.url);
      this.valueChange.emit(result.url);
      this.pushRecent(result.url);
    } catch (error) {
      this.uploadError.set(error instanceof ApiError ? error.message : 'ADMIN.PICKERS.MEDIA_PICKER.UPLOAD_FAILED');
    } finally {
      this.uploading.set(false);
    }
  }

  protected onImageError(): void {
    this.broken.set(true);
  }

  protected onImageLoad(): void {
    this.broken.set(false);
    const current = this.displayValue();
    if (current) {
      this.pushRecent(current);
    }
  }

  protected applyRecent(url: string): void {
    this.broken.set(false);
    this.displayValue.set(url);
    this.valueChange.emit(url);
  }

  protected clear(): void {
    this.broken.set(false);
    this.displayValue.set(null);
    this.valueChange.emit(null);
  }

  protected removeRecent(url: string, event: Event): void {
    event.stopPropagation();
    const next = this.recentImages().filter((u) => u !== url);
    this.recentImages.set(next);
    saveRecent(next);
  }

  private pushRecent(url: string): void {
    const next = [url, ...this.recentImages().filter((u) => u !== url)].slice(0, MAX_RECENT_IMAGES);
    this.recentImages.set(next);
    saveRecent(next);
  }
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_IMAGES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(urls: string[]): void {
  try {
    localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(urls));
  } catch {
    // storage unavailable — recent images just won't persist
  }
}
