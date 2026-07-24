import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { ProductInstructionsDto } from '../models/product-instructions.model';
import { ProductInstructionsApiService } from './product-instructions-api.service';

/**
 * Owns the admin editor's instructions state (load/autosave/publish/unpublish/image upload).
 * Kept separate from `ProductEditorFacade` — that facade already spans products, categories,
 * variants, batches, and codes, and Instructions doesn't need to share any of that state.
 */
@Injectable()
export class ProductInstructionsFacade {
  private readonly api = inject(ProductInstructionsApiService);

  private readonly instructionsState = signal<ProductInstructionsDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly publishingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly instructions = this.instructionsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly publishing = this.publishingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(productId: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(this.api.get(productId));
      this.instructionsState.set(result);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to load instructions.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async save(productId: string, title: string, contentHtml: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(this.api.save(productId, { title, contentHtml }));
      this.instructionsState.set(result);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to save instructions.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  async publish(productId: string): Promise<boolean> {
    this.publishingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(this.api.publish(productId));
      this.instructionsState.set(result);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to publish instructions.'));
      return false;
    } finally {
      this.publishingState.set(false);
    }
  }

  async unpublish(productId: string): Promise<boolean> {
    this.publishingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(this.api.unpublish(productId));
      this.instructionsState.set(result);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to unpublish instructions.'));
      return false;
    } finally {
      this.publishingState.set(false);
    }
  }

  async uploadImage(productId: string, file: File): Promise<string | null> {
    try {
      const result = await firstValueFrom(this.api.uploadImage(productId, file));
      return result.url;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to upload image.'));
      return null;
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
  }
}
