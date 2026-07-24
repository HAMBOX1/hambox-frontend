import Quill from 'quill';

export const CALLOUT_TYPES = ['info', 'warning', 'tip', 'note'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

// Quill doesn't export proper TS types for its blot base classes — `Quill.import()` is untyped by
// design (it's a runtime registry keyed by string), so these are deliberately `any`.
/* eslint-disable @typescript-eslint/no-explicit-any */
const BlockEmbed: any = Quill.import('blots/block/embed');
const Block: any = Quill.import('blots/block');

/** Horizontal divider. A void block, same family as Quill's own image/video embeds. */
class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';
}

/**
 * A single-paragraph callout (info/warning/tip/note), styled like Quill's built-in blockquote
 * format — one blot class for all four variants, distinguished by a `data-callout-type` attribute.
 */
class CalloutBlot extends Block {
  static blotName = 'callout';
  static tagName = 'div';
  static className = 'hbx-callout';

  static create(value: unknown): HTMLElement {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('data-callout-type', typeof value === 'string' ? value : 'info');
    return node;
  }

  static formats(node: HTMLElement): string {
    return node.getAttribute('data-callout-type') ?? 'info';
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let registered = false;

/** Registers the Hambox custom Quill formats and toolbar icons exactly once per page load. */
export function registerHamboxQuillFormats(): void {
  if (registered) {
    return;
  }
  registered = true;
  Quill.register(DividerBlot);
  Quill.register(CalloutBlot);

  // Reuse the app's existing PrimeIcons font for the custom toolbar buttons instead of authoring
  // bespoke SVGs — consistent with the design system's "use PrimeIcons" rule.
  const icons = Quill.import('ui/icons') as Record<string, unknown>;
  icons['divider'] = '<i class="pi pi-minus"></i>';
  icons['callout'] = {
    info: '<i class="pi pi-info-circle"></i>',
    warning: '<i class="pi pi-exclamation-triangle"></i>',
    tip: '<i class="pi pi-lightbulb"></i>',
    note: '<i class="pi pi-bookmark"></i>',
  };
  icons['emoji'] = '🙂';
}
