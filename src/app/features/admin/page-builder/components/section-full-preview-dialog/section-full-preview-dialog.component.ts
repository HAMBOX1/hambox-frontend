import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { AdminEmptyStateComponent, AdminStatusBadgeComponent } from '../../../../../shared/components/admin';
import { SectionVariantDefinition } from '../../../../home/section-registry/models/section-variant.model';
import { DevicePreviewToggleComponent, PreviewDevice } from '../device-preview-toggle/device-preview-toggle.component';

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

/** How long PrimeNG's own dialog close transition takes — content is kept mounted for this long
 * after `visible` goes false so the fade-out doesn't reveal an empty dialog shell mid-animation. */
const CLOSE_ANIMATION_MS = 200;

/**
 * Full preview: renders the REAL section component (not an image) inside an `<iframe>` pointed at
 * `/page-builder/preview-section`. An iframe — not a scaled/transformed container — is what makes the
 * device switcher pixel-accurate: the section's SCSS uses real `@media (max-width: ...)` viewport
 * queries, which only respond to an actual browser viewport, not a narrowed container. The iframe is
 * only added to the DOM while the dialog is open (`@if`), so the embedded Angular app instance loads
 * on open and is fully torn down on close — nothing preloads, nothing lingers.
 */
@Component({
  selector: 'app-section-full-preview-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    TranslatePipe,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    DevicePreviewToggleComponent,
  ],
  templateUrl: './section-full-preview-dialog.component.html',
  styleUrl: './section-full-preview-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionFullPreviewDialogComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  readonly visible = input(false);
  readonly variant = input<SectionVariantDefinition | null>(null);

  readonly visibleChange = output<boolean>();
  readonly quickAdd = output<void>();

  protected readonly device = signal<PreviewDevice>('desktop');
  protected readonly iframeLoaded = signal(false);

  /** Mirrors `variant()` but only clears to `null` after `CLOSE_ANIMATION_MS`, so the header/body/
   * footer content stays mounted through PrimeNG's own close-fade instead of vanishing instantly. */
  protected readonly displayVariant = signal<SectionVariantDefinition | null>(null);

  protected readonly frameWidth = computed(() => DEVICE_WIDTH[this.device()]);

  protected readonly previewUrl = computed<SafeResourceUrl | null>(() => {
    const variant = this.variant();
    if (!variant) {
      return null;
    }

    const query = new URLSearchParams({ category: variant.category, variant: variant.variantKey }).toString();
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/page-builder/preview-section?${query}`);
  });

  constructor() {
    effect(() => {
      const next = this.variant();
      clearTimeout(this.closeTimer);

      if (next) {
        this.displayVariant.set(next);
        return;
      }

      this.closeTimer = setTimeout(() => this.displayVariant.set(null), CLOSE_ANIMATION_MS);
    });

    // A new preview always starts unloaded — otherwise the previous section's loaded state would
    // briefly leak into the next one's frame before its own `(load)` event fires.
    effect(() => {
      this.previewUrl();
      this.iframeLoaded.set(false);
    });

    this.destroyRef.onDestroy(() => clearTimeout(this.closeTimer));
  }

  protected onIframeLoad(): void {
    this.iframeLoaded.set(true);
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }
}
