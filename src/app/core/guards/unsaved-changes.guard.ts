import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  promptUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  const action = await component.promptUnsavedChanges();
  return action !== 'cancel';
};

export function injectUnsavedChangesGuard(): CanDeactivateFn<HasUnsavedChanges> {
  return unsavedChangesGuard;
}
