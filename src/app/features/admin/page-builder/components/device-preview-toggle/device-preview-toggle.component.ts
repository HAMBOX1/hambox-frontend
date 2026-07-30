import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const DEVICES: readonly { readonly value: PreviewDevice; readonly icon: string; readonly labelKey: string }[] = [
  { value: 'desktop', icon: 'pi pi-desktop', labelKey: 'ADMIN.PAGE_BUILDER.PREVIEW.DEVICE_DESKTOP' },
  { value: 'tablet', icon: 'pi pi-tablet', labelKey: 'ADMIN.PAGE_BUILDER.PREVIEW.DEVICE_TABLET' },
  { value: 'mobile', icon: 'pi pi-mobile', labelKey: 'ADMIN.PAGE_BUILDER.PREVIEW.DEVICE_MOBILE' },
];

/** Small segmented control for the builder preview pane's device-width switcher. */
@Component({
  selector: 'app-device-preview-toggle',
  standalone: true,
  imports: [TranslatePipe, TooltipModule],
  template: `
    <div class="device-preview-toggle" role="group" [attr.aria-label]="'ADMIN.PAGE_BUILDER.PREVIEW.DEVICE_GROUP' | translate">
      @for (device of devices; track device.value) {
        <button
          type="button"
          class="device-preview-toggle__button"
          [class.device-preview-toggle__button--active]="selected() === device.value"
          [attr.aria-pressed]="selected() === device.value"
          [pTooltip]="device.labelKey | translate"
          tooltipPosition="bottom"
          (click)="selectedChange.emit(device.value)"
        >
          <i [class]="device.icon" aria-hidden="true"></i>
        </button>
      }
    </div>
  `,
  styles: `
    .device-preview-toggle {
      display: inline-flex;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: var(--admin-radius-md, 10px);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .device-preview-toggle__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: var(--admin-radius-sm, 8px);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
        background: var(--color-surface-hover, rgba(255, 255, 255, 0.05));
      }

      &--active {
        background: var(--ui-primary);
        color: var(--color-on-primary, #fff);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicePreviewToggleComponent {
  protected readonly devices = DEVICES;

  readonly selected = input<PreviewDevice>('desktop');
  readonly selectedChange = output<PreviewDevice>();
}
