import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WHATSAPP_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { WhatsAppBotConfigurationDto } from '../models/whatsapp-bot-config.model';

@Injectable()
export class WhatsAppBotConfigFacade {
  private readonly api = inject(ApiClientService);

  private readonly configState = signal<WhatsAppBotConfigurationDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly config = this.configState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const data = await firstValueFrom(
        this.api.get<WhatsAppBotConfigurationDto>(WHATSAPP_API.config),
      );
      this.configState.set(data);
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to load the WhatsApp bot configuration.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async save(payload: WhatsAppBotConfigurationDto): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    try {
      const updated = await firstValueFrom(
        this.api.put<WhatsAppBotConfigurationDto>(WHATSAPP_API.config, payload),
      );
      this.configState.set(updated);
      return true;
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to save the WhatsApp bot configuration.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private resolveError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}
