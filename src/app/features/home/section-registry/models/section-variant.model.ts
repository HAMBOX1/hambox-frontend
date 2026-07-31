import { InputSignal, OutputEmitterRef, Type } from '@angular/core';

import { StorefrontContent } from '../../models/storefront-content.model';
import {
  FlashDeal,
  StorefrontCategory,
  StorefrontFeaturedProduct,
  TrendingRankItem,
  TrendingValueItem,
  TrustFeature,
} from '../../models/storefront-home';

/** Uniform data payload every registered section variant renders from. */
export interface SectionRenderContext {
  readonly content: StorefrontContent;
  readonly categories: readonly StorefrontCategory[];
  readonly featuredProducts: readonly FlashDeal[];
  readonly featuredHighlight: StorefrontFeaturedProduct | null;
  readonly trendingRanks: readonly TrendingRankItem[];
  readonly trendingValue: TrendingValueItem | null;
  readonly trustFeatures: readonly TrustFeature[];
  readonly flashCountdownSeconds: number;
}

/**
 * `renderComponent`/settings-form components each declare `config` as `input.required<TheirOwn
 * ConfigType>()`, not `InputSignal<unknown>` — and `InputSignal<T>`'s internal transform-fn is
 * contravariant in `T`, so `InputSignal<Specific>` is never structurally assignable to
 * `InputSignal<unknown>`. Typing these fields as `Type<unknown>` (rather than trying to force a
 * precise structural shape) is the pragmatic choice: neither `NgComponentOutlet` nor
 * `ViewContainerRef.createComponent`/`ComponentRef.setInput` are statically typed against the
 * mounted component's inputs anyway, so nothing is actually lost.
 */
export interface SectionVariantDefinition {
  readonly category: string;
  readonly variantKey: string;
  readonly displayName: string;
  readonly renderComponent: Type<unknown>;
  /** One-line merchant-facing summary shown on the Section Library card and full-preview header. */
  readonly description: string;
  /** Free-form labels for search matching (e.g. "banner", "countdown") — not rendered as UI chips. */
  readonly tags: readonly string[];
  /** Curated, not analytics-derived — mirrors the spec's "if available" framing. */
  readonly badge?: 'popular' | 'new';
  /** Optional real WebP screenshot path (e.g. `assets/page-builder/previews/hero-kinetic-glass.webp`).
   * Falls back to a generated placeholder thumbnail when omitted — no screenshot pipeline exists yet. */
  readonly previewImage?: string;
  /** Demo config the real component renders with in the Section Library (fast-preview fallback data
   * and full-preview). Deliberately static/offline — never sourced from an API. */
  readonly previewConfig: unknown;
  /** Breakpoints this variant can be meaningfully previewed at; all three today for every variant. */
  readonly supportedBreakpoints: readonly ('desktop' | 'tablet' | 'mobile')[];
}

/**
 * Admin settings-form component contract for a variant's `configJson` — mounted dynamically by
 * `SectionSettingsPanelComponent`. Deliberately NOT a field on `SectionVariantDefinition`/
 * `SECTION_VARIANT_REGISTRY`: that registry is imported by the storefront's `SectionRendererComponent`
 * (part of the public home page's lazy chunk), and every settings-form component drags in admin-only
 * PrimeNG/CDK modules — putting them there would leak admin bundle weight into the storefront chunk.
 * The admin-only mapping lives instead in `features/admin/page-builder/section-settings-registry.ts`,
 * imported only from the admin page-builder feature.
 */
export type SectionSettingsFormType = Type<unknown>;

/** The real instance shape every settings-form component satisfies — used to cast at the single
 * point of consumption (`SectionSettingsPanelComponent`) after `ViewContainerRef.createComponent`. */
export type SectionSettingsFormInstance = { config: InputSignal<unknown>; configChange: OutputEmitterRef<unknown> };
