import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { LibraryItemInstructionsApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable()
export class LibraryItemInstructionsFacade {
  private readonly api = inject(AccountApiService);

  private readonly instructionsState = signal<LibraryItemInstructionsApiDto | null>(null);
  private readonly loadingState = signal(false);
  /** True specifically on a 403 (not purchased, not completed, or not published) — distinct from a transient network/error state. */
  private readonly forbiddenState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly instructions = this.instructionsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly forbidden = this.forbiddenState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(orderItemId: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    this.forbiddenState.set(false);

    try {
      const result = await firstValueFrom(this.api.getLibraryItemInstructions(orderItemId));
      this.instructionsState.set(result);
    } catch (error) {
      this.instructionsState.set(null);
      if (error instanceof ApiError && error.status === 403) {
        this.forbiddenState.set(true);
      } else {
        this.errorState.set(this.toErrorMessage(error, 'Unable to load these instructions.'));
      }
    } finally {
      this.loadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
  }
}
