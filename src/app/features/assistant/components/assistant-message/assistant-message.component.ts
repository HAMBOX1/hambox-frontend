import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AssistantMessage } from '../../models/assistant.models';
import { renderMarkdown } from '../../utils/markdown.util';

@Component({
  selector: 'app-assistant-message',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './assistant-message.component.html',
  styleUrl: './assistant-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantMessageComponent {
  readonly message = input.required<AssistantMessage>();
  readonly userInitial = input('U');
  readonly toolsEnabled = input(true);

  readonly cardAction = output<string>();
  readonly regenerate = output<string>();
  readonly retryMessage = output<string>();
  readonly reportIssue = output<string>();
  readonly like = output<string>();
  readonly dislike = output<string>();
  readonly copied = output<string>();

  protected readonly keyRevealed = signal(false);
  protected readonly renderedHtml = computed(() => renderMarkdown(this.message().content));

  protected onCardAction(commandId: string): void {
    this.cardAction.emit(commandId);
  }

  protected onActionLabel(label: string): void {
    this.cardAction.emit(label);
  }

  protected onRegenerate(): void {
    this.regenerate.emit(this.message().id);
  }

  protected onRetry(): void {
    this.retryMessage.emit(this.message().id);
  }

  protected onReportIssue(): void {
    this.reportIssue.emit(this.message().id);
  }

  protected onLike(): void {
    this.like.emit(this.message().id);
  }

  protected onDislike(): void {
    this.dislike.emit(this.message().id);
  }

  protected toggleKeyReveal(): void {
    this.keyRevealed.update((value) => !value);
  }

  protected async copyText(text: string, toastKey: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.emit(toastKey);
    } catch {
      /* clipboard permission denied — non-critical affordance, ignore silently */
    }
  }
}
