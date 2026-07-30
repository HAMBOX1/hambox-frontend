import { inject, Injectable, signal, computed } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { LandingPageSectionEntry, LandingPageTemplateDetail, LandingPageTemplateSummary } from '../models/page-builder.model';
import { PageBuilderApiService } from './page-builder-api.service';

@Injectable()
export class PageBuilderFacade {
  private readonly api = inject(PageBuilderApiService);

  private readonly templatesState = signal<readonly LandingPageTemplateSummary[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly selectedTemplateState = signal<LandingPageTemplateDetail | null>(null);
  private readonly selectedLoadingState = signal(false);

  private readonly activatingIdState = signal<string | null>(null);
  private readonly creatingState = signal(false);
  private readonly savingState = signal(false);
  private readonly publishingState = signal(false);
  private readonly deletingIdState = signal<string | null>(null);

  /** Working copy of the selected template's sections, mutated locally by every editor action. */
  private readonly draftSectionsState = signal<readonly LandingPageSectionEntry[]>([]);
  /** Snapshot of sections as last returned by the backend — the baseline `dirty` compares against. */
  private readonly savedSectionsState = signal<readonly LandingPageSectionEntry[]>([]);

  readonly templates = this.templatesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly selectedTemplate = this.selectedTemplateState.asReadonly();
  readonly selectedLoading = this.selectedLoadingState.asReadonly();

  readonly activatingId = this.activatingIdState.asReadonly();
  readonly creating = this.creatingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly publishing = this.publishingState.asReadonly();
  readonly deletingId = this.deletingIdState.asReadonly();

  readonly draftSections = this.draftSectionsState.asReadonly();

  /** True when local, unsaved edits diverge from the last saved/published sections. */
  readonly dirty = computed(
    () => JSON.stringify(this.draftSectionsState()) !== JSON.stringify(this.savedSectionsState()),
  );

  async loadTemplates(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const templates = await firstValueFrom(this.api.listTemplates());
      this.templatesState.set(templates ?? []);
    } catch (error) {
      this.templatesState.set([]);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load templates.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async selectTemplate(id: string): Promise<void> {
    this.selectedLoadingState.set(true);
    this.errorState.set(null);

    try {
      const detail = await firstValueFrom(this.api.getTemplate(id));
      this.applyDetail(detail);
    } catch (error) {
      this.selectedTemplateState.set(null);
      this.draftSectionsState.set([]);
      this.savedSectionsState.set([]);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load template details.'));
    } finally {
      this.selectedLoadingState.set(false);
    }
  }

  async createTemplate(name: string, cloneFromTemplateId?: string): Promise<string | null> {
    this.creatingState.set(true);
    this.errorState.set(null);

    try {
      const detail = await firstValueFrom(this.api.createTemplate(name, cloneFromTemplateId));
      await this.loadTemplates();
      this.applyDetail(detail);
      return detail.id;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to create template.'));
      return null;
    } finally {
      this.creatingState.set(false);
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    this.deletingIdState.set(id);
    this.errorState.set(null);

    try {
      await firstValueFrom(this.api.deleteTemplate(id));
      await this.loadTemplates();

      if (this.selectedTemplateState()?.id === id) {
        this.selectedTemplateState.set(null);
        this.draftSectionsState.set([]);
        this.savedSectionsState.set([]);
      }

      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to delete template.'));
      return false;
    } finally {
      this.deletingIdState.set(null);
    }
  }

  async activateTemplate(id: string): Promise<boolean> {
    this.activatingIdState.set(id);
    this.errorState.set(null);

    try {
      await firstValueFrom(this.api.activateTemplate(id));
      await this.loadTemplates();
      await this.selectTemplate(id);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to activate template.'));
      return false;
    } finally {
      this.activatingIdState.set(null);
    }
  }

  /** Saves the local draft sections to the backend (PUT .../draft). Does not publish. */
  async saveDraft(): Promise<boolean> {
    const template = this.selectedTemplateState();
    if (!template) {
      return false;
    }

    return this.saveDraftFor(template.id);
  }

  /**
   * Publishes the current draft. `PublishLandingPageTemplateCommandHandler` publishes whatever is
   * already stored server-side as `DraftSectionsJson` — it has no knowledge of unsaved local edits.
   * So if the local working copy has diverged (`dirty()`), we must save it first or publish would
   * ship a stale draft.
   */
  async publish(): Promise<boolean> {
    const template = this.selectedTemplateState();
    if (!template) {
      return false;
    }

    this.publishingState.set(true);
    this.errorState.set(null);

    try {
      if (this.dirty()) {
        const saved = await this.saveDraftFor(template.id, /* manageOwnLoadingState */ false);
        if (!saved) {
          return false;
        }
      }

      const detail = await firstValueFrom(this.api.publish(template.id));
      this.applyDetail(detail);
      await this.loadTemplates();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to publish template.'));
      return false;
    } finally {
      this.publishingState.set(false);
    }
  }

  /** Discards the server-side draft (if any) and reverts local edits back to the published sections. */
  async discardDraft(): Promise<boolean> {
    const template = this.selectedTemplateState();
    if (!template) {
      return false;
    }

    this.savingState.set(true);
    this.errorState.set(null);

    try {
      const detail = await firstValueFrom(this.api.discardDraft(template.id));
      this.applyDetail(detail);
      await this.loadTemplates();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to discard draft.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  addSection(category: string, variantKey: string): void {
    const sections = this.draftSectionsState();
    const entry: LandingPageSectionEntry = {
      instanceId: crypto.randomUUID(),
      category,
      variantKey,
      sortOrder: sections.length,
      isVisible: true,
      configJson: '{}',
    };
    this.draftSectionsState.set([...sections, entry]);
  }

  removeSection(instanceId: string): void {
    const remaining = this.draftSectionsState().filter((section) => section.instanceId !== instanceId);
    this.draftSectionsState.set(this.renumber(remaining));
  }

  duplicateSection(instanceId: string): void {
    const sections = this.draftSectionsState();
    const index = sections.findIndex((section) => section.instanceId === instanceId);
    if (index === -1) {
      return;
    }

    const clone: LandingPageSectionEntry = { ...sections[index], instanceId: crypto.randomUUID() };
    const next = [...sections.slice(0, index + 1), clone, ...sections.slice(index + 1)];
    this.draftSectionsState.set(this.renumber(next));
  }

  toggleVisibility(instanceId: string): void {
    this.draftSectionsState.set(
      this.draftSectionsState().map((section) =>
        section.instanceId === instanceId ? { ...section, isVisible: !section.isVisible } : section,
      ),
    );
  }

  reorderSections(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) {
      return;
    }

    const sections = [...this.draftSectionsState()];
    moveItemInArray(sections, previousIndex, currentIndex);
    this.draftSectionsState.set(this.renumber(sections));
  }

  updateSectionConfig(instanceId: string, configJson: string): void {
    this.draftSectionsState.set(
      this.draftSectionsState().map((section) =>
        section.instanceId === instanceId ? { ...section, configJson } : section,
      ),
    );
  }

  /**
   * Restores `draftSections` to an arbitrary snapshot (undo/redo). Deliberately does not touch
   * `savedSectionsState` — undoing back to the exact saved snapshot makes `dirty()` false again
   * for free via the existing JSON.stringify comparison.
   */
  restoreDraftSections(sections: readonly LandingPageSectionEntry[]): void {
    this.draftSectionsState.set(sections);
  }

  private async saveDraftFor(id: string, manageOwnLoadingState = true): Promise<boolean> {
    if (manageOwnLoadingState) {
      this.savingState.set(true);
      this.errorState.set(null);
    }

    try {
      const detail = await firstValueFrom(this.api.saveDraft(id, this.draftSectionsState()));
      this.applyDetail(detail);
      await this.loadTemplates();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to save draft.'));
      return false;
    } finally {
      if (manageOwnLoadingState) {
        this.savingState.set(false);
      }
    }
  }

  private applyDetail(detail: LandingPageTemplateDetail): void {
    const sorted = this.renumber([...detail.sections].sort((a, b) => a.sortOrder - b.sortOrder));
    this.selectedTemplateState.set(detail);
    this.draftSectionsState.set(sorted);
    this.savedSectionsState.set(sorted);
  }

  /** Keeps `sortOrder` equal to array index — the invariant every mutation method relies on. */
  private renumber(sections: readonly LandingPageSectionEntry[]): LandingPageSectionEntry[] {
    return sections.map((section, index) => (section.sortOrder === index ? section : { ...section, sortOrder: index }));
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      return error.message;
    }

    return fallback;
  }
}
