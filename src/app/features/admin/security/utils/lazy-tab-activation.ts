import { effect, Signal } from '@angular/core';

/**
 * Runs `onActivate` the first time `active()` becomes true, then never again — the shared
 * "only fetch once this tab is actually opened" behavior every Security Center tab panel needs,
 * since PrimeNG's `p-tabs` keeps every panel's content mounted rather than destroying inactive
 * ones. Must be called from a component constructor (an injection context), same as `effect()`.
 */
export function activateOnceWhenTrue(active: Signal<boolean>, onActivate: () => void): void {
  let activated = false;
  effect(() => {
    if (active() && !activated) {
      activated = true;
      onActivate();
    }
  });
}
