import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OutputEmitterRef,
  output,
  signal,
  Type,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import {
  SectionSettingsFormInstance,
  SectionSettingsFormType,
} from '../../../../home/section-registry/models/section-variant.model';
import { resolveSectionVariant } from '../../../../home/section-registry/section-variant-registry';
import { LandingPageSectionEntry } from '../../models/page-builder.model';
import { resolveSectionSettingsForm } from '../../section-settings-registry';

/**
 * Settings panel for the currently selected section. Mounts the variant's real settings-form
 * component (per-field controls writing structured `configJson`) when one is registered in
 * `section-settings-registry.ts`; falls back to the raw-JSON editor otherwise — an honest
 * degradation for a future variant that hasn't gotten a form yet, not a permanent stopgap.
 */
@Component({
  selector: 'app-section-settings-panel',
  standalone: true,
  imports: [TranslatePipe, AdminSectionCardComponent, AdminEmptyStateComponent, AdminErrorAlertComponent],
  templateUrl: './section-settings-panel.component.html',
  styleUrl: './section-settings-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionSettingsPanelComponent {
  readonly entry = input<LandingPageSectionEntry | null>(null);
  readonly editable = input(true);

  readonly visibilityToggle = output<string>();
  readonly configChange = output<{ instanceId: string; configJson: string }>();

  protected readonly variant = computed(() => {
    const current = this.entry();
    return current ? resolveSectionVariant(current.category, current.variantKey) : undefined;
  });

  /** Only the section identity — used to gate re-mounting the form so a keystroke never remounts it. */
  private readonly selectionKey = computed(() => this.entry()?.instanceId ?? null);

  protected readonly settingsFormType = computed<SectionSettingsFormType | null>(() => {
    const current = this.entry();
    return current ? resolveSectionSettingsForm(current.category, current.variantKey) : null;
  });

  private readonly formHost = viewChild('formHost', { read: ViewContainerRef });
  private formRef: ComponentRef<SectionSettingsFormInstance> | null = null;
  private formOutputSub: ReturnType<OutputEmitterRef<unknown>['subscribe']> | null = null;

  protected readonly draftJson = signal('');
  protected readonly jsonError = signal<string | null>(null);

  constructor() {
    // Raw-JSON fallback state: reset only when the selected section itself changes, not on every
    // keystroke of our own round-tripped `configChange` emission.
    effect(() => {
      this.selectionKey();
      const initialJson = untracked(() => this.entry()?.configJson ?? '');
      this.draftJson.set(initialJson);
      this.jsonError.set(null);
    });

    // Mount/remount the real settings-form component, gated the same way — the form owns its own
    // local edit state after mount and is never re-fed a value from outside, so it never fights typing.
    effect(() => {
      this.selectionKey();
      const host = this.formHost();
      untracked(() => this.mountForm(host));
    });

    inject(DestroyRef).onDestroy(() => this.destroyForm());
  }

  protected onJsonInput(value: string): void {
    this.draftJson.set(value);
    const current = this.entry();
    if (!current) {
      return;
    }

    try {
      JSON.parse(value.trim() === '' ? '{}' : value);
      this.jsonError.set(null);
      this.configChange.emit({ instanceId: current.instanceId, configJson: value });
    } catch {
      this.jsonError.set('ADMIN.PAGE_BUILDER.SETTINGS.INVALID_JSON');
    }
  }

  private mountForm(host: ViewContainerRef | undefined): void {
    this.destroyForm();

    const current = this.entry();
    const type = this.settingsFormType();
    if (!host || !current || !type) {
      return;
    }

    // `type` is `Type<unknown>` in the registry (see SectionVariantDefinition's doc comment on why
    // it can't be structurally typed as `Type<SectionSettingsFormInstance>`) — every registered
    // settings-form component genuinely has this shape, so this cast is safe.
    const ref = host.createComponent(type as unknown as Type<SectionSettingsFormInstance>);
    ref.setInput('config', this.parseConfig(current.configJson));
    ref.setInput('disabled', !this.editable());
    this.formOutputSub = ref.instance.configChange.subscribe((value: unknown) => {
      const target = this.entry();
      if (!target) {
        return;
      }
      const json = JSON.stringify(value);
      this.draftJson.set(json);
      this.jsonError.set(null);
      this.configChange.emit({ instanceId: target.instanceId, configJson: json });
    });
    this.formRef = ref;
  }

  private destroyForm(): void {
    this.formOutputSub?.unsubscribe();
    this.formOutputSub = null;
    this.formRef?.destroy();
    this.formRef = null;
  }

  private parseConfig(json: string): unknown {
    if (!json || !json.trim()) {
      return {};
    }
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }
}
