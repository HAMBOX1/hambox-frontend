import { effect, inject, Injectable, signal } from '@angular/core';

import { LandingPageSectionEntry } from '../models/page-builder.model';
import { PageBuilderFacade } from './page-builder.facade';

/**
 * Session-only, in-memory undo/redo over `PageBuilderFacade`'s six local-mutation methods.
 * Snapshot-based (not command/inverse-operation) — every mutation already funnels through one
 * signal (`draftSectionsState`), so storing before/after arrays is simpler than modeling inverses.
 * History is intentionally not persisted: it resets whenever the selected template id changes
 * (tracked internally via `effect()`), and callers must also call `reset()` after save/publish/
 * discard complete — those keep the same template id but replace the baseline server-side.
 */
@Injectable()
export class SectionCommandStackService {
  private readonly facade = inject(PageBuilderFacade);

  private undoStack: (readonly LandingPageSectionEntry[])[] = [];
  private redoStack: (readonly LandingPageSectionEntry[])[] = [];

  private readonly canUndoState = signal(false);
  private readonly canRedoState = signal(false);
  readonly canUndo = this.canUndoState.asReadonly();
  readonly canRedo = this.canRedoState.asReadonly();

  constructor() {
    effect(() => {
      this.facade.selectedTemplate()?.id;
      this.reset();
    });
  }

  addSection(category: string, variantKey: string): void {
    this.snapshot();
    this.facade.addSection(category, variantKey);
  }

  removeSection(instanceId: string): void {
    this.snapshot();
    this.facade.removeSection(instanceId);
  }

  duplicateSection(instanceId: string): void {
    this.snapshot();
    this.facade.duplicateSection(instanceId);
  }

  toggleVisibility(instanceId: string): void {
    this.snapshot();
    this.facade.toggleVisibility(instanceId);
  }

  reorderSections(previousIndex: number, currentIndex: number): void {
    this.snapshot();
    this.facade.reorderSections(previousIndex, currentIndex);
  }

  updateSectionConfig(instanceId: string, configJson: string): void {
    this.snapshot();
    this.facade.updateSectionConfig(instanceId, configJson);
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) {
      return;
    }

    this.redoStack.push(this.facade.draftSections());
    this.facade.restoreDraftSections(previous);
    this.syncSignals();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) {
      return;
    }

    this.undoStack.push(this.facade.draftSections());
    this.facade.restoreDraftSections(next);
    this.syncSignals();
  }

  /** Call after selecting a template and after save/publish/discard — those move the baseline. */
  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.syncSignals();
  }

  private snapshot(): void {
    this.undoStack.push(this.facade.draftSections());
    this.redoStack = [];
    this.syncSignals();
  }

  private syncSignals(): void {
    this.canUndoState.set(this.undoStack.length > 0);
    this.canRedoState.set(this.redoStack.length > 0);
  }
}
